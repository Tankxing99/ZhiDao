# zhidao-api (Node.js + Express)

Minimal backend for Douyin Cloud container service.

- Port: 8000
- Endpoints:
  - GET /healthz
  - GET /getQuestionConfig
  - POST /listPlants
  - POST /submitAnswers

## API Contracts (Phase A)

- GET /getQuestionConfig
  - Resp: { ok: true, version: string, questions: Array }
- POST /listPlants
  - Req: { page?: number=1, pageSize?: number=10, tags?: string[] }
  - Resp: { ok: true, data: Plant[], total: number, page: number, pageSize: number }
  - Plant: { id, name, tags: string[], onShelf: boolean, cover, updatedAt }
- POST /submitAnswers
  - Req: { openId?: string, answers: Array<{ id: string, value: any }>, clientTs?: number }
  - Resp: { ok: true } (Phase A no persistence)

Data for Phase A is served from ./data/*.json. DB persistence will be added in Phase B.

Dockerfile provided at project root.
