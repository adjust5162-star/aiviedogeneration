# AI Video Studio

아이디어를 안정적인 생성 프롬프트로 설계하고, 프로젝트·참고 자료·예산·생성 결과를 한곳에서 관리하는 한국어 AI 영상 제작 앱입니다.

## 구현된 기능

- Supabase 이메일 인증과 사용자별 작업 공간
- 프로젝트 생성·수정·최근 프로젝트 불러오기
- 피사체 일관성, 물리 표현, 카메라 안정성을 강화한 한/영 프롬프트
- 50MB 제한의 비공개 참고 자료 업로드와 권리 확인
- Row Level Security로 모든 데이터와 Storage 객체를 사용자별 분리
- 작업당·하루 예산을 트랜잭션으로 예약하는 서버 측 비용 보호
- 명시적 유료 호출 동의, 멱등성 키, DRY_RUN
- Gemini Interactions 영상 생성, 비공개 저장, 1시간 서명 URL 재생

## 설치

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`에 Supabase URL, publishable key, 서버 전용 Gemini API 키를 입력합니다. 비밀 키는 Git이나 브라우저 코드에 넣지 마세요.

## Supabase

`supabase/migrations/20260730225441_create_ai_video_studio.sql`을 대상 프로젝트에 적용합니다. 이 마이그레이션은 테이블, 인덱스, 제약 조건, RLS 정책, 비공개 `media` 버킷, 예산 예약 및 작업 상태 전환 함수를 함께 만듭니다.

## 검증

```bash
npm run lint
npm run build:vercel
```

## 배포 환경 변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_VIDEO_MODEL`
- `OMNI_ESTIMATED_COST_USD`
- `DRY_RUN`

처음에는 `DRY_RUN=true`로 인증·저장·예산 흐름을 확인한 뒤 실제 생성이 필요할 때만 `false`로 바꾸는 것을 권장합니다.
