/**
 * Template Manager - HTML 페이지 공통 요소 관리
 * AI 기업여신 심사시스템
 */

class TemplateManager {
    constructor() {
        this.baseConfig = {
            siteName: 'AI 기업여신 심사시스템',
            siteNameEn: 'Corporate Loan Underwriting System',
            cdnLinks: {
                tailwind: 'https://cdn.tailwindcss.com',
                fontawesome: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
            }
        };
    }

    /**
     * 공통 헤더 HTML 생성
     */
    generateHeader(pageTitle = '') {
        return `
        <header class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-university text-white text-lg"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-gray-900">${this.baseConfig.siteName}</h1>
                                <p class="text-sm text-gray-500">${this.baseConfig.siteNameEn}</p>
                            </div>
                        </div>
                    </div>
                    ${pageTitle ? `<h2 class="text-lg font-semibold text-gray-800">${pageTitle}</h2>` : ''}
                    <div class="flex items-center space-x-4">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                onclick="location.href='new-loan.html'">
                            <i class="fas fa-plus mr-2"></i>신규 대출 등록
                        </button>
                    </div>
                </div>
            </div>
        </header>`;
    }

    /**
     * 공통 네비게이션 HTML 생성 (하위 페이지용)
     */
    generateNavigation(backUrl = 'index.html', backText = '대시보드로 돌아가기', pageTitle = '') {
        return `
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="${backUrl}" class="text-blue-600 hover:text-blue-800 transition-colors">
                            <i class="fas fa-arrow-left mr-2"></i>${backText}
                        </a>
                    </div>
                    ${pageTitle ? `<h1 class="text-xl font-semibold text-gray-900">${pageTitle}</h1>` : ''}
                    <div class="w-32"></div>
                </div>
            </div>
        </nav>`;
    }

    /**
     * 공통 페이지 푸터 HTML 생성
     */
    generateFooter() {
        return `
        <footer class="bg-white border-t border-gray-200 mt-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="flex justify-between items-center">
                    <p class="text-sm text-gray-500">
                        © 2024 ${this.baseConfig.siteName}. All rights reserved.
                    </p>
                    <div class="flex space-x-4">
                        <a href="#" class="text-sm text-gray-500 hover:text-gray-700">도움말</a>
                        <a href="#" class="text-sm text-gray-500 hover:text-gray-700">문의하기</a>
                    </div>
                </div>
            </div>
        </footer>`;
    }

    /**
     * 로딩 스피너 HTML 생성
     */
    generateLoader(message = '처리중...') {
        return `
        <div id="globalLoader" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p class="text-gray-700 font-medium">${message}</p>
            </div>
        </div>`;
    }

    /**
     * 알림 모달 HTML 생성
     */
    generateNotificationModal() {
        return `
        <div id="notificationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                <div class="flex items-center space-x-3 mb-4">
                    <div id="notificationIcon" class="w-8 h-8 rounded-full flex items-center justify-center">
                        <i id="notificationIconClass" class="text-white"></i>
                    </div>
                    <h3 id="notificationTitle" class="text-lg font-semibold"></h3>
                </div>
                <p id="notificationMessage" class="text-gray-600 mb-6"></p>
                <div class="flex justify-end space-x-3">
                    <button id="notificationClose" class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
                        닫기
                    </button>
                    <button id="notificationConfirm" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors hidden">
                        확인
                    </button>
                </div>
            </div>
        </div>`;
    }

    /**
     * 공통 스타일 및 스크립트 태그 생성
     */
    generateCommonAssets() {
        return {
            styles: `
                <link rel="stylesheet" href="${this.baseConfig.cdnLinks.fontawesome}">
                <link rel="stylesheet" href="assets/css/core/main.css">
                <link rel="stylesheet" href="assets/css/core/variables.css">`,
            scripts: `
                <script src="${this.baseConfig.cdnLinks.tailwind}"></script>
                <script src="assets/js/services/api-service.js"></script>
                <script src="assets/js/core/template-manager.js"></script>`
        };
    }

    /**
     * 페이지별 breadcrumb 생성
     */
    generateBreadcrumb(pages) {
        if (!pages || pages.length === 0) return '';

        return `
        <nav class="mb-6">
            <ol class="flex space-x-2 text-sm">
                ${pages.map((page, index) => {
                    if (index === pages.length - 1) {
                        return `<li class="text-gray-500">${page.name}</li>`;
                    } else {
                        return `
                            <li>
                                <a href="${page.url}" class="text-blue-600 hover:text-blue-800">${page.name}</a>
                                <span class="mx-2 text-gray-400">/</span>
                            </li>`;
                    }
                }).join('')}
            </ol>
        </nav>`;
    }

    /**
     * 워크플로우 진행 상태 표시기 생성
     */
    generateWorkflowStatus(currentStep, totalSteps = 8) {
        const steps = [
            '신규등록', '문서파싱', '후교정', '청킹임베딩',
            'AI신청서', 'RM검토', 'AI의견서', '최종심사'
        ];

        return `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">진행 단계</h3>
            <div class="flex items-center justify-between">
                ${steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return `
                        <div class="flex flex-col items-center ${index < steps.length - 1 ? 'flex-1' : ''}">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-green-500 text-white' :
                                isCurrent ? 'bg-blue-600 text-white' :
                                'bg-gray-300 text-gray-600'
                            }">
                                ${isCompleted ? '<i class="fas fa-check text-sm"></i>' : stepNumber}
                            </div>
                            <span class="text-xs mt-2 text-center ${
                                isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-600'
                            }">${step}</span>
                            ${index < steps.length - 1 ? `
                                <div class="hidden md:block w-full h-0.5 ${
                                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                } mt-4"></div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;
    }
}

// 전역 인스턴스 생성
window.templateManager = new TemplateManager();

// DOM 로드 후 공통 요소 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로더 및 모달 추가
    document.body.insertAdjacentHTML('beforeend', window.templateManager.generateLoader());
    document.body.insertAdjacentHTML('beforeend', window.templateManager.generateNotificationModal());

    // 모달 이벤트 리스너
    const modal = document.getElementById('notificationModal');
    const closeBtn = document.getElementById('notificationClose');
    const confirmBtn = document.getElementById('notificationConfirm');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (window.modalCallback) window.modalCallback();
        });
    }
});

// 유틸리티 함수들
window.showLoader = function(message = '처리중...') {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.querySelector('p').textContent = message;
        loader.classList.remove('hidden');
    }
};

window.hideLoader = function() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.add('hidden');
};

window.showNotification = function(title, message, type = 'info', showConfirm = false, callback = null) {
    const modal = document.getElementById('notificationModal');
    const icon = document.getElementById('notificationIcon');
    const iconClass = document.getElementById('notificationIconClass');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    const confirmBtn = document.getElementById('notificationConfirm');

    // 타입별 아이콘 및 색상 설정
    const config = {
        success: { icon: 'fas fa-check', bgClass: 'bg-green-500' },
        error: { icon: 'fas fa-times', bgClass: 'bg-red-500' },
        warning: { icon: 'fas fa-exclamation', bgClass: 'bg-yellow-500' },
        info: { icon: 'fas fa-info', bgClass: 'bg-blue-500' }
    };

    const typeConfig = config[type] || config.info;

    icon.className = `w-8 h-8 rounded-full flex items-center justify-center ${typeConfig.bgClass}`;
    iconClass.className = typeConfig.icon + ' text-white';
    titleEl.textContent = title;
    messageEl.textContent = message;

    if (showConfirm) {
        confirmBtn.classList.remove('hidden');
        window.modalCallback = callback;
    } else {
        confirmBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
};