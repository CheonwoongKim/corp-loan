#!/usr/bin/env node

/**
 * HTML Build Script - 템플릿 기반 HTML 빌드
 * AI 기업여신 심사시스템
 */

const fs = require('fs');
const path = require('path');

class HTMLBuilder {
    constructor() {
        this.templatesDir = path.join(__dirname, '..', 'templates');
        this.outputDir = path.join(__dirname, '..');
        this.components = {};
        this.loadComponents();
    }

    /**
     * 컴포넌트 파일들 로드
     */
    loadComponents() {
        const componentsDir = path.join(this.templatesDir, 'components');
        if (!fs.existsSync(componentsDir)) return;

        const componentFiles = fs.readdirSync(componentsDir);
        componentFiles.forEach(file => {
            if (file.endsWith('.html')) {
                const name = path.basename(file, '.html');
                const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
                this.components[name] = content;
            }
        });
    }

    /**
     * 템플릿 변수 치환
     */
    replaceTemplate(content, variables) {
        let result = content;

        // 단순 변수 치환 {{VARIABLE}}
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, variables[key] || '');
        });

        // 조건부 블록 {{#if CONDITION}}...{{/if}}
        result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, block) => {
            return variables[condition] ? block : '';
        });

        // 반복 블록은 복잡하므로 필요시 추가

        return result;
    }

    /**
     * 개별 HTML 페이지 빌드
     */
    buildPage(config) {
        const baseTemplate = fs.readFileSync(path.join(this.templatesDir, 'base.html'), 'utf8');

        // 헤더/네비게이션 결정
        const headerContent = config.headerType === 'main'
            ? this.components['header-main'] || ''
            : this.components['navigation-sub'] || '';

        // 푸터 (공통)
        const footerContent = this.components['footer'] || '';

        // 템플릿 변수 설정
        const variables = {
            PAGE_TITLE: config.pageTitle || '',
            PAGE_STYLES: config.pageStyles || '',
            PAGE_SCRIPTS: config.pageScripts || '',
            PAGE_INIT_SCRIPT: config.pageInitScript || '',
            HEADER_CONTENT: this.replaceTemplate(headerContent, config.headerVariables || {}),
            MAIN_CONTENT: config.mainContent || '',
            FOOTER_CONTENT: footerContent,
            ...config.variables
        };

        // 템플릿 빌드
        const html = this.replaceTemplate(baseTemplate, variables);

        // 파일 저장
        const outputPath = path.join(this.outputDir, config.outputFile);
        fs.writeFileSync(outputPath, html, 'utf8');

        console.log(`✅ Built: ${config.outputFile}`);
    }

    /**
     * 모든 페이지 빌드
     */
    buildAll() {
        // 페이지 설정들
        const pages = [
            {
                outputFile: 'index.html',
                pageTitle: '대시보드',
                headerType: 'main',
                mainContent: this.getDashboardContent(),
                pageScripts: '<script src="assets/js/components/dashboard.js"></script>',
                pageInitScript: 'if(typeof initDashboard === "function") initDashboard();'
            },
            {
                outputFile: 'new-loan.html',
                pageTitle: '신규 대출 등록',
                headerType: 'sub',
                headerVariables: {
                    BACK_URL: 'index.html',
                    BACK_TEXT: '대시보드로 돌아가기',
                    PAGE_TITLE: '신규 대출 등록',
                    SAVE_BUTTON: true,
                    SAVE_ACTION: 'saveFormData()',
                    HELP_BUTTON: true
                },
                mainContent: this.getNewLoanContent(),
                pageInitScript: 'if(typeof initNewLoan === "function") initNewLoan();'
            },
            {
                outputFile: 'loan-detail.html',
                pageTitle: '대출 상세 정보',
                headerType: 'sub',
                headerVariables: {
                    BACK_URL: 'index.html',
                    BACK_TEXT: '대시보드로 돌아가기',
                    PAGE_TITLE: '대출 상세 정보 & 후교정',
                    SAVE_BUTTON: true,
                    SAVE_ACTION: 'saveLoanData()',
                    HELP_BUTTON: true
                },
                mainContent: this.getLoanDetailContent(),
                pageInitScript: 'if(typeof initLoanDetail === "function") initLoanDetail();'
            },
            {
                outputFile: 'loan-approval-application.html',
                pageTitle: 'AI 여신승인신청서',
                headerType: 'sub',
                headerVariables: {
                    BACK_URL: 'loan-detail.html',
                    BACK_TEXT: '대출 상세로 돌아가기',
                    PAGE_TITLE: 'AI 여신승인신청서',
                    SAVE_BUTTON: true,
                    SAVE_ACTION: 'saveApplication()',
                    HELP_BUTTON: true
                },
                mainContent: this.getApprovalApplicationContent(),
                pageInitScript: 'if(typeof initApprovalApplication === "function") initApprovalApplication();'
            },
            {
                outputFile: 'rm-review.html',
                pageTitle: 'RM 검토',
                headerType: 'sub',
                headerVariables: {
                    BACK_URL: 'index.html',
                    BACK_TEXT: '대시보드로 돌아가기',
                    PAGE_TITLE: 'RM 검토 인터페이스',
                    SAVE_BUTTON: true,
                    SAVE_ACTION: 'saveReview()',
                    HELP_BUTTON: true
                },
                mainContent: this.getRMReviewContent(),
                pageInitScript: 'if(typeof initRMReview === "function") initRMReview();'
            },
            {
                outputFile: 'final-review.html',
                pageTitle: '최종 심사',
                headerType: 'sub',
                headerVariables: {
                    BACK_URL: 'index.html',
                    BACK_TEXT: '대시보드로 돌아가기',
                    PAGE_TITLE: '최종 심사 인터페이스',
                    SAVE_BUTTON: true,
                    SAVE_ACTION: 'saveFinalReview()',
                    HELP_BUTTON: true
                },
                mainContent: this.getFinalReviewContent(),
                pageInitScript: 'if(typeof initFinalReview === "function") initFinalReview();'
            }
        ];

        console.log('🔨 Building HTML pages...');
        pages.forEach(page => this.buildPage(page));
        console.log('✅ All pages built successfully!');
    }

    /**
     * 대시보드 메인 콘텐츠
     */
    getDashboardContent() {
        return `
        <!-- Stats Cards -->
        <section class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div class="flex items-center">
                    <div class="p-3 bg-blue-100 rounded-lg">
                        <i class="fas fa-file-alt text-blue-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">전체 신청</p>
                        <p class="text-2xl font-bold text-gray-900" id="totalApplications">0</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div class="flex items-center">
                    <div class="p-3 bg-green-100 rounded-lg">
                        <i class="fas fa-check-circle text-green-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">승인 완료</p>
                        <p class="text-2xl font-bold text-gray-900" id="approvedApplications">0</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div class="flex items-center">
                    <div class="p-3 bg-yellow-100 rounded-lg">
                        <i class="fas fa-clock text-yellow-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">심사 중</p>
                        <p class="text-2xl font-bold text-gray-900" id="pendingApplications">0</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div class="flex items-center">
                    <div class="p-3 bg-red-100 rounded-lg">
                        <i class="fas fa-times-circle text-red-600 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">반려</p>
                        <p class="text-2xl font-bold text-gray-900" id="rejectedApplications">0</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Loan Applications Table -->
        <section class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <h2 class="text-lg font-semibold text-gray-900">대출 신청 목록</h2>
                    <div class="flex space-x-3">
                        <label for="searchInput" class="sr-only">회사명 검색</label>
                        <input type="text" id="searchInput" placeholder="회사명으로 검색..."
                               title="회사명으로 검색"
                               class="px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <label for="statusFilter" class="sr-only">상태 필터</label>
                        <select id="statusFilter" class="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                title="대출 상태 필터">
                            <option value="">모든 상태</option>
                            <option value="pending">심사 중</option>
                            <option value="approved">승인</option>
                            <option value="rejected">반려</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200" id="loansTable">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" data-sort="0"
                                title="회사명으로 정렬" role="button" tabindex="0">
                                회사명 <i class="fas fa-sort ml-1" aria-hidden="true"></i>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" data-sort="1"
                                title="신청일로 정렬" role="button" tabindex="0">
                                신청일 <i class="fas fa-sort ml-1" aria-hidden="true"></i>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" data-sort="2"
                                title="대출금액으로 정렬" role="button" tabindex="0">
                                대출금액 <i class="fas fa-sort ml-1" aria-hidden="true"></i>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                상태
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                진행단계
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                작업
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200" id="loansTableBody">
                        <!-- Dynamic content will be inserted here -->
                    </tbody>
                </table>
            </div>

            <div class="px-6 py-4 border-t border-gray-200">
                <div id="paginationContainer"></div>
            </div>
        </section>`;
    }

    /**
     * 신규 대출 등록 콘텐츠
     */
    getNewLoanContent() {
        return `
        <div class="space-y-8">
            <!-- Company Information Form -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <i class="fas fa-building mr-3 text-blue-600"></i>
                    회사 정보
                </h2>

                <form id="loanApplicationForm" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="companyName" class="block text-sm font-medium text-gray-700 mb-2">회사명 <span class="text-red-500">*</span></label>
                            <input type="text" id="companyName" name="companyName" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="주식회사 한국기업"
                                   aria-required="true" aria-describedby="companyName-desc">
                            <div id="companyName-desc" class="sr-only">대출 신청할 회사명을 입력하세요</div>
                        </div>

                        <div>
                            <label for="businessNumber" class="block text-sm font-medium text-gray-700 mb-2">사업자등록번호</label>
                            <input type="text" id="businessNumber" name="businessNumber"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="123-45-67890"
                                   aria-describedby="businessNumber-desc">
                            <div id="businessNumber-desc" class="sr-only">회사의 사업자등록번호를 입력하세요</div>
                        </div>

                        <div>
                            <label for="loanAmount" class="block text-sm font-medium text-gray-700 mb-2">대출 신청 금액 <span class="text-red-500">*</span></label>
                            <input type="number" id="loanAmount" name="loanAmount" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="1000000000"
                                   aria-required="true" aria-describedby="loanAmount-desc">
                            <div id="loanAmount-desc" class="sr-only">원하는 대출 금액을 원 단위로 입력하세요</div>
                        </div>

                        <div>
                            <label for="industry" class="block text-sm font-medium text-gray-700 mb-2">업종</label>
                            <select id="industry" name="industry"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    aria-describedby="industry-desc">
                                <option value="">업종 선택</option>
                                <option value="manufacturing">제조업</option>
                                <option value="service">서비스업</option>
                                <option value="construction">건설업</option>
                            </select>
                            <div id="industry-desc" class="sr-only">회사의 주요 업종을 선택하세요</div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6">
                        <button type="button" onclick="location.href='index.html'"
                                class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                title="신청을 취소하고 대시보드로 돌아갑니다" aria-label="취소">
                            취소
                        </button>
                        <button type="submit"
                                class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                title="대출 신청을 등록합니다" aria-label="신청 등록">
                            신청 등록
                        </button>
                    </div>
                </form>
            </div>
        </div>`;
    }

    /**
     * 대출 상세 정보 콘텐츠
     */
    getLoanDetailContent() {
        return `
        <div class="space-y-6">
            <div id="workflowStatus"></div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">문서 파싱 및 후교정</h2>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="space-y-4">
                        <h3 class="font-medium text-gray-900">원본 문서</h3>
                        <div id="originalDocument" class="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto">
                            <!-- 원본 문서 내용 -->
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h3 class="font-medium text-gray-900">파싱 결과</h3>
                        <div id="parsedContent" class="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto">
                            <!-- 파싱된 내용 -->
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h3 class="font-medium text-gray-900">후교정</h3>
                        <div id="editedContent" class="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto">
                            <!-- 후교정 내용 -->
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * AI 여신승인신청서 콘텐츠
     */
    getApprovalApplicationContent() {
        return `
        <div class="space-y-6">
            <div id="workflowStatus"></div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">AI 생성 여신승인신청서</h2>
                <div class="prose max-w-none">
                    <div id="aiGeneratedApplication" class="border border-gray-300 rounded-lg p-6">
                        <!-- AI 생성된 신청서 내용 -->
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * RM 검토 콘텐츠
     */
    getRMReviewContent() {
        return `
        <div class="space-y-6">
            <div id="workflowStatus"></div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">RM 검토 체크리스트</h2>
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="check1" class="rounded border-gray-300"
                               aria-describedby="check1-desc">
                        <label for="check1" class="text-sm text-gray-700">재무제표 검토 완료</label>
                        <div id="check1-desc" class="sr-only">회사의 재무제표를 검토했는지 체크하세요</div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="check2" class="rounded border-gray-300"
                               aria-describedby="check2-desc">
                        <label for="check2" class="text-sm text-gray-700">신용정보 확인 완료</label>
                        <div id="check2-desc" class="sr-only">신용정보를 확인했는지 체크하세요</div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="check3" class="rounded border-gray-300"
                               aria-describedby="check3-desc">
                        <label for="check3" class="text-sm text-gray-700">담보 평가 완료</label>
                        <div id="check3-desc" class="sr-only">담보 평가를 완료했는지 체크하세요</div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * 최종 심사 콘텐츠
     */
    getFinalReviewContent() {
        return `
        <div class="space-y-6">
            <div id="workflowStatus"></div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">AI 심사의견서 및 최종 결정</h2>
                <div class="space-y-6">
                    <div>
                        <h3 class="font-medium text-gray-900 mb-2">AI 심사 의견</h3>
                        <div id="aiOpinion" class="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            <!-- AI 생성 심사의견 -->
                        </div>
                    </div>

                    <div>
                        <h3 class="font-medium text-gray-900 mb-2">최종 결정</h3>
                        <div class="flex space-x-4">
                            <button class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    title="대출을 승인합니다" aria-label="대출 승인">승인</button>
                            <button class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    title="대출을 반려합니다" aria-label="대출 반려">반려</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }
}

// CLI 실행
if (require.main === module) {
    const builder = new HTMLBuilder();
    builder.buildAll();
}