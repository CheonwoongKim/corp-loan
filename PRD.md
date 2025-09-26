# PRD: AI 기반 기업여신 심사 자동화 시스템

## 1. 프로젝트 개요

### 1.1 배경
- 기존 수작업 기반 대출 심사 프로세스의 비효율성 해결
- Azure Document Intelligence와 생성형 AI를 활용한 자동화 시스템 구축
- 80% 자동화를 통한 처리시간 70% 단축 목표

### 1.2 목적
- 문서 업로드부터 최종 심사까지 전체 워크플로우 자동화
- 실시간 진행 상황 추적 및 투명한 심사 프로세스 제공
- 인적 오류 최소화 및 심사 품질 향상

### 1.3 핵심 성과지표 (KPI)
- 문서 처리 시간: 2-3일 → 1시간 (95% 단축)
- 전체 심사 시간: 7-10일 → 2-3일 (70% 단축)
- 분석 정확도: 85% 이상 (인간 RM과의 일치율)
- 사용자 만족도: 4.0/5.0 이상

## 2. 시스템 아키텍처

### 2.1 현재 시스템 아키텍처
```
┌─────────────────────────────────────────────────────┐
│                Frontend Layer                        │
│      HTML5 + Vanilla JS + Tailwind CSS            │
│            (Live Server: 127.0.0.1:5500)           │
├─────────────────────────────────────────────────────┤
│               Backend API Layer                     │
│        ywstorage.synology.me:4000/v1               │
│   ┌─────────────┬──────────────┬─────────────────┐  │
│   │    JWT      │    Loan      │     MinIO       │  │
│   │    Auth     │ Management   │   S3 Storage    │  │
│   │             │              │                 │  │
│   └─────────────┴──────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────┤
│              AI Processing Layer                    │
│        Azure Document Intelligence API             │
│         (cheonwoong.cognitiveservices...)          │
├─────────────────────────────────────────────────────┤
│                Data Layer                           │
│     MySQL Database + MinIO Object Storage         │
└─────────────────────────────────────────────────────┘
```

### 2.2 향후 확장 아키텍처 (Phase 2+)
```
┌─────────────────────────────────────────────────────┐
│                Frontend Layer                        │
│        React + TypeScript + Tailwind CSS           │
├─────────────────────────────────────────────────────┤
│              Business Logic Layer                   │
│         Multi-Agent AI System                      │
│   ┌─────────────┬──────────────┬─────────────────┐  │
│   │   Master    │   Document   │   Specialized   │  │
│   │   Agent     │Intelligence  │    Agents       │  │
│   │             │    Layer     │                 │  │
│   └─────────────┴──────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────┤
│                Data Layer                           │
│    Azure Document Intelligence + Vector Store      │
└─────────────────────────────────────────────────────┘
```

### 2.3 Multi-Agent System (향후 구현)
- **Master Agent**: 전체 워크플로우 조율 및 작업 분배
- **Financial Analysis Agent**: ROA, ROE, 재무비율 분석
- **Credit Analysis Agent**: 신용등급, 상환능력 평가
- **Collateral Evaluation Agent**: 담보물 가치 평가, LTV 계산
- **Business Analysis Agent**: 산업 분석, 사업 타당성 검토
- **Report Generation Agent**: 자동 문서 생성

## 3. 8단계 워크플로우

### 3.1 전체 프로세스 흐름
```
1. 신규대출등록 (파일 업로드)
   ↓
2. 문서 파싱 (Azure Document Intelligence)
   ↓
3. 후교정 (사람 검증)
   ↓
4. 청킹 임베딩 (Vector Store 저장)
   ↓
5. 여신승인신청서 생성 (AI 생성)
   ↓
6. RM 검토 (편집 및 승인)
   ↓
7. 심사의견서 생성 (AI 분석)
   ↓
8. 최종 심사 (심사역 결정)
```

### 3.2 각 단계별 상세 요구사항

#### Stage 1: 신규대출등록 (파일 업로드)
- **목적**: 대출 신청 문서 업로드 및 기본 정보 등록
- **입력**: 복수 문서 (PDF, JPG, Word, Excel)
- **기능**:
  - Drag & Drop 파일 업로드
  - 파일 형식 검증
  - 진행 상황 표시
  - 문서 타입 자동 분류

#### Stage 2: 문서 파싱 (Azure Document Intelligence)
- **목적**: Azure Document Intelligence를 통한 텍스트 및 구조 추출
- **API 연동**:
  - MinIO Storage에서 문서 파일을 base64로 인코딩
  - Azure Document Intelligence API 호출
  - 파싱 결과를 백엔드 API로 저장
- **처리 과정**:
  1. 업로드된 문서를 Storage API에서 조회
  2. 파일을 base64로 인코딩
  3. Azure DI API 호출 (`prebuilt-layout` 모델 사용)
  4. 키-값 쌍, 표, 텍스트 블록 추출
  5. 신뢰도 점수와 함께 결과 저장
- **출력**: JSON 형태의 파싱 결과 (신뢰도 점수 포함)

#### Stage 3: 후교정
- **목적**: AI 파싱 결과의 인간 검증 및 수정
- **기능**:
  - 원본 문서 미리보기
  - 추출된 데이터 편집 인터페이스
  - 신뢰도 85% 미만 항목 우선 표시
  - 실시간 저장

#### Stage 4: 청킹 임베딩
- **목적**: 문서를 의미 단위로 분할하고 벡터화
- **기능**:
  - Semantic chunking
  - Vector embedding 생성
  - Vector store에 저장
  - 청킹 결과 미리보기

#### Stage 5: 여신승인신청서 생성
- **목적**: AI가 분석된 데이터를 바탕으로 신청서 자동 생성
- **기능**:
  - 4단계 생성 프로세스 (기본정보 → 재무분석 → 위험평가 → 최종검토)
  - 실시간 생성 진행 표시
  - 생성 완료 후 미리보기

#### Stage 6: RM 검토
- **목적**: RM이 AI 생성 신청서를 검토하고 편집
- **기능**:
  - Split-screen 편집 인터페이스
  - 변경사항 추적 (Track Changes)
  - 자동 저장
  - 승인/반려 결정

#### Stage 7: 심사의견서 생성
- **목적**: 심사역을 위한 AI 분석 의견서 생성
- **기능**:
  - 종합 위험도 분석
  - 승인 권고사항 도출
  - 주요 검토 포인트 정리
  - 심사 의견서 생성

#### Stage 8: 최종 심사
- **목적**: 심사역의 최종 승인/거부 결정
- **기능**:
  - 신청서 + AI 의견서 동시 검토
  - 위험도 요약 대시보드
  - 승인 조건 설정
  - 최종 의견 작성

## 4. 개발 Phase 계획

### Phase 1: 기본 인프라 구축 (1-2주)
**목표**: 기본 프로젝트 구조 및 네비게이션 완성

#### 1.1 프로젝트 초기화 ✅
- [x] HTML/CSS/JS 기본 구조 생성
- [x] Tailwind CSS 설정
- [x] 폴더 구조 정리
- [x] Git 초기화

#### 1.2 기본 레이아웃 ✅
- [x] 메인 대시보드 페이지 (`index.html`)
- [x] 사이드바 네비게이션
- [x] 상단 헤더
- [x] 반응형 레이아웃

#### 1.3 워크플로우 관리 시스템 ✅
- [x] `workflow-manager.js` 구현
  - 8단계 워크플로우 정의
  - 단계별 상태 관리
  - localStorage 기반 데이터 저장
  - 단계 간 이동 로직

#### 1.4 테스트 환경 ✅
- [x] 로컬 서버 설정
- [x] 기본 네비게이션 테스트
- [x] 반응형 디자인 확인

### Phase 2: Stage 1 구현 (1주) ✅
**목표**: 파일 업로드 시스템 완성

#### 2.1 파일 업로드 인터페이스 ✅
- [x] `new-loan.html` 생성 (대출 등록 + 파일 업로드 통합)
- [x] Drag & Drop 업로드 구현
- [x] 파일 형식 검증
- [x] 업로드 진행률 표시

#### 2.2 문서 타입 분류 ✅
- [x] 업로드된 파일의 자동 분류
- [x] 문서 타입별 아이콘 표시
- [x] 지원 형식: PDF, JPG, Word, Excel

#### 2.3 데이터 저장 ✅
- [x] MinIO S3 스토리지에 파일 저장
- [x] 워크플로우 상태 업데이트
- [x] 백엔드 API 연동

#### 2.4 테스트 ✅
- [x] 다양한 파일 형식 업로드 테스트
- [x] 오류 처리 확인
- [x] 실제 API 연동 검증

### Phase 3: Stage 2-3 구현 (2주)
**목표**: 문서 파싱 및 후교정 시스템 완성

#### 3.1 Azure Document Intelligence 연동 🚧
- [ ] Azure DI API 호출 기능 구현
- [ ] base64 파일 인코딩 로직
- [ ] 파싱 진행률 표시
- [ ] 파싱 결과 저장 및 시각화

#### 3.2 후교정 인터페이스 🚧
- [ ] 파싱 결과 편집 인터페이스 구현
- [ ] 원본 문서 미리보기 (MinIO Storage 연동)
- [ ] 추출 데이터 편집 기능
- [ ] 신뢰도 기반 우선순위 표시

#### 3.3 실제 데이터 연동 🚧
- [ ] Azure DI 파싱 결과와 UI 연동
- [ ] MinIO Storage 파일 조회 기능
- [ ] 파싱 결과 데이터베이스 저장

#### 3.4 테스트
- [ ] 파싱 시뮬레이션 동작 확인
- [ ] 후교정 기능 검증
- [ ] 데이터 저장/로드 테스트

### Phase 4: Stage 4-5 구현 (2주)
**목표**: 청킹/임베딩 및 신청서 생성 시스템 완성

#### 4.1 청킹 임베딩 시스템 🚧
- [ ] 파싱된 문서 청킹 로직 구현
- [ ] 청킹 진행 과정 시각화
- [ ] Vector embedding 생성 (OpenAI/Azure OpenAI)
- [ ] Vector store 저장 시뮬레이션

#### 4.2 신청서 생성 시스템 🚧
- [ ] AI 기반 여신승인신청서 생성 로직
- [ ] 4단계 생성 프로세스 구현
- [ ] LLM API 연동 (OpenAI/Azure OpenAI)
- [ ] 실시간 생성 진행 상황 표시

#### 4.3 데이터 플로우 통합
- [ ] 이전 단계 데이터 활용
- [ ] 생성된 신청서 저장
- [ ] 단계별 데이터 연동 검증

#### 4.4 테스트
- [ ] 청킹 프로세스 확인
- [ ] 신청서 생성 로직 검증
- [ ] 전체 워크플로우 연동 테스트

### Phase 5: Stage 6-8 구현 (2주)
**목표**: RM 검토 및 최종 심사 시스템 완성

#### 5.1 RM 검토 인터페이스
- [ ] `pages/rm-review.html` 생성
- [ ] Split-screen 편집기 구현
- [ ] Change tracking 기능
- [ ] 자동 저장 기능

#### 5.2 심사의견서 생성
- [ ] `pages/review-opinion-generation.html` 생성
- [ ] AI 분석 시뮬레이션
- [ ] 위험도 분석 결과 표시
- [ ] 의견서 자동 생성

#### 5.3 최종 심사 인터페이스
- [ ] `pages/final-review.html` 생성
- [ ] 3단 레이아웃 (신청서/의견서/결정)
- [ ] 위험도 요약 대시보드
- [ ] 최종 결정 양식

#### 5.4 테스트
- [ ] RM 검토 프로세스 확인
- [ ] 의견서 생성 로직 검증
- [ ] 최종 심사 워크플로우 테스트

### Phase 6: 통합 테스트 및 개선 (1-2주)
**목표**: 전체 시스템 통합 및 사용성 개선

#### 6.1 전체 워크플로우 테스트
- [ ] Stage 1부터 8까지 연속 처리 테스트
- [ ] 데이터 무결성 검증
- [ ] 오류 시나리오 처리 확인

#### 6.2 UI/UX 개선
- [ ] 사용성 테스트 실시
- [ ] 인터페이스 개선사항 적용
- [ ] 반응형 디자인 최적화

#### 6.3 성능 최적화
- [ ] 로딩 시간 개선
- [ ] 메모리 사용량 최적화
- [ ] 브라우저 호환성 확인

#### 6.4 문서화
- [ ] 사용자 매뉴얼 작성
- [ ] 개발자 문서 업데이트
- [ ] 설치 및 설정 가이드

## 5. 데이터 구조 설계

### 5.1 워크플로우 상태 관리
```javascript
{
  loanId: string,
  companyName: string,
  currentStage: number,
  status: 'pending' | 'processing' | 'completed',
  stages: [
    {
      id: number,
      name: string,
      status: 'pending' | 'processing' | 'completed',
      progress: number,
      startTime: timestamp,
      endTime: timestamp,
      tasks: [
        { name: string, completed: boolean }
      ]
    }
  ],
  uploadedDocuments: [],
  parsingResults: {},
  extractedData: {},
  chunkingResults: {},
  vectorStoreData: {},
  loanApplication: {},
  rmReviewData: {},
  reviewOpinion: {},
  finalDecision: {}
}
```

### 5.2 실제 API 응답 구조

#### 5.2.1 대출 등록 응답
```javascript
// POST /v1/loans 응답
{
  ok: true,
  id: 3
}

// 프론트엔드에서 변환된 형태
{
  success: true,
  data: {
    loanId: 3,
    id: 3
  },
  ok: true,
  id: 3
}
```

#### 5.2.2 파일 업로드 응답
```javascript
// POST /v1/storage/{bucket}/upload 응답
{
  ok: true,
  bucket: "loan-agent-files",
  key: "3/test-document.pdf",
  size: 721,
  contentType: "application/octet-stream"
}

// 프론트엔드에서 처리된 형태
{
  success: true,
  data: {
    loanId: "3",
    uploadedFiles: [
      {
        filename: "test-document.pdf",
        key: "3/test-document.pdf",
        type: "business_registration",
        size: 721,
        status: "completed"
      }
    ],
    failedFiles: [],
    message: "1개 파일이 업로드되었습니다."
  }
}
```

#### 5.2.3 대출 목록 조회 응답
```javascript
// GET /v1/loans 응답
{
  // 페이징 정보는 백엔드 API 스펙에 따라 향후 구현
  loans: [
    {
      id: 3,
      customer_name: "테스트 회사",
      product_name: "운영자금 대출",
      loan_amount: "100억원",
      apply_date: "2025-09-26",
      status: "접수",
      // ... 기타 필드들
    }
  ]
}
```

### 5.3 문서 파싱 결과 구조 (향후 구현)
```javascript
{
  documentId: string,
  filename: string,
  type: string,
  confidence: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  extractedFields: {
    // 문서별 추출된 필드들
  },
  actualData: {
    // Azure Document Intelligence 원본 결과
  },
  verificationStatus: 'pending' | 'verified' | 'modified'
}
```

## 6. 기술 스택

### 6.1 Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3 + Tailwind CSS**: 빠른 UI 개발 및 일관성
- **Vanilla JavaScript**: 가벼운 런타임, ES6+ 문법 활용
- **Font Awesome**: 아이콘 시스템

### 6.2 Backend API Integration
- **Base URL**: `http://ywstorage.synology.me:4000/v1`
- **Authentication**: JWT Bearer Token 방식
- **Storage API**: MinIO S3 호환 스토리지 연동
- **Loan Management API**: RESTful API 기반 대출 관리

### 6.3 Azure Document Intelligence 연동
- **API Endpoint**: `https://cheonwoong.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30&features=keyValuePairs`
- **Headers**:
  - `Content-Type: application/json`
  - `Ocp-Apim-Subscription-Key: YOUR_AZURE_FORM_RECOGNIZER_KEY`
- **Request Body**:
  ```json
  {
    "base64Source": "base64_encoded_document_content"
  }
  ```
- **기능**: 문서 레이아웃 분석, 키-값 쌍 추출, 표 구조 인식

### 6.4 Data Management
- **JWT Token**: LocalStorage 기반 인증 토큰 관리
- **MinIO Storage**: 문서 파일 저장 및 관리
- **JSON**: 구조화된 데이터 교환
- **Fetch API**: HTTP 요청 처리

### 6.5 Development Tools
- **Live Server**: 개발 서버
- **Chrome DevTools**: 디버깅
- **Git**: 버전 관리

## 6.6 백엔드 API 상세 문서

**API 문서**: http://ywstorage.synology.me:4000/docs/
**Base URL**: `http://ywstorage.synology.me:4000`

### 6.6.1 인증 API

#### POST /v1/auth/signup - 회원가입
- **설명**: 이메일 중복 검사 → 비밀번호 해시 저장 → JWT 발급(1h)
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Request Body**:
```json
{
  "name": "김천웅",
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "phonenumber": "01012345678",
  "organization": "AI 솔루션 개발팀",
  "role": "member"
}
```
- **Response (201)**:
```json
{
  "ok": true,
  "uid": 2,
  "email": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": "1h"
}
```

#### POST /v1/auth/login - 로그인
- **설명**: JWT 토큰 발급
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!"
}
```
- **Response (200)**: JWT 토큰 포함

#### GET /v1/auth/me - 내 프로필 조회
- **설명**: JWT 토큰 기반 사용자 정보 조회
- **보안**: JWT Bearer Token 필수
- **Headers**: `Authorization: Bearer {token}`

#### POST /v1/auth/change-password - 비밀번호 변경
- **설명**: 기존 비밀번호 확인 → 새 비밀번호 해시 저장
- **보안**: JWT Bearer Token 필수
- **Request Body**:
```json
{
  "oldPassword": "oldP@ssw0rd",
  "newPassword": "newP@ssw0rd123"
}
```

### 6.6.2 대출 관리 API

#### GET /v1/loans - 대출 목록 조회
- **설명**: 페이지네이션, 검색(q) 지원
- **Parameters**:
  - `page`: 페이지 번호 (기본값: 1)
  - `pageSize`: 페이지 크기 (기본값: 20, 최대: 100)
  - `q`: 검색어 (예: "코그넷")

#### POST /v1/loans - 신규 대출 등록
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Request Body**:
```json
{
  "customer_name": "(주)코그넷나인",
  "business_no": "107-87-23907",
  "contact": "02-1234-5678",
  "manager_name": "김대리",
  "branch_name": "강남지점",
  "apply_date": "2025-09-11",
  "product_name": "종합통장대출 PF",
  "loan_amount": "12,000백만원",
  "loan_period_months": 24,
  "interest_rate": "연 7.20%",
  "fee_rate": "연 0.60%",
  "total_rate": "연 7.80%",
  "repayment_method": "원리금균등",
  "ltv": 70,
  "guarantor": "보증보험",
  "collateral_type": "부동산",
  "region": "서울",
  "fund_usage": "운영자금",
  "repayment_source": "영업현금흐름",
  "credit_class": "A",
  "classification_reason": "재무건전",
  "arranger_fee": "0.30%",
  "agent_bank_fee": "0.20%",
  "early_repay_fee": "1.0%",
  "status": "접수"
}
```
- **Response (201)**:
```json
{
  "ok": true,
  "id": 3
}
```

#### GET /v1/loans/{id} - 대출 단건 조회
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Parameters**: `id` (정수, 최소값: 1)

#### DELETE /v1/loans/{id} - 대출 건 삭제
- **설명**: admin/manager 권한만 허용 (하드 삭제)
- **보안**: JWT Bearer Token 필수
- **Response (200)**:
```json
{
  "ok": true,
  "deleted": 1
}
```

#### GET /v1/loan-applications - 대출 심사 신청 목록
- **설명**: 페이지네이션, 검색(customer_name/business_no/product_name LIKE), 상태/담당자/지점, 신청일 범위 필터
- **Parameters**:
  - `page`, `pageSize`: 페이지네이션
  - `q`: 검색어
  - `status`: 상태 필터
  - `manager`: 담당자 필터
  - `branch`: 지점 필터
  - `applyFrom`, `applyTo`: 신청일 범위 (YYYY-MM-DD)

### 6.6.3 파일 스토리지 API (MinIO S3 호환)

#### GET /v1/storage/buckets - 버킷 목록 조회
- **Response (200)**:
```json
{
  "count": 2,
  "buckets": [
    {
      "name": "loans",
      "creationDate": "2025-09-12T00:00:00.000Z"
    }
  ]
}
```

#### POST /v1/storage/buckets - 신규 버킷 생성
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Request Body**:
```json
{
  "bucket": "my-bucket-001",
  "region": "us-east-1"
}
```

#### GET /v1/storage/{bucket}/objects - 버킷 내 오브젝트 목록
- **Parameters**:
  - `prefix`: 접두사 필터 (예: "2025/09/")
  - `maxKeys`: 최대 반환 개수 (1-1000, 기본값: 100)
  - `continuationToken`: 페이징 토큰
- **Response**:
```json
{
  "bucket": "loan-agent-files",
  "prefix": "2025/09/",
  "count": 3,
  "isTruncated": false,
  "nextContinuationToken": null,
  "objects": [
    {
      "key": "2025/09/sample.json",
      "size": 12345,
      "etag": "\"abc123\"",
      "lastModified": "2025-09-12T00:00:00.000Z"
    }
  ]
}
```

#### POST /v1/storage/{bucket}/upload - 파일 업로드
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Parameters**: `key` (파일 경로, 예: "1/new-folder/test.pdf")
- **Content-Type**: `multipart/form-data`
- **Form Data**: `file` (바이너리)
- **Response (201)**:
```json
{
  "ok": true,
  "bucket": "loan-agent-files",
  "key": "1/test-document.pdf",
  "size": 721,
  "contentType": "application/octet-stream"
}
```

#### GET /v1/storage/{bucket}/preview - 파일 미리보기
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **Parameters**:
  - `key`: 파일 키 (필수)
  - `mode`: "url" (302 리다이렉트) 또는 "stream" (직접 스트리밍, 기본값: "url")
  - `disposition`: "inline" 또는 "attachment" (기본값: "inline")
  - `expires`: Presigned URL 만료 시간(초, 기본값: 900)

#### GET /v1/storage/{bucket}/download - 파일 다운로드
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **설명**: Content-Disposition=attachment으로 강제 다운로드
- **Parameters**: `key` (필수)
- **Content-Type**: `application/octet-stream`

#### POST /v1/storage/{bucket}/prefix - 폴더 생성
- **보안**: JWT Bearer Token 불필요 (공개 엔드포인트)
- **설명**: key 이름 끝에 "/"를 붙여 S3에 더미 오브젝트 생성
- **Request Body**:
```json
{
  "prefix": "1/new-folder/"
}
```

#### DELETE /v1/storage/buckets/{bucket} - 버킷 삭제
- **Parameters**: `purge` (boolean, 기본값: false) - 객체를 선삭제할지 여부

### 6.6.4 시스템 API

#### GET /v1/db/healthz - DB 상태 확인
- **설명**: 데이터베이스 ping 테스트
- **Response (200)**: "OK"
- **Response (500)**: "DB error"

#### GET /v1/users/{uid} - 사용자 정보 조회
- **Parameters**: `uid` (정수, 최소값: 1)
- **Response**:
```json
{
  "uid": 1,
  "email": "user@example.com",
  "name": "김천웅",
  "role": "manager",
  "phonenumber": "01012345678",
  "organization": "AI 솔루션 개발팀"
}
```

### 6.6.5 Azure Document Intelligence API
- **Base URL**: `https://cheonwoong.cognitiveservices.azure.com/documentintelligence`
- **Model**: `prebuilt-layout` (문서 레이아웃 분석)
- **API Version**: `2024-11-30`
- **Features**: `keyValuePairs` (키-값 쌍 추출)

**사용 예시**:
```javascript
// 1. 파일을 base64로 인코딩
const fileBase64 = await convertFileToBase64(file);

// 2. Azure DI API 호출
const response = await fetch(
  'https://cheonwoong.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30&features=keyValuePairs',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': 'YOUR_AZURE_FORM_RECOGNIZER_KEY'
    },
    body: JSON.stringify({
      base64Source: fileBase64
    })
  }
);
```

## 6.2 API 통합 가이드

### 6.2.1 인증 플로우
```javascript
// 1. 자동 로그인 (개발 환경)
const loginResult = await apiService.login('test@corp-loan.com', 'test123!');

// 2. JWT 토큰 자동 관리 (LocalStorage)
apiService.setAuthToken(response.token);

// 3. 인증이 필요한 API 호출 시 자동으로 Authorization 헤더 추가
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.2.2 파일 업로드 플로우
```javascript
// 1. 대출 등록
const loanData = {
  customer_name: "테스트 회사",
  product_name: "운영자금 대출",
  loan_amount: "100억원",
  apply_date: "2025-09-26"
};
const loanResponse = await apiService.createLoan(loanData);
const loanId = loanResponse.id;

// 2. 파일 업로드 (MinIO S3)
const files = [file1, file2, file3];
const uploadResult = await apiService.uploadDocuments(loanId, files);

// 3. Azure Document Intelligence 처리 (Stage 2에서 구현 예정)
for (const uploadedFile of uploadResult.data.uploadedFiles) {
  const parsingResult = await processWithAzureDI(uploadedFile.key);
}
```

### 6.2.3 에러 처리 패턴
```javascript
try {
  const response = await apiService.createLoan(data);
  if (response.ok || response.success) {
    // 성공 처리
  }
} catch (error) {
  if (error.message.includes('unauthorized')) {
    // 토큰 만료 시 재로그인
    await apiService.login('test@corp-loan.com', 'test123!');
  } else {
    // 기타 오류 처리
    console.error('API 호출 실패:', error.message);
  }
}
```

### 6.2.4 보안 정책

#### JWT 토큰 관리
- **토큰 저장**: LocalStorage (`corp_loan_token`)
- **토큰 만료**: 1시간 (자동 만료 검사)
- **자동 갱신**: 만료 시 자동 재로그인

#### API 보안 수준
- 🔓 **공개 엔드포인트**: 인증 불필요
  - `/v1/auth/login`, `/v1/auth/signup`
  - `/v1/loans` (GET, POST, GET/{id})
  - `/v1/storage/**` (모든 스토리지 API)

- 🔐 **보호된 엔드포인트**: JWT 토큰 필수
  - `/v1/auth/me`, `/v1/auth/change-password`
  - `/v1/loans/{id}` (DELETE)
  - `/v1/loan-applications`
  - `/v1/db/healthz`

#### CORS 정책
- **허용 도메인**: 개발 환경 다중 도메인 지원
- **자격증명**: `credentials: true`
- **허용 메소드**: GET, POST, PUT, DELETE, PATCH, OPTIONS

### 6.2.5 성능 최적화

#### 파일 업로드 최적화
- **병렬 업로드**: 여러 파일 동시 업로드
- **에러 복구**: 실패한 파일만 재업로드
- **진행 상황**: 실시간 업로드 진행률 표시

#### API 호출 최적화
- **타임아웃 설정**: 30초 (변경 가능)
- **재시도 로직**: 네트워크 오류 시 자동 재시도
- **로딩 상태**: 사용자 경험 향상을 위한 로딩 표시

### 6.2.6 오류 처리 및 상태 코드

#### HTTP 상태 코드 처리
```javascript
const handleApiResponse = async (response, data) => {
  switch (response.status) {
    case 200:
    case 201:
      return { success: true, data };

    case 400:
      throw new Error('잘못된 요청: ' + (data.message || '입력 데이터를 확인하세요'));

    case 401:
      // JWT 토큰 만료 또는 인증 실패
      await apiService.login('test@corp-loan.com', 'test123!');
      throw new Error('인증이 만료되었습니다. 다시 로그인하세요.');

    case 403:
      throw new Error('권한이 없습니다.');

    case 404:
      throw new Error('요청한 리소스를 찾을 수 없습니다.');

    case 413:
      throw new Error('파일 크기가 너무 큽니다. (최대 50MB)');

    case 500:
      throw new Error('서버 내부 오류가 발생했습니다.');

    default:
      throw new Error(`알 수 없는 오류 (${response.status})`);
  }
};
```

#### 네트워크 오류 처리
```javascript
const handleNetworkError = (error) => {
  if (error.name === 'AbortError') {
    return '요청 시간이 초과되었습니다.';
  }

  if (error.message.includes('Failed to fetch')) {
    return '서버에 연결할 수 없습니다. 네트워크 상태를 확인하세요.';
  }

  if (error.message.includes('NetworkError')) {
    return '네트워크 오류가 발생했습니다.';
  }

  return error.message;
};
```

#### Azure Document Intelligence 오류 처리
```javascript
const handleAzureDIError = (error, response) => {
  if (response?.status === 400) {
    return 'Azure DI: 문서 형식이 지원되지 않거나 손상되었습니다.';
  }

  if (response?.status === 403) {
    return 'Azure DI: API 키가 유효하지 않거나 할당량을 초과했습니다.';
  }

  if (response?.status === 429) {
    return 'Azure DI: 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.';
  }

  return 'Azure DI: 문서 분석 중 오류가 발생했습니다.';
};
```

#### 사용자 친화적 오류 메시지
| 오류 유형 | 기술적 메시지 | 사용자 메시지 |
|-----------|---------------|---------------|
| 네트워크 오류 | `Failed to fetch` | 서버 연결에 실패했습니다. 인터넷 연결을 확인해주세요. |
| 파일 크기 초과 | `413 Payload Too Large` | 파일 크기가 50MB를 초과합니다. 더 작은 파일을 선택해주세요. |
| 인증 만료 | `401 Unauthorized` | 로그인이 만료되었습니다. 페이지를 새로고침해주세요. |
| 서버 오류 | `500 Internal Server Error` | 일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요. |
| 파일 형식 오류 | `Unsupported file type` | 지원되지 않는 파일 형식입니다. PDF, JPG, PNG, Word, Excel 파일만 업로드 가능합니다. |

## 7. 품질 보증

### 7.1 테스트 전략
- **단위 테스트**: 각 함수별 기능 검증
- **통합 테스트**: 단계별 워크플로우 검증
- **E2E 테스트**: 전체 프로세스 시나리오 테스트
- **사용성 테스트**: 실제 사용자 관점 검증

### 7.2 품질 기준
- **코드 품질**: ESLint, 일관된 코딩 스타일
- **성능**: 페이지 로드 시간 3초 이내
- **접근성**: WCAG 2.1 AA 준수
- **브라우저 지원**: Chrome, Firefox, Safari, Edge

## 8. 위험 관리

### 8.1 기술적 위험
- **Azure Document Intelligence 연동**: Phase 2에서 mock 데이터로 우선 구현
- **복잡한 워크플로우**: 단계별 개발로 위험 분산
- **브라우저 호환성**: 표준 웹 기술 사용으로 최소화

### 8.2 완화 방안
- Mock 데이터를 활용한 점진적 개발
- 각 Phase별 완전한 테스트 후 다음 단계 진행
- 정기적인 백업 및 버전 관리

## 9. 배포 및 운영

### 9.1 배포 전략
- **개발환경**: Local HTTP Server
- **스테이징**: GitHub Pages 또는 Vercel
- **프로덕션**: 클라우드 환경 (추후 결정)

### 9.2 모니터링
- **성능 모니터링**: 로딩 시간, 응답 시간
- **오류 추적**: JavaScript 오류, 네트워크 오류
- **사용자 행동**: 워크플로우 완료율, 단계별 이탈률

## 10. 현재 구현 상태 (2025-09-26 기준)

### 10.1 완료된 기능 ✅
- **기본 프로젝트 구조**: HTML/CSS/JavaScript 기본 구조 완성
- **대출 등록 시스템**: 완전한 대출 신청 양식 및 처리 로직
- **문서 업로드**: Drag & Drop 파일 업로드, 다중 파일 지원
- **8단계 워크플로우**: 단계별 진행 상태 표시 및 네비게이션
- **대시보드**: 통계, 최근 신청 현황, 전체 현황 표시
- **상세 페이지**: 개별 대출 정보 및 워크플로우 상태
- **API 통합**: ywstorage 백엔드 API 완전 연동
- **JWT 인증**: 자동 로그인 및 토큰 관리 시스템
- **파일 스토리지**: MinIO S3 호환 스토리지 연동

### 10.2 실제 데이터 연동 완료 🔗
- **백엔드 API**: `http://ywstorage.synology.me:4000/v1`
- **테스트 계정**: `test@corp-loan.com` (자동 로그인 설정됨)
- **문서 업로드**: `loan-agent-files` 버킷 사용
- **샘플 데이터**: 실제 기업 대출 관련 문서들 업로드 완료

### 10.3 Azure Document Intelligence 준비 완료 🤖
- **API 키 및 엔드포인트**: 설정 완료
- **연동 방식**: 백엔드 API를 통한 파일 → base64 → Azure DI 파이프라인
- **지원 기능**: 키-값 쌍 추출, 표 구조 인식, 레이아웃 분석

### 10.4 다음 개발 우선순위 📋
1. **Azure DI API 연동** (Stage 2 완성)
   - 파일 → base64 변환 로직
   - Azure DI API 호출 및 결과 처리
   - 파싱 결과 시각화

2. **후교정 시스템** (Stage 3 완성)
   - 파싱 결과 편집 인터페이스
   - 신뢰도 기반 우선순위 표시
   - 원본 문서 vs 추출 데이터 비교

3. **AI 에이전트 시스템** (Stage 4-5)
   - 청킹 및 임베딩 프로세스
   - 여신승인신청서 자동 생성

## 11. 향후 발전 계획

### 11.1 Phase 2 (AI 고도화) - 2주 예상
- Azure Document Intelligence 실제 연동
- Multi-Agent AI 시스템 구현
- 실시간 진행 상황 업데이트

### 11.2 Phase 3 (사용자 경험 개선) - 1주 예상
- 반응형 디자인 최적화
- 사용자 권한 관리 시스템
- 알림 및 상태 업데이트 시스템

### 11.3 Phase 4 (확장 기능) - 향후
- 다양한 대출 상품 지원
- 모바일 앱 개발
- 외부 시스템 API 연동

---

## 개발 환경 현황

### 현재 실행 중인 서버
- **프론트엔드**: Live Server (`http://127.0.0.1:5500`)
- **백엔드 API**: `http://ywstorage.synology.me:4000` (운영 중)
- **문서 스토리지**: MinIO 클러스터 (운영 중)
- **Azure DI**: API 키 활성화 상태

### 개발 환경 설정 완료
- JWT 토큰 자동 관리
- CORS 정책 설정
- 파일 업로드 검증
- 오류 처리 시스템

**현재 시스템은 완전히 작동 가능한 상태이며, Azure Document Intelligence 연동만 추가하면 실제 AI 기반 문서 처리가 가능합니다.**