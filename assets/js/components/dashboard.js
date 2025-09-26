/**
 * Dashboard JavaScript - Main page functionality
 * Phase 1: Basic dashboard with workflow visualization
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
});

/**
 * Initialize dashboard components
 */
async function initializeDashboard() {
    // Auto login for testing (remove in production)
    if (!apiService.isAuthenticated()) {
        console.log('🔐 Auto-logging in for testing...');
        const loginResult = await apiService.login('test@corp-loan.com', 'test123!');
        if (loginResult.success) {
            console.log('✅ Auto login successful');
        } else {
            console.error('❌ Auto login failed:', loginResult.error);
        }
    }

    await updateDashboardStatsFromAPI();
    updateRecentApplications();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // New loan button
    const newLoanBtn = document.getElementById('newLoanBtn');
    if (newLoanBtn) {
        newLoanBtn.addEventListener('click', startNewLoan);
    }

    // Listen for workflow updates
    window.addEventListener('workflowUpdated', function(event) {
        updateDashboardStatsFromAPI();
        updateRecentApplications();
    });

}

/**
 * Update dashboard statistics from API
 */
async function updateDashboardStatsFromAPI() {
    try {
        console.log('📊 대시보드 통계 업데이트 중...');
        const response = await apiService.getAllLoans();

        console.log('🔍 API 응답:', response);

        // Handle different response formats
        let loans = [];

        if (response && response.items) {
            // Direct API response format
            loans = response.items;
        } else if (response && response.data && response.data.loans) {
            // Expected format
            loans = response.data.loans;
        } else if (response && Array.isArray(response)) {
            // Array format
            loans = response;
        }

        if (loans.length > 0) {
            const stats = {
                total: loans.length,
                processing: loans.filter(loan =>
                    loan.workflow_status === 'processing' ||
                    loan.status === 'processing' ||
                    loan.status === '접수' ||
                    loan.status === 'embedded'
                ).length,
                completed: loans.filter(loan =>
                    loan.workflow_status === 'completed' ||
                    loan.status === 'completed' ||
                    loan.status === '완료'
                ).length,
                failed: loans.filter(loan =>
                    loan.workflow_status === 'failed' ||
                    loan.status === 'failed' ||
                    loan.status === '실패'
                ).length
            };

            console.log('✅ 통계 데이터:', stats);
            updateDashboardStats(stats);
            updateRecentApplicationsFromData(loans);
        } else {
            console.log('❌ 대출 데이터 없음, 기본값 사용');
            // Use default empty stats if no data
            const defaultStats = { total: 0, processing: 0, completed: 0, failed: 0 };
            updateDashboardStats(defaultStats);
        }
    } catch (error) {
        console.error('❌ 대시보드 통계 업데이트 실패:', error);
        // Use default empty stats on error
        const defaultStats = { total: 0, processing: 0, completed: 0, failed: 0 };
        updateDashboardStats(defaultStats);
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats(stats) {
    const statElements = document.querySelectorAll('.stats-card p:last-child');

    if (statElements.length >= 4) {
        statElements[0].textContent = stats.total;
        statElements[1].textContent = stats.processing;
        statElements[2].textContent = stats.completed;
        statElements[3].textContent = stats.failed;
    }

    // Also update individual stat cards by finding them
    updateStatCard(0, stats.total);
    updateStatCard(1, stats.processing);
    updateStatCard(2, stats.completed);
    updateStatCard(3, stats.failed);
}

/**
 * Update individual stat card
 */
function updateStatCard(index, value) {
    const statCards = document.querySelectorAll('section[class*="grid"] > div');
    if (statCards[index]) {
        const numberElement = statCards[index].querySelector('.text-2xl');
        if (numberElement) {
            numberElement.textContent = value;
        }
    }
}

/**
 * Update workflow steps visualization
 */
function updateWorkflowSteps(stages, currentLoan) {
    const container = document.getElementById('workflow-steps');
    if (!container) return;

    container.innerHTML = '';

    stages.forEach((stage, index) => {
        const stepElement = createWorkflowStepElement(stage, currentLoan, index);
        container.appendChild(stepElement);
    });
}

/**
 * Create workflow step element
 */
function createWorkflowStepElement(stage, currentLoan, index) {
    const div = document.createElement('div');
    div.className = getStepClasses(stage, currentLoan, index);
    div.dataset.stageId = stage.id;

    const isDisabled = !currentLoan || (currentLoan.currentStage < stage.id && stage.id > currentLoan.currentStage);

    div.innerHTML = `
        <div class="step-icon">
            ${getStepIcon(stage, currentLoan)}
        </div>
        <div class="step-title">${stage.name}</div>
        <div class="step-description">${stage.title}</div>
        ${!isDisabled ? `<div class="progress-bar">
            <div class="progress-fill" style="width: ${getStepProgress(stage, currentLoan)}%"></div>
        </div>` : ''}
    `;

    return div;
}

/**
 * Get CSS classes for workflow step
 */
function getStepClasses(stage, currentLoan, index) {
    let classes = 'workflow-step';

    if (!currentLoan) {
        if (stage.id === 1) {
            classes += ' active';
        } else {
            classes += ' disabled';
        }
        return classes;
    }

    const currentStageObj = currentLoan.stages.find(s => s.id === stage.id);
    if (!currentStageObj) {
        classes += ' disabled';
        return classes;
    }

    if (currentStageObj.status === 'completed') {
        classes += ' completed';
    } else if (currentLoan.currentStage === stage.id) {
        classes += ' active';
    } else if (currentLoan.currentStage < stage.id) {
        classes += ' disabled';
    }

    return classes;
}

/**
 * Get step icon based on status
 */
function getStepIcon(stage, currentLoan) {
    if (!currentLoan) {
        return stage.id === 1 ? stage.icon : '<i class="fas fa-lock"></i>';
    }

    const currentStageObj = currentLoan.stages.find(s => s.id === stage.id);
    if (!currentStageObj) {
        return '<i class="fas fa-lock"></i>';
    }

    if (currentStageObj.status === 'completed') {
        return '<i class="fas fa-check"></i>';
    } else if (currentLoan.currentStage === stage.id && currentStageObj.status === 'processing') {
        return '<i class="fas fa-spinner fa-spin"></i>';
    } else if (currentLoan.currentStage >= stage.id) {
        return stage.icon;
    } else {
        return '<i class="fas fa-lock"></i>';
    }
}

/**
 * Get step progress percentage
 */
function getStepProgress(stage, currentLoan) {
    if (!currentLoan) return 0;

    const currentStageObj = currentLoan.stages.find(s => s.id === stage.id);
    if (!currentStageObj) return 0;

    return currentStageObj.progress || 0;
}

/**
 * Update recent applications section
 */
async function updateRecentApplications() {
    const recentSection = document.querySelector('section:last-of-type .p-6');
    if (!recentSection) return;

    try {
        // Always try to get data from server first
        console.log('🔍 대출 목록 요청 중...');
        const response = await apiService.getAllLoans({ limit: 10 });
        console.log('📊 서버 응답:', response);

        // Handle different response formats
        let loans = [];

        if (response && response.items) {
            // Direct API response format
            loans = response.items;
        } else if (response && response.data && response.data.loans) {
            // Expected format
            loans = response.data.loans;
        } else if (response && Array.isArray(response)) {
            // Array format
            loans = response;
        }

        if (loans.length > 0) {
            console.log('✅ 대출 데이터 발견:', loans.length, '개');
            recentSection.innerHTML = createRecentApplicationsTable(loans, true);
            return;
        } else {
            console.log('❌ 대출 데이터 없음 또는 실패');
        }

        // Show empty state when no data
        recentSection.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p class="text-lg">아직 등록된 대출 신청이 없습니다</p>
                <p class="text-sm mt-2">신규 대출 등록 버튼을 클릭하여 첫 번째 신청을 등록해보세요</p>
                <button class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onclick="startNewLoan()">
                    <i class="fas fa-plus mr-2"></i>신규 대출 등록 시작
                </button>
            </div>
        `;

    } catch (error) {
        console.error('❌ 대출 목록 로딩 실패:', error);
        // Show error state - don't use local data
        recentSection.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p class="text-lg">데이터를 불러올 수 없습니다</p>
                <p class="text-sm mt-2">서버 연결을 확인해주세요</p>
                <button class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onclick="location.reload()">
                    <i class="fas fa-refresh mr-2"></i>새로고침
                </button>
            </div>
        `;
    }
}

/**
 * Update recent applications section with provided data
 */
function updateRecentApplicationsFromData(loans) {
    const recentSection = document.querySelector('section:last-of-type .p-6');
    if (!recentSection || !loans || loans.length === 0) return;

    recentSection.innerHTML = createRecentApplicationsTable(loans, true);
}

/**
 * Create recent applications table
 */
function createRecentApplicationsTable(data, isServerData = false) {
    let sortedData, recentData;

    if (isServerData) {
        // Server data is already sorted by created_at DESC
        recentData = data.slice(0, 10);
    } else {
        // Local data
        sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        recentData = sortedData.slice(0, 10);
    }

    return `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대출 신청번호</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사명</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대출 종류</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재 단계</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">문서수</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청일시</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${recentData.map(item => createWorkflowRow(item, isServerData)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Create workflow table row with enhanced status display
 */
function createWorkflowRow(data, isServerData = false) {
    let loanId, companyName, applicationType, currentStage, documentCount, createdAt, workflowStatus;

    if (isServerData) {
        // Server data format - handle both API response formats
        loanId = data.loan_id || data.id || 'Unknown';
        companyName = data.company_name || data.customer_name || 'Unknown Company';
        applicationType = data.application_type || data.product_name || '일반대출';
        currentStage = data.current_stage || 1;
        documentCount = data.document_count || 0;
        createdAt = data.created_at || data.apply_date;
        workflowStatus = data.workflow_status || data.status;
    } else {
        // Local data format
        loanId = data.loanId;
        companyName = data.companyName;
        applicationType = data.applicationType;
        currentStage = data.currentStage;
        documentCount = data.uploadedDocuments ? data.uploadedDocuments.length : 0;
        createdAt = data.createdAt;
        workflowStatus = data.status;
    }

    const statusBadge = getStatusBadge(workflowStatus);
    const stageNames = ['', '신규대출등록', '문서파싱', '후교정', '청킹임베딩', '여신신청서생성', 'RM검토', '심사의견서생성', '최종심사'];
    const stageProgress = getStageProgressDisplay(currentStage, workflowStatus);

    return `
        <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick="viewLoanDetail('${loanId}')">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-blue-600 hover:text-blue-800">${loanId}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${companyName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${applicationType || '일반대출'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex items-center">
                    ${stageProgress}
                    <div class="ml-3">
                        <div class="text-sm font-medium">${stageNames[currentStage] || 'N/A'}</div>
                        <div class="text-xs text-gray-400">단계 ${currentStage}/8</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex items-center">
                    <i class="fas fa-file-alt mr-1 text-gray-400"></i>
                    <span class="font-medium">${documentCount}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(createdAt)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                    <button class="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors" onclick="event.stopPropagation(); viewLoanDetail('${loanId}')" title="상세보기">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors" onclick="event.stopPropagation(); continueWorkflow('${loanId}')" title="계속하기">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Get stage progress display with visual indicator
 */
function getStageProgressDisplay(currentStage, workflowStatus) {
    const progressPercentage = (currentStage - 1) / 8 * 100;
    const stageColor = getStageColor(currentStage, workflowStatus);

    return `
        <div class="relative">
            <div class="w-10 h-10 ${stageColor.bg} rounded-full flex items-center justify-center border-2 ${stageColor.border}">
                ${getStageIcon(currentStage, workflowStatus)}
            </div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xs font-bold ${stageColor.text}">
                ${currentStage}
            </div>
        </div>
    `;
}

/**
 * Get stage color based on current stage and status
 */
function getStageColor(stage, status) {
    const normalizedStatus = normalizeWorkflowStatus(status);

    const colors = {
        'pending': {
            bg: 'bg-gray-100',
            border: 'border-gray-300',
            text: 'text-gray-600'
        },
        'processing': {
            bg: 'bg-blue-100',
            border: 'border-blue-300',
            text: 'text-blue-600'
        },
        'completed': {
            bg: 'bg-green-100',
            border: 'border-green-300',
            text: 'text-green-600'
        },
        'failed': {
            bg: 'bg-red-100',
            border: 'border-red-300',
            text: 'text-red-600'
        },
        'review': {
            bg: 'bg-yellow-100',
            border: 'border-yellow-300',
            text: 'text-yellow-600'
        }
    };

    return colors[normalizedStatus] || colors['pending'];
}

/**
 * Get stage icon based on stage and status
 */
function getStageIcon(stage, status) {
    const normalizedStatus = normalizeWorkflowStatus(status);

    if (normalizedStatus === 'completed') {
        return '<i class="fas fa-check text-green-600"></i>';
    } else if (normalizedStatus === 'processing') {
        return '<i class="fas fa-spinner fa-spin text-blue-600"></i>';
    } else if (normalizedStatus === 'failed') {
        return '<i class="fas fa-times text-red-600"></i>';
    } else if (normalizedStatus === 'review') {
        return '<i class="fas fa-search text-yellow-600"></i>';
    }

    // Default icons by stage
    const stageIcons = {
        1: '<i class="fas fa-upload text-gray-500"></i>',
        2: '<i class="fas fa-file-alt text-gray-500"></i>',
        3: '<i class="fas fa-edit text-gray-500"></i>',
        4: '<i class="fas fa-sitemap text-gray-500"></i>',
        5: '<i class="fas fa-file-contract text-gray-500"></i>',
        6: '<i class="fas fa-user-tie text-gray-500"></i>',
        7: '<i class="fas fa-clipboard-check text-gray-500"></i>',
        8: '<i class="fas fa-gavel text-gray-500"></i>'
    };

    return stageIcons[stage] || '<i class="fas fa-circle text-gray-400"></i>';
}

/**
 * Calculate overall workflow progress
 */
function calculateOverallProgress(workflow) {
    const completedStages = workflow.stages.filter(s => s.status === 'completed').length;
    const currentProgress = workflow.stages.find(s => s.id === workflow.currentStage)?.progress || 0;

    return Math.round(((completedStages * 100) + currentProgress) / 8);
}

/**
 * Get status badge HTML with improved status handling
 */
function getStatusBadge(status) {
    // Normalize status values - handle both client and server formats
    const normalizedStatus = normalizeWorkflowStatus(status);

    const badges = {
        'pending': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200"><i class="fas fa-clock mr-1"></i>대기</span>',
        'processing': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200"><i class="fas fa-spinner fa-spin mr-1"></i>처리중</span>',
        'completed': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200"><i class="fas fa-check mr-1"></i>완료</span>',
        'failed': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200"><i class="fas fa-times mr-1"></i>실패</span>',
        'review': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200"><i class="fas fa-search mr-1"></i>검토중</span>',
        'approved': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200"><i class="fas fa-check-circle mr-1"></i>승인</span>',
        'rejected': '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200"><i class="fas fa-times-circle mr-1"></i>거부</span>'
    };

    return badges[normalizedStatus] || badges['pending'];
}

/**
 * Normalize workflow status values for consistent display
 */
function normalizeWorkflowStatus(status) {
    if (!status) return 'pending';

    const statusMap = {
        // Standard statuses
        'pending': 'pending',
        'processing': 'processing',
        'completed': 'completed',
        'failed': 'failed',
        'review': 'review',
        'approved': 'approved',
        'rejected': 'rejected',
        // Alternative formats
        'in_progress': 'processing',
        'in-progress': 'processing',
        'success': 'completed',
        'error': 'failed',
        'under_review': 'review',
        'under-review': 'review'
    };

    return statusMap[status.toLowerCase()] || 'pending';
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Start new loan workflow
 */
function startNewLoan() {
    // Navigate to new loan registration page
    window.location.href = 'app/loan-management/new-loan.html';
}

/**
 * Select workflow for viewing/editing
 */
function selectWorkflow(loanId) {
    const workflow = window.workflowManager.workflows.get(loanId);
    if (workflow) {
        window.workflowManager.currentLoan = workflow;
        window.workflowManager.updateUI();
        showNotification(`${workflow.companyName} 워크플로우를 선택했습니다.`, 'info');
    }
}

/**
 * View loan detail page
 */
function viewLoanDetail(loanId) {
    window.location.href = `app/loan-management/loan-detail.html?id=${encodeURIComponent(loanId)}`;
}

/**
 * Continue workflow from current stage
 */
function continueWorkflow(loanId) {
    const workflow = window.workflowManager.workflows.get(loanId);
    if (workflow) {
        window.workflowManager.currentLoan = workflow;
        window.workflowManager.goToStage(workflow.currentStage);
    } else {
        // If not found locally, redirect to detail page
        viewLoanDetail(loanId);
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const colors = {
        'success': 'bg-green-100 border-green-400 text-green-700',
        'error': 'bg-red-100 border-red-400 text-red-700',
        'warning': 'bg-yellow-100 border-yellow-400 text-yellow-700',
        'info': 'bg-blue-100 border-blue-400 text-blue-700'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 border-l-4 rounded-md shadow-md z-50 ${colors[type] || colors.info}`;
    notification.innerHTML = `
        <div class="flex justify-between items-center">
            <span>${message}</span>
            <button class="ml-4 font-bold" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Make functions globally available
window.startNewLoan = startNewLoan;
window.selectWorkflow = selectWorkflow;
window.viewLoanDetail = viewLoanDetail;
window.continueWorkflow = continueWorkflow;
window.updateDashboardStats = updateDashboardStats;
window.updateDashboardStatsFromAPI = updateDashboardStatsFromAPI;
window.updateWorkflowSteps = updateWorkflowSteps;