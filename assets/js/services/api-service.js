/**
 * API Service - Backend Integration
 * Handles all communication with the Node.js API server
 */

class APIService {
    constructor() {
        this.baseURL = 'http://ywstorage.synology.me:4000/v1';
        this.timeout = 30000; // 30 seconds timeout
        this.authToken = localStorage.getItem('corp_loan_token'); // JWT token for authentication
    }

    /**
     * Make HTTP request with error handling
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            mode: 'cors',
            credentials: 'same-origin'
        };

        // Add authentication header if token exists
        if (this.authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const finalOptions = { ...defaultOptions, ...options };

        // Handle FormData (for file uploads)
        if (finalOptions.body instanceof FormData) {
            delete finalOptions.headers['Content-Type'];
        }

        try {
            console.log(`🌐 API Request: ${finalOptions.method || 'GET'} ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...finalOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || `HTTP Error: ${response.status}`);
            }

            console.log(`✅ API Response: ${response.status}`, data);
            return data;

        } catch (error) {
            console.error('❌ API Error:', error);

            if (error.name === 'AbortError') {
                throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
            }

            throw error;
        }
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            localStorage.setItem('corp_loan_token', token);
        } else {
            localStorage.removeItem('corp_loan_token');
        }
    }

    /**
     * Get authentication token from storage
     */
    getAuthToken() {
        if (!this.authToken) {
            this.authToken = localStorage.getItem('corp_loan_token');
        }
        return this.authToken;
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.token) {
                this.setAuthToken(response.token);
            }

            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Signup user
     */
    async signup(userData) {
        try {
            const response = await this.makeRequest('/auth/signup', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.token) {
                this.setAuthToken(response.token);
            }

            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Logout user
     */
    logout() {
        this.setAuthToken(null);
        return { success: true };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getAuthToken();
        if (!token) return false;

        try {
            // Simple JWT expiry check (you can make this more robust)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch (error) {
            return false;
        }
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        try {
            const response = await this.makeRequest('/db/healthz');
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: { status: 'error' }
            };
        }
    }

    /**
     * Get all loan applications
     */
    async getAllLoans(filters = {}) {
        const queryParams = new URLSearchParams();

        if (filters.page) queryParams.append('page', filters.page);
        if (filters.pageSize) queryParams.append('pageSize', filters.pageSize);
        if (filters.q) queryParams.append('q', filters.q);

        const endpoint = `/loans${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        return this.makeRequest(endpoint);
    }

    /**
     * Get specific loan application
     */
    async getLoan(loanId) {
        return this.makeRequest(`/loans/${loanId}`);
    }

    /**
     * Create new loan application
     */
    async createLoan(loanData) {
        const response = await this.makeRequest('/loans', {
            method: 'POST',
            body: JSON.stringify(loanData)
        });

        // Convert new API response format to expected format
        if (response.ok && response.id) {
            return {
                success: true,
                data: {
                    loanId: response.id,
                    id: response.id
                },
                ...response
            };
        }

        return response;
    }

    /**
     * Update loan application
     */
    async updateLoan(loanId, loanData) {
        return this.makeRequest(`/loans/${loanId}`, {
            method: 'PUT',
            body: JSON.stringify(loanData)
        });
    }

    /**
     * Delete loan application
     */
    async deleteLoan(loanId) {
        return this.makeRequest(`/loans/${loanId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Upload documents for a loan using storage API
     */
    async uploadDocuments(loanId, files, documentTypes = []) {
        const bucket = 'loan-agent-files';
        const results = [];

        const fileArray = Array.isArray(files) ? files : [files];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const documentType = documentTypes[i] || 'other';
            const key = `${loanId}/${file.name}`;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const result = await this.makeRequest(`/storage/${bucket}/upload?key=${encodeURIComponent(key)}`, {
                    method: 'POST',
                    body: formData
                });

                results.push({
                    filename: file.name,
                    key: key,
                    type: documentType,
                    size: file.size,
                    status: 'completed',
                    ...result
                });
            } catch (error) {
                results.push({
                    filename: file.name,
                    key: key,
                    type: documentType,
                    size: file.size,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return {
            success: true,
            data: {
                loanId: loanId,
                uploadedFiles: results.filter(r => r.status === 'completed'),
                failedFiles: results.filter(r => r.status === 'failed'),
                message: `${results.filter(r => r.status === 'completed').length}개 파일이 업로드되었습니다.`
            }
        };
    }

    /**
     * Get workflow status for a loan
     */
    async getWorkflowStatus(loanId) {
        return this.makeRequest(`/loans/${loanId}/workflow`);
    }

    /**
     * Advance workflow to next stage
     */
    async advanceWorkflow(loanId, stageData = {}) {
        return this.makeRequest(`/loans/${loanId}/workflow/advance`, {
            method: 'POST',
            body: JSON.stringify(stageData)
        });
    }

    /**
     * Get documents for a loan from storage
     */
    async getLoanDocuments(loanId) {
        const bucket = 'loan-agent-files';
        const prefix = `${loanId}/`;

        return this.makeRequest(`/storage/${bucket}/objects?prefix=${encodeURIComponent(prefix)}`);
    }

    /**
     * Get document preview/download URL
     */
    async getDocumentUrl(loanId, documentKey, mode = 'preview') {
        const bucket = 'loan-agent-files';
        const key = documentKey.startsWith(loanId) ? documentKey : `${loanId}/${documentKey}`;

        if (mode === 'download') {
            return this.makeRequest(`/storage/${bucket}/download?key=${encodeURIComponent(key)}`);
        } else {
            return this.makeRequest(`/storage/${bucket}/preview?key=${encodeURIComponent(key)}&mode=url`);
        }
    }

    /**
     * Generate loan ID
     */
    generateLoanId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

        return `CL-${year}${month}${day}-${random}`;
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate file type
     */
    validateFileType(file) {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    }

    /**
     * Validate file size (50MB limit)
     */
    validateFileSize(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        return file.size <= maxSize;
    }

    /**
     * Get document type display name
     */
    getDocumentTypeName(type) {
        const typeNames = {
            'business_registration': '사업자등록증',
            'corporate_registration': '법인등기부등본',
            'financial_statement': '재무제표',
            'credit_report': '신용보고서',
            'collateral_appraisal': '담보평가서',
            'business_plan': '사업계획서',
            'other': '기타 문서'
        };

        return typeNames[type] || type;
    }

    /**
     * Get workflow stage display name
     */
    getStageDisplayName(stageId) {
        const stageNames = {
            1: '신규대출등록',
            2: '문서파싱',
            3: '후교정',
            4: '청킹임베딩',
            5: '여신승인신청서생성',
            6: 'RM검토',
            7: '심사의견서생성',
            8: '최종심사'
        };

        return stageNames[stageId] || `단계 ${stageId}`;
    }

    /**
     * Get workflow status color
     */
    getStatusColor(status) {
        const colors = {
            'pending': 'text-gray-600',
            'processing': 'text-blue-600',
            'completed': 'text-green-600',
            'failed': 'text-red-600'
        };

        return colors[status] || 'text-gray-600';
    }
}

// Create singleton instance
const apiService = new APIService();

// Global error handler for API
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled API rejection:', event.reason);

    // Show user-friendly error message
    if (event.reason.message && event.reason.message.includes('Failed to fetch')) {
        console.error('🔌 서버 연결 실패: API 서버가 실행 중인지 확인해주세요.');
        // You can add UI notification here
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}