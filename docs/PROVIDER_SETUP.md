# 공급자 설정

## Gemini

2026-07-30 공식 문서 기준:

- 기본: `gemini-omni-flash-preview` — Interactions API, 3~10초, 720p, 16:9·9:16, 대화형 편집
- 고급 표준: `veo-3.1-generate-preview`
- 고급 빠른 생성: `veo-3.1-fast-generate-preview`
- 비용 절감: `veo-3.1-lite-generate-preview`
- 이미지: `gemini-3.1-flash-lite-image`
- TTS: `gemini-3.1-flash-tts-preview`

환경 변수는 `.env.example`을 참고하세요. 실제 키는 `.env.local` 또는 배포 비밀 저장소에만 두고, 클라이언트 접두사가 붙은 변수로 만들지 마세요.

Gemini Omni Flash와 Veo는 프리뷰 상태이므로 모델 ID, 지역, 한도, 가격이 바뀔 수 있습니다. 코드에는 모델 ID를 직접 흩뿌리지 않고 `GEMINI_VIDEO_MODEL`로 교체할 수 있게 했습니다.

## Meta AI · Vibes

이 앱은 로그인 자동화, 개발자 도구 추출, 숨은 미디어 URL 수집, 쿠키 재사용을 하지 않습니다. 사용자는 공식 UI에서 직접 작업하고, 이용 권한이 있는 결과만 수동으로 가져옵니다.
