#!/usr/bin/env node

/**
 * HTML 접근성 자동 수정 스크립트
 */

const fs = require('fs');
const path = require('path');

class AccessibilityFixer {
    constructor() {
        this.fixes = [];
    }

    fixHtmlFile(filePath) {
        console.log(`🔧 Fixing: ${path.basename(filePath)}`);

        let content = fs.readFileSync(filePath, 'utf8');
        let fixCount = 0;

        // 1. label에 for 속성 추가 (id가 다음 줄의 input/select에 있는 경우)
        content = content.replace(
            /<label class="([^"]*)"([^>]*)>([^<]*(?:<span[^>]*>[^<]*<\/span>)?[^<]*)<\/label>\s*\n\s*<(input|select|textarea)([^>]*)\sid="([^"]*)"([^>]*)/g,
            (match, labelClass, labelAttrs, labelText, elementType, beforeId, id, afterId) => {
                if (!labelAttrs.includes('for=')) {
                    fixCount++;
                    return `<label for="${id}" class="${labelClass}"${labelAttrs}>${labelText}</label>\n                            <${elementType}${beforeId} id="${id}"${afterId}`;
                }
                return match;
            }
        );

        // 2. input/select/textarea에 title 속성 추가 (없는 경우에만)
        content = content.replace(
            /<(input|select|textarea)([^>]*?)>/g,
            (match, elementType, attrs) => {
                if (!attrs.includes('title=')) {
                    // id에서 title 추출
                    const idMatch = attrs.match(/id="([^"]*)"/);
                    if (idMatch) {
                        const id = idMatch[1];
                        let title = this.generateTitleFromId(id);
                        if (title) {
                            fixCount++;
                            return `<${elementType}${attrs} title="${title}">`;
                        }
                    }
                }
                return match;
            }
        );

        // 3. button에 title 속성 추가 (아이콘만 있는 경우)
        content = content.replace(
            /<button([^>]*?)class="([^"]*p-2[^"]*)"([^>]*?)>(\s*<i[^>]*><\/i>\s*)<\/button>/g,
            (match, beforeClass, classAttr, afterClass, iconContent) => {
                if (!beforeClass.includes('title=') && !afterClass.includes('title=')) {
                    fixCount++;
                    // 아이콘에서 title 추출
                    const iconMatch = iconContent.match(/fa-([a-z-]+)/);
                    let title = "작업";
                    if (iconMatch) {
                        const iconName = iconMatch[1];
                        title = this.generateTitleFromIcon(iconName);
                    }
                    return `<button${beforeClass}class="${classAttr}"${afterClass} title="${title}" aria-label="${title}">${iconContent}</button>`;
                }
                return match;
            }
        );

        // 4. 아이콘에 aria-hidden 속성 추가
        content = content.replace(
            /<i class="fas ([^"]*)"([^>]*)><\/i>/g,
            (match, iconClass, attrs) => {
                if (!attrs.includes('aria-hidden')) {
                    fixCount++;
                    return `<i class="fas ${iconClass}"${attrs} aria-hidden="true"></i>`;
                }
                return match;
            }
        );

        if (fixCount > 0) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`   ✅ Fixed ${fixCount} issues`);
        } else {
            console.log(`   ℹ️  No issues found`);
        }

        return fixCount;
    }

    generateTitleFromId(id) {
        const titleMap = {
            'companyName': '회사명을 입력하세요',
            'businessNumber': '사업자등록번호를 입력하세요',
            'companyAddress': '회사 주소를 입력하세요',
            'companyPhone': '회사 전화번호를 입력하세요',
            'establishedYear': '설립연도를 입력하세요',
            'businessType': '업종을 입력하세요',
            'annualRevenue': '연매출을 입력하세요',
            'employeeCount': '직원수를 입력하세요',
            'applicationType': '대출 종류를 선택하세요',
            'requestedAmount': '신청 금액을 입력하세요',
            'loanDuration': '대출 기간을 입력하세요',
            'purpose': '대출 목적을 입력하세요',
            'searchInput': '검색어를 입력하세요',
            'statusFilter': '상태를 선택하세요',
            'industry': '업종을 선택하세요',
            'loanAmount': '대출 금액을 입력하세요',
            'approvalAmount': '승인 금액을 선택하세요',
            'rejectionCategory': '거부 사유를 선택하세요',
            'commentType': '코멘트 유형을 선택하세요',
            'interestRate': '희망 금리를 입력하세요',
            'collateralType': '담보 유형을 입력하세요',
            'collateralValue': '담보 가액을 입력하세요',
            'loanPurpose': '대출 목적을 입력하세요',
            'applicantName': '신청자명을 입력하세요',
            'applicantPosition': '직책을 입력하세요',
            'applicantContact': '연락처를 입력하세요',
            'applicantEmail': '이메일을 입력하세요',
            'birthDate': '생년월일을 선택하세요'
        };
        return titleMap[id] || '';
    }

    generateTitleFromIcon(iconName) {
        const iconTitleMap = {
            'question-circle': '도움말',
            'bell': '알림',
            'save': '저장',
            'user': '사용자',
            'plus': '추가',
            'arrow-left': '이전',
            'sort': '정렬',
            'search': '검색'
        };
        return iconTitleMap[iconName] || '작업';
    }

    processDirectory(dirPath) {
        const files = fs.readdirSync(dirPath);
        let totalFixes = 0;

        files.forEach(file => {
            if (file.endsWith('.html')) {
                const filePath = path.join(dirPath, file);
                totalFixes += this.fixHtmlFile(filePath);
            }
        });

        return totalFixes;
    }

    run() {
        console.log('🚀 Starting accessibility fixes...\n');

        // pages/src 디렉토리 처리
        const srcDir = path.join(__dirname, 'pages', 'src');
        if (fs.existsSync(srcDir)) {
            console.log('📁 Processing pages/src/');
            const srcFixes = this.processDirectory(srcDir);
            console.log(`   Total fixes in src: ${srcFixes}\n`);
        }

        // 루트 HTML 파일들 처리
        console.log('📁 Processing root directory');
        const rootFixes = this.processDirectory(__dirname);
        console.log(`   Total fixes in root: ${rootFixes}\n`);

        console.log('✅ Accessibility fixes completed!');
    }
}

// 실행
if (require.main === module) {
    const fixer = new AccessibilityFixer();
    fixer.run();
}