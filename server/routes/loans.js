/**
 * Loan Applications API Routes
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const Joi = require('joi');
const { executeQuery, executeTransaction } = require('../config/database');
const { uploadFile, generateS3Key, getPresignedUrl } = require('../config/s3');

const router = express.Router();

// Multer configuration for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 10 // Maximum 10 files per request
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다.'), false);
        }
    }
});

// Validation schemas
const loanApplicationSchema = Joi.object({
    // Company Information
    companyName: Joi.string().required().min(2).max(200),
    businessRegistrationNumber: Joi.alternatives().try(
        Joi.string().pattern(/^[0-9]{3}-[0-9]{2}-[0-9]{5}$/),
        Joi.string().allow('', null)
    ).optional(),
    companyAddress: Joi.string().optional().allow('').max(500),
    companyPhone: Joi.string().optional().allow('').max(50),
    companyEstablishedYear: Joi.number().optional().allow(null).min(1900).max(new Date().getFullYear()),
    companyBusinessType: Joi.string().optional().allow('').max(200),
    companyAnnualRevenue: Joi.number().optional().allow(null).min(0),
    companyEmployeeCount: Joi.number().optional().allow(null).min(0),

    // Loan Information
    applicationType: Joi.string().valid('PF 대출', '시설자금 대출', '운영자금 대출', '기타').default('PF 대출'),
    requestedAmount: Joi.number().required().min(0),
    loanDurationMonths: Joi.number().optional().allow(null).min(1).max(360),
    interestRateHope: Joi.number().optional().allow(null).min(0).max(100),
    collateralType: Joi.string().optional().allow('').max(200),
    collateralValue: Joi.number().optional().allow(null).min(0),
    loanPurpose: Joi.string().required().max(1000),

    // Applicant Information
    applicantName: Joi.string().required().max(100),
    applicantPosition: Joi.string().optional().allow('').max(100),
    applicantBirthDate: Joi.date().optional().allow(null, ''),
    applicantContact: Joi.string().required().max(50),
    applicantEmail: Joi.string().optional().allow('', null).email().allow('')
});

/**
 * Generate unique loan ID
 */
function generateLoanId() {
    const date = moment().format('YYYYMMDD');
    const timestamp = Date.now().toString().slice(-4);
    return `CL-${date}-${timestamp}`;
}

/**
 * Initialize workflow stages for new loan
 */
async function initializeWorkflowStages(loanId) {
    const stages = [
        { id: 1, name: '신규대출등록', title: '파일 업로드', estimatedTime: 300 },
        { id: 2, name: '문서파싱', title: 'AI 문서 분석', estimatedTime: 600 },
        { id: 3, name: '후교정', title: '데이터 검증', estimatedTime: 900 },
        { id: 4, name: '청킹임베딩', title: '벡터화 처리', estimatedTime: 300 },
        { id: 5, name: '여신신청서생성', title: 'AI 신청서 작성', estimatedTime: 600 },
        { id: 6, name: 'RM검토', title: 'RM 승인', estimatedTime: 1200 },
        { id: 7, name: '심사의견서생성', title: 'AI 분석 보고서', estimatedTime: 600 },
        { id: 8, name: '최종심사', title: '심사역 최종심사', estimatedTime: 1800 }
    ];

    const queries = stages.map(stage => ({
        sql: `INSERT INTO workflow_stages (loan_id, stage_id, stage_name, stage_title, stage_description, estimated_time)
              VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
            loanId,
            stage.id,
            stage.name,
            stage.title,
            `${stage.title} 단계`,
            stage.estimatedTime
        ]
    }));

    return await executeTransaction(queries);
}

/**
 * GET /api/loans - Get all loan applications
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, stage } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [];

        if (status) {
            whereClause += ' WHERE workflow_status = ?';
            params.push(status);
        }

        if (stage) {
            whereClause += status ? ' AND current_stage = ?' : ' WHERE current_stage = ?';
            params.push(stage);
        }

        const countQuery = `SELECT COUNT(*) as total FROM loan_applications${whereClause}`;
        const dataQuery = `
            SELECT
                la.*,
                (SELECT COUNT(*) FROM uploaded_documents WHERE loan_id = la.loan_id) as document_count,
                (SELECT COUNT(*) FROM workflow_stages WHERE loan_id = la.loan_id AND status = 'completed') as completed_stages
            FROM loan_applications la
            ${whereClause}
            ORDER BY la.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const countResult = await executeQuery(countQuery, params);
        const dataResult = await executeQuery(dataQuery, params);

        if (!countResult.success || !dataResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Database query failed'
            });
        }

        res.json({
            success: true,
            data: {
                loans: dataResult.data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.data[0].total,
                    totalPages: Math.ceil(countResult.data[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get loans error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/loans/stats - Get loan statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const queries = [
            'SELECT COUNT(*) as total FROM loan_applications',
            'SELECT workflow_status, COUNT(*) as count FROM loan_applications GROUP BY workflow_status',
            'SELECT current_stage, COUNT(*) as count FROM loan_applications GROUP BY current_stage'
        ];

        const results = {};
        for (const query of queries) {
            const result = await executeQuery(query);
            if (result.success) {
                const key = query.includes('workflow_status') ? 'byStatus' :
                           query.includes('current_stage') ? 'byStage' : 'total';
                results[key] = result.data;
            }
        }

        const stats = {
            total: results.total[0]?.total || 0,
            processing: results.byStatus?.find(s => s.workflow_status === 'processing')?.count || 0,
            completed: results.byStatus?.find(s => s.workflow_status === 'completed')?.count || 0,
            failed: results.byStatus?.find(s => s.workflow_status === 'failed')?.count || 0,
            byStage: results.byStage || []
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/loans/:loanId - Get specific loan application
 */
router.get('/:loanId', async (req, res) => {
    try {
        const { loanId } = req.params;

        const loanQuery = `
            SELECT la.*,
                   (SELECT COUNT(*) FROM uploaded_documents WHERE loan_id = la.loan_id) as document_count,
                   (SELECT COUNT(*) FROM workflow_stages WHERE loan_id = la.loan_id AND status = 'completed') as completed_stages
            FROM loan_applications la
            WHERE la.loan_id = ?
        `;

        const stagesQuery = `
            SELECT * FROM workflow_stages
            WHERE loan_id = ?
            ORDER BY stage_id
        `;

        const documentsQuery = `
            SELECT * FROM uploaded_documents
            WHERE loan_id = ?
            ORDER BY created_at DESC
        `;

        const [loanResult, stagesResult, documentsResult] = await Promise.all([
            executeQuery(loanQuery, [loanId]),
            executeQuery(stagesQuery, [loanId]),
            executeQuery(documentsQuery, [loanId])
        ]);

        if (!loanResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Database query failed'
            });
        }

        if (loanResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan application not found'
            });
        }

        res.json({
            success: true,
            data: {
                loan: loanResult.data[0],
                stages: stagesResult.success ? stagesResult.data : [],
                documents: documentsResult.success ? documentsResult.data : []
            }
        });
    } catch (error) {
        console.error('Get loan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/loans - Create new loan application
 */
router.post('/', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = loanApplicationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const loanId = generateLoanId();
        const loanData = {
            ...value,
            loan_id: loanId,
            current_stage: 1,
            workflow_status: 'pending',
            created_by: 'web-user'
        };

        // Insert loan application
        const insertQuery = `
            INSERT INTO loan_applications (
                loan_id, company_name, business_registration_number, company_address, company_phone,
                company_established_year, company_business_type, company_annual_revenue, company_employee_count,
                application_type, requested_amount, loan_duration_months, interest_rate_hope,
                collateral_type, collateral_value, loan_purpose,
                applicant_name, applicant_position, applicant_birth_date, applicant_contact, applicant_email,
                current_stage, workflow_status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Ensure all parameters are properly sanitized (undefined -> null)
        const safeValue = (value) => value !== undefined ? value : null;

        const insertParams = [
            safeValue(loanData.loan_id),
            safeValue(loanData.companyName),
            safeValue(loanData.businessRegistrationNumber),
            safeValue(loanData.companyAddress),
            safeValue(loanData.companyPhone),
            safeValue(loanData.companyEstablishedYear),
            safeValue(loanData.companyBusinessType),
            safeValue(loanData.companyAnnualRevenue),
            safeValue(loanData.companyEmployeeCount),
            safeValue(loanData.applicationType) || 'PF 대출',
            safeValue(loanData.requestedAmount),
            safeValue(loanData.loanDurationMonths),
            safeValue(loanData.interestRateHope),
            safeValue(loanData.collateralType),
            safeValue(loanData.collateralValue),
            safeValue(loanData.loanPurpose),
            safeValue(loanData.applicantName),
            safeValue(loanData.applicantPosition),
            safeValue(loanData.applicantBirthDate),
            safeValue(loanData.applicantContact),
            safeValue(loanData.applicantEmail),
            safeValue(loanData.current_stage) || 1,
            safeValue(loanData.workflow_status) || 'pending',
            safeValue(loanData.created_by) || 'system'
        ];

        const insertResult = await executeQuery(insertQuery, insertParams);

        if (!insertResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create loan application'
            });
        }

        // Initialize workflow stages
        const stagesResult = await initializeWorkflowStages(loanId);
        if (!stagesResult.success) {
            console.error('Failed to initialize workflow stages:', stagesResult.error);
        }

        // Log user action
        const logQuery = `
            INSERT INTO user_actions (
                loan_id, user_id, user_role, action_type, action_description,
                after_data, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const logParams = [
            loanId,
            'web-user',
            'applicant',
            'create',
            '신규 대출 신청 생성',
            JSON.stringify(loanData),
            req.ip
        ];

        await executeQuery(logQuery, logParams);

        res.status(201).json({
            success: true,
            data: {
                loanId: loanId,
                message: '대출 신청이 성공적으로 생성되었습니다.'
            }
        });
    } catch (error) {
        console.error('Create loan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/loans/:loanId/documents - Upload documents for loan
 */
router.post('/:loanId/documents', upload.array('documents', 10), async (req, res) => {
    try {
        const { loanId } = req.params;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: '업로드할 파일이 없습니다.'
            });
        }

        // Check if loan exists
        const loanCheck = await executeQuery(
            'SELECT loan_id FROM loan_applications WHERE loan_id = ?',
            [loanId]
        );

        if (!loanCheck.success || loanCheck.data.length === 0) {
            return res.status(404).json({
                success: false,
                error: '대출 신청을 찾을 수 없습니다.'
            });
        }

        const uploadResults = [];

        for (const file of files) {
            try {
                // Determine document type based on filename or metadata
                const documentType = req.body.documentType || 'other';

                // Generate S3 key
                const s3Key = generateS3Key(loanId, documentType, file.originalname);

                // Upload to S3
                const uploadResult = await uploadFile(file.buffer, s3Key, file.mimetype);

                if (!uploadResult.success) {
                    console.error('S3 upload failed:', uploadResult.error);
                    continue;
                }

                // Save document info to database
                const documentQuery = `
                    INSERT INTO uploaded_documents (
                        loan_id, original_filename, file_extension, file_size, mime_type,
                        s3_bucket, s3_key, s3_url, document_type, upload_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const extension = file.originalname.split('.').pop();
                const documentParams = [
                    loanId,
                    file.originalname,
                    extension,
                    file.size,
                    file.mimetype,
                    uploadResult.data.bucket,
                    uploadResult.data.key,
                    uploadResult.data.url,
                    documentType,
                    'completed'
                ];

                const documentResult = await executeQuery(documentQuery, documentParams);

                if (documentResult.success) {
                    uploadResults.push({
                        filename: file.originalname,
                        s3Key: uploadResult.data.key,
                        url: uploadResult.data.url,
                        size: file.size,
                        type: documentType,
                        status: 'completed'
                    });
                }
            } catch (fileError) {
                console.error('File upload error:', fileError);
                uploadResults.push({
                    filename: file.originalname,
                    status: 'failed',
                    error: fileError.message
                });
            }
        }

        // Update loan status if this is the first file upload
        const updateQuery = `
            UPDATE loan_applications
            SET workflow_status = 'processing', updated_at = CURRENT_TIMESTAMP
            WHERE loan_id = ? AND workflow_status = 'pending'
        `;
        await executeQuery(updateQuery, [loanId]);

        res.json({
            success: true,
            data: {
                loanId: loanId,
                uploadedFiles: uploadResults,
                message: `${uploadResults.length}개 파일이 업로드되었습니다.`
            }
        });
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/loans/:loanId/stage - Update workflow stage
 */
router.put('/:loanId/stage', async (req, res) => {
    try {
        const { loanId } = req.params;
        const { stageId, status, progress } = req.body;

        // Validate input
        if (!stageId || ![1,2,3,4,5,6,7,8].includes(stageId)) {
            return res.status(400).json({
                success: false,
                error: '유효하지 않은 단계 ID입니다.'
            });
        }

        const updateQueries = [];

        // Update workflow stage
        if (status) {
            updateQueries.push({
                sql: `UPDATE workflow_stages
                      SET status = ?, progress = COALESCE(?, progress),
                          ${status === 'processing' ? 'started_at = CURRENT_TIMESTAMP,' : ''}
                          ${status === 'completed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
                          updated_at = CURRENT_TIMESTAMP
                      WHERE loan_id = ? AND stage_id = ?`,
                params: [status, progress, loanId, stageId]
            });
        }

        // Update loan current stage
        updateQueries.push({
            sql: `UPDATE loan_applications
                  SET current_stage = ?,
                      workflow_status = CASE
                          WHEN ? = 8 AND ? = 'completed' THEN 'completed'
                          ELSE 'processing'
                      END,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE loan_id = ?`,
            params: [stageId, stageId, status, loanId]
        });

        const result = await executeTransaction(updateQueries);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update workflow stage'
            });
        }

        res.json({
            success: true,
            data: {
                loanId: loanId,
                stageId: stageId,
                status: status,
                progress: progress,
                message: '워크플로우 단계가 업데이트되었습니다.'
            }
        });
    } catch (error) {
        console.error('Update stage error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/loans/:loanId/documents - Get all documents for a loan
 */
router.get('/:loanId/documents', async (req, res) => {
    try {
        const { loanId } = req.params;

        // Get documents for the loan
        const documentsQuery = `
            SELECT
                id as document_id,
                original_filename,
                file_extension,
                file_size,
                mime_type,
                s3_bucket,
                s3_key,
                s3_url,
                document_type,
                document_category,
                upload_status,
                created_at as uploaded_at,
                processing_status,
                metadata
            FROM uploaded_documents
            WHERE loan_id = ?
            ORDER BY created_at DESC
        `;

        const documentsResult = await executeQuery(documentsQuery, [loanId]);

        if (!documentsResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to retrieve documents'
            });
        }

        res.json({
            success: true,
            data: documentsResult.data.map(doc => ({
                document_id: doc.document_id,
                original_filename: doc.original_filename,
                file_extension: doc.file_extension,
                file_size: doc.file_size,
                mime_type: doc.mime_type,
                document_type: doc.document_type,
                upload_status: doc.upload_status,
                uploaded_at: doc.uploaded_at,
                processing_status: doc.processing_status,
                s3_key: doc.s3_key,
                s3_url: doc.s3_url
            }))
        });

    } catch (error) {
        console.error('Documents retrieval error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/loans/:loanId/documents/:documentId/download - Get presigned URL for document download
 */
router.get('/:loanId/documents/:documentId/download', async (req, res) => {
    try {
        const { loanId, documentId } = req.params;

        const documentQuery = `
            SELECT s3_key, original_filename
            FROM uploaded_documents
            WHERE id = ? AND loan_id = ?
        `;

        const documentResult = await executeQuery(documentQuery, [documentId, loanId]);

        if (!documentResult.success || documentResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                error: '문서를 찾을 수 없습니다.'
            });
        }

        const document = documentResult.data[0];
        const urlResult = await getPresignedUrl(document.s3_key, 3600); // 1 hour

        if (!urlResult.success) {
            return res.status(500).json({
                success: false,
                error: '다운로드 URL 생성에 실패했습니다.'
            });
        }

        res.json({
            success: true,
            data: {
                downloadUrl: urlResult.url,
                filename: document.original_filename,
                expiresIn: 3600
            }
        });
    } catch (error) {
        console.error('Document download error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/loans/:loanId/workflow - Get workflow status for a loan
 */
router.get('/:loanId/workflow', async (req, res) => {
    try {
        const { loanId } = req.params;

        // Get loan basic info
        const loanQuery = `
            SELECT
                loan_id,
                company_name,
                current_stage,
                workflow_status
            FROM loan_applications
            WHERE loan_id = ?
        `;

        // Get all workflow stages
        const stagesQuery = `
            SELECT * FROM workflow_stages
            WHERE loan_id = ?
            ORDER BY stage_id
        `;

        const [loanResult, stagesResult] = await Promise.all([
            executeQuery(loanQuery, [loanId]),
            executeQuery(stagesQuery, [loanId])
        ]);

        if (!loanResult.success || loanResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                error: '대출 신청을 찾을 수 없습니다.'
            });
        }

        if (!stagesResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to retrieve workflow stages'
            });
        }

        const loan = loanResult.data[0];
        const stages = stagesResult.data;

        // Calculate overall progress
        const completedStages = stages.filter(stage => stage.status === 'completed').length;
        const totalStages = stages.length;
        const overallProgress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

        res.json({
            success: true,
            data: {
                loanId: loan.loan_id,
                companyName: loan.company_name,
                currentStage: loan.current_stage,
                workflowStatus: loan.workflow_status,
                overallProgress: Math.round(overallProgress),
                completedStages,
                totalStages,
                stages: stages.map(stage => ({
                    stageId: stage.stage_id,
                    stageName: stage.stage_name,
                    stageTitle: stage.stage_title,
                    status: stage.status,
                    progress: stage.progress || 0,
                    estimatedTime: stage.estimated_time,
                    startedAt: stage.started_at,
                    completedAt: stage.completed_at,
                    stageData: stage.stage_data ? JSON.parse(stage.stage_data) : null
                }))
            }
        });

    } catch (error) {
        console.error('Workflow status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/loans/:loanId/workflow/advance - Advance workflow to next stage
 */
router.post('/:loanId/workflow/advance', async (req, res) => {
    try {
        const { loanId } = req.params;
        const { stageData } = req.body;

        // Get current loan stage
        const loanQuery = `
            SELECT current_stage, workflow_status
            FROM loan_applications
            WHERE loan_id = ?
        `;

        const loanResult = await executeQuery(loanQuery, [loanId]);

        if (!loanResult.success || loanResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                error: '대출 신청을 찾을 수 없습니다.'
            });
        }

        const loan = loanResult.data[0];
        const currentStage = loan.current_stage;
        const nextStage = currentStage + 1;

        // Check if we can advance (not already at final stage)
        if (currentStage >= 8) {
            return res.status(400).json({
                success: false,
                error: '이미 최종 단계입니다.'
            });
        }

        // Update current stage to completed
        const completeCurrentStageQuery = `
            UPDATE workflow_stages
            SET status = 'completed', progress = 100, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE loan_id = ? AND stage_id = ?
        `;

        // Update loan application current stage
        const updateLoanQuery = `
            UPDATE loan_applications
            SET current_stage = ?, workflow_status = 'processing', updated_at = CURRENT_TIMESTAMP
            WHERE loan_id = ?
        `;

        // Start next stage
        const startNextStageQuery = `
            UPDATE workflow_stages
            SET status = 'processing', progress = 0, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE loan_id = ? AND stage_id = ?
        `;

        // Execute all updates in transaction-like manner
        const [completeResult, updateResult, startResult] = await Promise.all([
            executeQuery(completeCurrentStageQuery, [loanId, currentStage]),
            executeQuery(updateLoanQuery, [nextStage, loanId]),
            executeQuery(startNextStageQuery, [loanId, nextStage])
        ]);

        if (!completeResult.success || !updateResult.success || !startResult.success) {
            return res.status(500).json({
                success: false,
                error: '워크플로우 단계 진행에 실패했습니다.'
            });
        }

        res.json({
            success: true,
            data: {
                loanId: loanId,
                previousStage: currentStage,
                currentStage: nextStage,
                status: 'processing',
                message: `단계 ${nextStage}로 진행되었습니다.`,
                stageData: stageData || null
            }
        });

    } catch (error) {
        console.error('Workflow advance error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * DELETE /api/loans/:loanId - Delete a loan application
 */
router.delete('/:loanId', async (req, res) => {
    try {
        const { loanId } = req.params;

        // Delete in order: documents -> stages -> loan (due to foreign key constraints)

        // Delete uploaded documents
        await executeQuery('DELETE FROM uploaded_documents WHERE loan_id = ?', [loanId]);

        // Delete workflow stages
        await executeQuery('DELETE FROM workflow_stages WHERE loan_id = ?', [loanId]);

        // Delete loan application
        const result = await executeQuery('DELETE FROM loan_applications WHERE loan_id = ?', [loanId]);

        if (result.data.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: '대출 신청을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            message: '대출 신청이 삭제되었습니다.',
            data: {
                loanId: loanId
            }
        });

    } catch (error) {
        console.error('Delete loan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;