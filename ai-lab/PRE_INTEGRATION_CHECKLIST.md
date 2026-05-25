# Pre-Integration Checklist

Trang thai can dat truoc khi sua backend/frontend web cu:

- [x] Export du lieu catalog tu MySQL thanh knowledge base.
- [x] Build vector index rieng trong `ai-lab`.
- [x] Chat service rieng chay o `127.0.0.1:4001`.
- [x] Endpoint `GET /health` hoat dong.
- [x] Endpoint `POST /chat` hoat dong.
- [x] Endpoint `POST /reload` hoat dong.
- [x] Smoke evaluation pass.
- [x] Training evaluation pass.
- [x] Service evaluation pass qua HTTP.
- [x] Chat logs duoc ghi vao JSONL.
- [x] Quality report HTML duoc tao.
- [x] API contract duoc ghi lai.
- [ ] Chon co che production: local service, Docker, PM2, hoac Windows service.
- [ ] Quyet dinh co bat Gemini bat buoc hay cho phep fallback local.
- [ ] Sau khi duyet chat quality, moi tao adapter trong backend web.

Lenh precheck:

```powershell
node ai-lab/scripts/preintegration-check.js
```
