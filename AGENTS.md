# demo_mock AGENTS

> 결재 흐름 데모용 React 클라이언트. 상세 명세는 [docs/demo-mock/README.md](../docs/demo-mock/README.md).

## 빠른 인지

- 포트: 3003
- 인증: 없음 (`/org-directory/users` 선택만)
- 탭: 신청 / 신청현황 / 결재함
- 외부 의존: BE (`http://localhost:8080`)

## 작업 시 유의

- 본 모듈은 데모용. 새 기능 추가보다는 명확한 흐름 유지를 우선.
- API 변경이 BE 에서 발생하면 `demo_mock/src/api.js` 와 `docs/demo-mock/README.md` 의 엔드포인트 표를 함께 갱신.
- 인사연동 사용자 목록 외 다른 사용자 소스로 바꾸지 말 것 — 의도적으로 `/org-directory/users` 만 사용한다.
