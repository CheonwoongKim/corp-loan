/**
 * Workflow Manager - Core system for managing the 8-stage loan application workflow
 * Phase 1: Basic workflow structure and state management
 */

class WorkflowManager {
    constructor() {
        this.currentLoan = null;
        this.workflows = new Map();
        this.stages = this.initializeStages();
        this.apiService = apiService; // Reference to global API service

        // Load existing workflows from localStorage for offline use
        this.loadWorkflows();

        // Check server connection on initialization
        this.checkServerConnection();
    }

    /**
     * Initialize the 8-stage workflow definition
     */
    initializeStages() {
        return [
            {
                id: 1,
                name: "신규대출등록",
                title: "파일 업로드",
                description: "대출 신청 문서 업로드 및 기본 정보 등록",
                status: "pending",
                progress: 0,
                estimatedTime: 300, // 5 minutes
                startTime: null,
                endTime: null,
                page: "register.html",
                icon: "📄",
                tasks: [
                    { name: "기본 정보 입력", completed: false },
                    { name: "문서 업로드", completed: false },
                    { name: "파일 검증", completed: false }
                ]
            },
            {
                id: 2,
                name: "문서파싱",
                title: "AI 문서 분석",
                description: "Azure Document Intelligence를 통한 텍스트 추출",
                status: "pending",
                progress: 0,
                estimatedTime: 600, // 10 minutes
                startTime: null,
                endTime: null,
                page: "parsing.html",
                icon: "🔍",
                tasks: [
                    { name: "문서 분류", completed: false },
                    { name: "텍스트 추출", completed: false },
                    { name: "구조 분석", completed: false },
                    { name: "신뢰도 계산", completed: false }
                ]
            },
            {
                id: 3,
                name: "후교정",
                title: "데이터 검증",
                description: "AI 추출 결과의 인간 검증 및 수정",
                status: "pending",
                progress: 0,
                estimatedTime: 900, // 15 minutes
                startTime: null,
                endTime: null,
                page: "verification.html",
                icon: "✏️",
                tasks: [
                    { name: "추출 데이터 검토", completed: false },
                    { name: "오류 수정", completed: false },
                    { name: "데이터 검증", completed: false }
                ]
            },
            {
                id: 4,
                name: "청킹임베딩",
                title: "벡터화 처리",
                description: "문서 청킹 및 벡터 임베딩 생성",
                status: "pending",
                progress: 0,
                estimatedTime: 300, // 5 minutes
                startTime: null,
                endTime: null,
                page: "chunking.html",
                icon: "🔗",
                tasks: [
                    { name: "문서 청킹", completed: false },
                    { name: "벡터 임베딩", completed: false },
                    { name: "벡터스토어 저장", completed: false }
                ]
            },
            {
                id: 5,
                name: "여신신청서생성",
                title: "AI 신청서 작성",
                description: "분석 결과 기반 여신 승인 신청서 자동 생성",
                status: "pending",
                progress: 0,
                estimatedTime: 600, // 10 minutes
                startTime: null,
                endTime: null,
                page: "loan-application-generation.html",
                icon: "📋",
                tasks: [
                    { name: "기본 정보 생성", completed: false },
                    { name: "재무 분석", completed: false },
                    { name: "위험 평가", completed: false },
                    { name: "신청서 완성", completed: false }
                ]
            },
            {
                id: 6,
                name: "RM검토",
                title: "RM 승인",
                description: "RM이 AI 생성 신청서 검토 및 편집",
                status: "pending",
                progress: 0,
                estimatedTime: 1200, // 20 minutes
                startTime: null,
                endTime: null,
                page: "rm-review.html",
                icon: "👤",
                tasks: [
                    { name: "신청서 검토", completed: false },
                    { name: "내용 수정", completed: false },
                    { name: "최종 승인", completed: false }
                ]
            },
            {
                id: 7,
                name: "심사의견서생성",
                title: "AI 분석 보고서",
                description: "심사역을 위한 AI 분석 의견서 생성",
                status: "pending",
                progress: 0,
                estimatedTime: 600, // 10 minutes
                startTime: null,
                endTime: null,
                page: "review-opinion-generation.html",
                icon: "📊",
                tasks: [
                    { name: "종합 리스크 분석", completed: false },
                    { name: "승인 권고사항 도출", completed: false },
                    { name: "심사포인트 정리", completed: false },
                    { name: "심사의견서 생성", completed: false }
                ]
            },
            {
                id: 8,
                name: "최종심사",
                title: "심사역 최종심사",
                description: "심사역이 최종 가부 결정 및 심사의견 작성",
                status: "pending",
                progress: 0,
                estimatedTime: 1800, // 30 minutes
                startTime: null,
                endTime: null,
                page: "final-review.html",
                icon: "⚖️",
                tasks: [
                    { name: "여신승인신청서 검토", completed: false },
                    { name: "AI 심사의견서 검토", completed: false },
                    { name: "최종 가부 결정", completed: false },
                    { name: "심사의견 작성", completed: false }
                ]
            }
        ];
    }

    /**
     * Check server connection
     */
    async checkServerConnection() {
        try {
            const health = await this.apiService.healthCheck();
            console.log('✅ 서버 연결 성공:', health);
            this.serverConnected = true;
            return true;
        } catch (error) {
            console.warn('⚠️ 서버 연결 실패, 오프라인 모드로 동작:', error.message);
            this.serverConnected = false;
            return false;
        }
    }

    /**
     * Create a new loan workflow (with API integration)
     */
    async createNewWorkflow(companyName, applicationType = "PF 대출", loanData = {}) {
        const loanId = this.generateLoanId();
        const workflow = {
            loanId: loanId,
            companyName: companyName || `회사명_${new Date().getTime()}`,
            applicationType: applicationType,
            currentStage: 1,
            status: "pending", // pending, processing, completed, failed
            stages: JSON.parse(JSON.stringify(this.stages)), // Deep copy
            uploadedDocuments: [],
            parsingResults: {},
            extractedData: null,
            chunkingResults: null,
            vectorStoreData: null,
            analysisResults: null,
            loanApplication: null,
            rmReviewData: null,
            reviewOpinion: null,
            finalDecision: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save to server if connected
        if (this.serverConnected) {
            try {
                const apiData = {
                    loan_id: loanId,
                    company_name: companyName,
                    application_type: applicationType,
                    current_stage: 1,
                    workflow_status: 'pending',
                    ...loanData
                };

                const serverResponse = await this.apiService.createLoan(apiData);
                console.log('✅ 서버에 대출 신청 저장:', serverResponse);

                // Update workflow with server response
                if (serverResponse.success) {
                    workflow.serverId = serverResponse.data.id;
                    workflow.serverSynced = true;
                }
            } catch (error) {
                console.error('❌ 서버 저장 실패:', error.message);
                workflow.serverSynced = false;
            }
        } else {
            workflow.serverSynced = false;
        }

        this.workflows.set(loanId, workflow);
        this.currentLoan = workflow;
        this.saveWorkflows();

        console.log(`새 워크플로우 생성: ${loanId} - ${companyName}`);
        return workflow;
    }

    /**
     * Generate unique loan ID
     */
    generateLoanId() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timestamp = Date.now().toString().slice(-4);

        return `CL-${year}${month}${day}-${timestamp}`;
    }

    /**
     * Get current workflow stage
     */
    getCurrentStage() {
        if (!this.currentLoan) return null;
        return this.currentLoan.stages.find(stage => stage.id === this.currentLoan.currentStage);
    }

    /**
     * Start a specific stage
     */
    startStage(stageId) {
        if (!this.currentLoan) return false;

        const stage = this.currentLoan.stages.find(s => s.id === stageId);
        if (!stage) return false;

        stage.status = "processing";
        stage.startTime = new Date().toISOString();
        stage.progress = 0;

        this.currentLoan.currentStage = stageId;
        this.currentLoan.status = "processing";
        this.currentLoan.updatedAt = new Date().toISOString();

        this.saveWorkflows();
        this.updateUI();

        console.log(`단계 시작: ${stageId} - ${stage.name}`);
        return true;
    }

    /**
     * Complete a specific stage
     */
    completeStage(stageId) {
        if (!this.currentLoan) return false;

        const stage = this.currentLoan.stages.find(s => s.id === stageId);
        if (!stage) return false;

        stage.status = "completed";
        stage.progress = 100;
        stage.endTime = new Date().toISOString();
        stage.tasks.forEach(task => task.completed = true);

        this.currentLoan.updatedAt = new Date().toISOString();

        // Auto-advance to next stage if not the last one
        if (stageId < 8) {
            this.currentLoan.currentStage = stageId + 1;
        } else {
            this.currentLoan.status = "completed";
        }

        this.saveWorkflows();
        this.updateUI();

        console.log(`단계 완료: ${stageId} - ${stage.name}`);
        return true;
    }

    /**
     * Update stage progress
     */
    updateStageProgress(stageId, progress, taskName = null) {
        if (!this.currentLoan) return false;

        const stage = this.currentLoan.stages.find(s => s.id === stageId);
        if (!stage) return false;

        stage.progress = Math.min(100, Math.max(0, progress));

        if (taskName) {
            const task = stage.tasks.find(t => t.name === taskName);
            if (task) {
                task.completed = true;
            }
        }

        this.currentLoan.updatedAt = new Date().toISOString();
        this.saveWorkflows();
        this.updateUI();

        return true;
    }

    /**
     * Navigate to specific stage page
     */
    goToStage(stageId) {
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) {
            console.error(`Stage ${stageId} not found`);
            return false;
        }

        // Start the stage if not started
        if (this.currentLoan) {
            this.startStage(stageId);
        }

        // Navigate to the page
        window.location.href = `pages/${stage.page}`;
        return true;
    }

    /**
     * Get workflow statistics
     */
    getStats() {
        const workflows = Array.from(this.workflows.values());

        return {
            total: workflows.length,
            processing: workflows.filter(w => w.status === "processing").length,
            completed: workflows.filter(w => w.status === "completed").length,
            failed: workflows.filter(w => w.status === "failed").length
        };
    }

    /**
     * Save workflows to localStorage
     */
    saveWorkflows() {
        const workflowData = {
            workflows: Array.from(this.workflows.entries()),
            currentLoanId: this.currentLoan?.loanId || null,
            lastUpdated: new Date().toISOString()
        };

        try {
            localStorage.setItem('corp-loan-workflows', JSON.stringify(workflowData));
        } catch (error) {
            console.error('Error saving workflows:', error);
        }
    }

    /**
     * Load workflows from localStorage
     */
    loadWorkflows() {
        try {
            const data = localStorage.getItem('corp-loan-workflows');
            if (data) {
                const workflowData = JSON.parse(data);
                this.workflows = new Map(workflowData.workflows);

                if (workflowData.currentLoanId) {
                    this.currentLoan = this.workflows.get(workflowData.currentLoanId);
                }

                console.log(`Loaded ${this.workflows.size} workflows from storage`);
            }
        } catch (error) {
            console.error('Error loading workflows:', error);
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update stats
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats(this.getStats());
        }

        // Update workflow steps
        if (typeof updateWorkflowSteps === 'function') {
            updateWorkflowSteps(this.stages, this.currentLoan);
        }

        // Trigger custom event for UI updates
        window.dispatchEvent(new CustomEvent('workflowUpdated', {
            detail: {
                currentLoan: this.currentLoan,
                stats: this.getStats()
            }
        }));
    }

    /**
     * Reset current workflow (for testing)
     */
    resetWorkflow() {
        this.currentLoan = null;
        this.saveWorkflows();
        this.updateUI();
    }

    /**
     * Upload documents with API integration
     */
    async uploadDocuments(files, documentTypes = []) {
        if (!this.currentLoan) {
            throw new Error('활성화된 대출 신청이 없습니다.');
        }

        const loanId = this.currentLoan.loanId;
        console.log(`📁 파일 업로드 시작: ${files.length}개 파일`);

        // Validate files
        const validFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!this.apiService.validateFileType(file)) {
                throw new Error(`지원하지 않는 파일 형식: ${file.name}`);
            }

            if (!this.apiService.validateFileSize(file)) {
                throw new Error(`파일 크기가 너무 큽니다: ${file.name} (최대 50MB)`);
            }

            validFiles.push(file);
        }

        // Upload to server if connected
        if (this.serverConnected) {
            try {
                const uploadResponse = await this.apiService.uploadDocuments(
                    this.currentLoan.serverId || loanId,
                    validFiles,
                    documentTypes
                );

                if (uploadResponse.success) {
                    // Update local workflow with uploaded document info
                    uploadResponse.data.forEach((doc, index) => {
                        const documentInfo = {
                            id: doc.document_id,
                            filename: doc.original_filename,
                            type: documentTypes[index] || 'other',
                            size: doc.file_size,
                            uploadedAt: new Date().toISOString(),
                            s3Key: doc.s3_key,
                            s3Url: doc.s3_url,
                            serverSynced: true
                        };

                        this.currentLoan.uploadedDocuments.push(documentInfo);
                    });

                    console.log('✅ 파일 업로드 완료:', uploadResponse.data.length + '개 파일');
                }

                this.saveWorkflows();
                this.updateUI();
                return uploadResponse;

            } catch (error) {
                console.error('❌ 파일 업로드 실패:', error.message);
                throw error;
            }
        } else {
            // Offline mode - save file info locally (without actual upload)
            validFiles.forEach((file, index) => {
                const documentInfo = {
                    id: `local_${Date.now()}_${index}`,
                    filename: file.name,
                    type: documentTypes[index] || 'other',
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    serverSynced: false,
                    localFile: file
                };

                this.currentLoan.uploadedDocuments.push(documentInfo);
            });

            this.saveWorkflows();
            this.updateUI();

            console.log('📱 오프라인 모드: 파일 정보 저장됨');
            return { success: true, offline: true, data: validFiles };
        }
    }

    /**
     * Get uploaded documents for current loan
     */
    getUploadedDocuments() {
        return this.currentLoan ? this.currentLoan.uploadedDocuments : [];
    }

    /**
     * Sync offline data to server
     */
    async syncToServer() {
        if (!this.serverConnected) {
            console.warn('서버에 연결되지 않아 동기화할 수 없습니다.');
            return false;
        }

        let syncCount = 0;

        for (const workflow of this.workflows.values()) {
            if (!workflow.serverSynced) {
                try {
                    // Create loan on server
                    const apiData = {
                        loan_id: workflow.loanId,
                        company_name: workflow.companyName,
                        application_type: workflow.applicationType,
                        current_stage: workflow.currentStage,
                        workflow_status: workflow.status
                    };

                    const serverResponse = await this.apiService.createLoan(apiData);
                    if (serverResponse.success) {
                        workflow.serverId = serverResponse.data.id;
                        workflow.serverSynced = true;
                        syncCount++;
                    }
                } catch (error) {
                    console.error(`동기화 실패: ${workflow.loanId}`, error.message);
                }
            }

            // Sync offline documents
            const offlineDocuments = workflow.uploadedDocuments.filter(doc => !doc.serverSynced && doc.localFile);
            if (offlineDocuments.length > 0) {
                try {
                    const files = offlineDocuments.map(doc => doc.localFile);
                    const types = offlineDocuments.map(doc => doc.type);

                    const uploadResponse = await this.apiService.uploadDocuments(workflow.serverId, files, types);
                    if (uploadResponse.success) {
                        // Update document info with server response
                        uploadResponse.data.forEach((serverDoc, index) => {
                            const localDoc = offlineDocuments[index];
                            localDoc.id = serverDoc.document_id;
                            localDoc.s3Key = serverDoc.s3_key;
                            localDoc.s3Url = serverDoc.s3_url;
                            localDoc.serverSynced = true;
                            delete localDoc.localFile; // Remove local file reference
                        });
                    }
                } catch (error) {
                    console.error(`문서 동기화 실패: ${workflow.loanId}`, error.message);
                }
            }
        }

        this.saveWorkflows();
        console.log(`✅ 동기화 완료: ${syncCount}개 워크플로우`);
        return syncCount > 0;
    }

    /**
     * Get all workflows
     */
    getAllWorkflows() {
        return Array.from(this.workflows.values());
    }
}

// Initialize global workflow manager
window.workflowManager = new WorkflowManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowManager;
}