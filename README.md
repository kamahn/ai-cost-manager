# AI 비용 관리 앱

AI 툴 구독 및 크레딧 결제 내역을 구글 시트와 연동해서 관리하는 PWA 앱입니다.

## 기능
- 결제내역 / 구독목록 / 프로젝트별 관리
- 정산 상태 추적 (미청구 → 청구완료 → 정산완료)
- 구독 갱신 알림 Gmail 자동 발송
- 모바일 홈 화면 추가 (PWA)

## 환경 변수 설정

Vercel 배포 시 아래 환경 변수를 설정하세요:

```
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_SPREADSHEET_ID=your_spreadsheet_id
```

## 로컬 개발

```bash
npm install
cp .env.example .env.local
# .env.local 에 실제 값 입력
npm run dev
```

## Vercel 배포

1. GitHub에 push
2. vercel.com 에서 import
3. 환경 변수 설정
4. Deploy
