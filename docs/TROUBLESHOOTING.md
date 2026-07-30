# 문제 해결

## API 키가 없음

정상입니다. 수동 무료, 로컬 후반 작업, 모의 생성은 계속 사용할 수 있습니다. Gemini 생성만 비활성화됩니다.

## FFmpeg를 찾을 수 없음

Windows에서는 `winget install Gyan.FFmpeg`, macOS에서는 `brew install ffmpeg`, Ubuntu에서는 `sudo apt install ffmpeg`를 사용한 뒤 새 터미널을 여세요.

## 인물이 장면마다 바뀜

얼굴, 헤어스타일, 의상, 액세서리와 제품 색상을 한 문장으로 만든 뒤 모든 장면에 동일하게 반복하세요. 한 번에 한 요소만 바꾸는 변형을 사용하세요.

## 손·물체가 중복됨

화면 안 물체 수를 명시하고, 가려짐이 심한 복잡한 동작을 줄이세요. “stable anatomy, exact object count, no duplicate limbs or objects”를 부정 제약과 함께 사용합니다.

## 색이 갑자기 변함

광원 방향, 색온도와 노출 변화 시간을 지정하고 “no abrupt exposure or color-temperature shift”를 추가하세요.

## 유료 호출이 거부됨

`MAX_SINGLE_JOB_BUDGET_USD`, `DRY_RUN`, 키 존재 여부와 명시적 사용자 승인을 확인하세요. 앱은 검증 실패나 정책 차단 요청을 자동 재시도하지 않습니다.
