/**
 * Page Utilities - HTML 페이지 공통 기능
 * AI 기업여신 심사시스템
 */

class PageUtils {
    constructor() {
        this.currentLoanId = this.getLoanIdFromUrl();
    }

    /**
     * URL에서 대출 ID 추출
     */
    getLoanIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    /**
     * 페이지 이동 (state 저장 포함)
     */
    navigateTo(url, state = {}) {
        if (state && Object.keys(state).length > 0) {
            sessionStorage.setItem('pageState', JSON.stringify(state));
        }
        window.location.href = url;
    }

    /**
     * 저장된 페이지 state 복원
     */
    restorePageState() {
        const savedState = sessionStorage.getItem('pageState');
        if (savedState) {
            sessionStorage.removeItem('pageState');
            return JSON.parse(savedState);
        }
        return {};
    }

    /**
     * 폼 데이터 로컬 저장 (임시 저장)
     */
    saveFormData(formId, data) {
        const key = `formData_${formId}`;
        localStorage.setItem(key, JSON.stringify(data));
    }

    /**
     * 저장된 폼 데이터 복원
     */
    restoreFormData(formId) {
        const key = `formData_${formId}`;
        const savedData = localStorage.getItem(key);
        if (savedData) {
            return JSON.parse(savedData);
        }
        return {};
    }

    /**
     * 폼 데이터 삭제 (제출 완료 후)
     */
    clearFormData(formId) {
        const key = `formData_${formId}`;
        localStorage.removeItem(key);
    }

    /**
     * 파일 업로드 진행률 표시
     */
    showUploadProgress(containerId, fileName, progress) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const progressId = `progress_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let progressElement = document.getElementById(progressId);

        if (!progressElement) {
            progressElement = document.createElement('div');
            progressElement.id = progressId;
            progressElement.innerHTML = `
                <div class="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg mb-2">
                    <i class="fas fa-file text-blue-600"></i>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-700">${fileName}</p>
                        <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    <span class="text-sm text-gray-600">0%</span>
                </div>
            `;
            container.appendChild(progressElement);
        }

        const progressBar = progressElement.querySelector('.bg-blue-600');
        const progressText = progressElement.querySelector('.text-gray-600');

        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }

        if (progress >= 100) {
            setTimeout(() => {
                progressElement.classList.add('opacity-0');
                setTimeout(() => {
                    if (progressElement.parentNode) {
                        progressElement.parentNode.removeChild(progressElement);
                    }
                }, 300);
            }, 1000);
        }
    }

    /**
     * 테이블 정렬 기능
     */
    sortTable(tableId, columnIndex, direction = 'asc') {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
            const aValue = a.cells[columnIndex].textContent.trim();
            const bValue = b.cells[columnIndex].textContent.trim();

            // 숫자 비교
            const aNum = parseFloat(aValue.replace(/[^0-9.-]/g, ''));
            const bNum = parseFloat(bValue.replace(/[^0-9.-]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return direction === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // 문자 비교
            return direction === 'asc' ?
                aValue.localeCompare(bValue) :
                bValue.localeCompare(aValue);
        });

        // 정렬된 행들로 tbody 재구성
        rows.forEach(row => tbody.appendChild(row));

        // 정렬 아이콘 업데이트
        this.updateSortIcons(table, columnIndex, direction);
    }

    /**
     * 테이블 정렬 아이콘 업데이트
     */
    updateSortIcons(table, activeColumn, direction) {
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach((header, index) => {
            const icon = header.querySelector('i');
            if (icon) {
                if (index === activeColumn) {
                    icon.className = direction === 'asc' ?
                        'fas fa-sort-up' : 'fas fa-sort-down';
                } else {
                    icon.className = 'fas fa-sort';
                }
            }
        });
    }

    /**
     * 검색 필터 적용
     */
    filterTable(tableId, searchTerm, columnIndexes = []) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');

        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            let match = false;

            if (columnIndexes.length === 0) {
                // 모든 컬럼 검색
                match = Array.from(row.cells).some(cell =>
                    cell.textContent.toLowerCase().includes(term)
                );
            } else {
                // 지정된 컬럼만 검색
                match = columnIndexes.some(index =>
                    row.cells[index] &&
                    row.cells[index].textContent.toLowerCase().includes(term)
                );
            }

            row.style.display = match ? '' : 'none';
        });
    }

    /**
     * 페이지네이션 생성
     */
    createPagination(containerId, totalItems, itemsPerPage, currentPage = 1) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        let paginationHTML = '<nav class="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">';

        // 이전 페이지
        if (currentPage > 1) {
            paginationHTML += `
                <button onclick="pageUtils.goToPage(${currentPage - 1})"
                        class="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // 페이지 번호들
        paginationHTML += '<div class="hidden md:flex">';
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            paginationHTML += `
                <button onclick="pageUtils.goToPage(${i})"
                        class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            isActive
                                ? 'bg-blue-600 text-white focus:outline-offset-0'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                        }">
                    ${i}
                </button>
            `;
        }
        paginationHTML += '</div>';

        // 다음 페이지
        if (currentPage < totalPages) {
            paginationHTML += `
                <button onclick="pageUtils.goToPage(${currentPage + 1})"
                        class="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += '</nav>';
        container.innerHTML = paginationHTML;
    }

    /**
     * 페이지 이동 (페이지네이션용)
     */
    goToPage(page) {
        // 페이지별로 구현 필요
        console.log(`Going to page: ${page}`);
    }

    /**
     * 날짜 포맷팅
     */
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';

        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'YYYY-MM-DD HH:mm':
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            case 'MM/DD':
                return `${month}/${day}`;
            default:
                return `${year}-${month}-${day}`;
        }
    }

    /**
     * 숫자 포맷팅 (통화)
     */
    formatCurrency(amount, currency = 'KRW') {
        if (isNaN(amount)) return '';

        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }

    /**
     * 파일 크기 포맷팅
     */
    formatFileSize(bytes) {
        if (!bytes) return '0 B';

        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    /**
     * 입력값 검증
     */
    validateInput(input, rules = {}) {
        const value = input.value.trim();
        const errors = [];

        if (rules.required && !value) {
            errors.push('필수 입력 항목입니다.');
        }

        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`최소 ${rules.minLength}자 이상 입력해주세요.`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`최대 ${rules.maxLength}자까지 입력 가능합니다.`);
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(rules.patternMessage || '올바른 형식이 아닙니다.');
        }

        if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push('올바른 이메일 형식이 아닙니다.');
        }

        if (rules.phone && value && !/^[\d-]+$/.test(value)) {
            errors.push('올바른 전화번호 형식이 아닙니다.');
        }

        return errors;
    }

    /**
     * 에러 메시지 표시
     */
    showFieldError(fieldId, errors) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // 기존 에러 메시지 제거
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        if (errors.length > 0) {
            field.classList.add('border-red-500');

            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-sm text-red-600 mt-1';
            errorDiv.textContent = errors[0];

            field.parentNode.appendChild(errorDiv);
        } else {
            field.classList.remove('border-red-500');
        }
    }
}

// 전역 인스턴스 생성
window.pageUtils = new PageUtils();