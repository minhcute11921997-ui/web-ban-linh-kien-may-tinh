# AI Lab Chatbot

Thu muc nay la service chatbot tach rieng cho shop. Kien truc hien tai la RAG ket hop Gemini:

```text
Frontend chatbox
  -> Backend /api/chatbot/message
  -> ai-lab /chat
  -> rag-llm-pipeline
     -> Gemini parse intent va viet cau tra loi
     -> RAG retrieval lay san pham tu catalog snapshot
     -> fallback rule-based neu Gemini loi hoac timeout
```

## Chay service

Dat API key trong `be/.env` hoac env cua process:

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.0-flash
```

Chay AI Lab:

```powershell
cd ai-lab
npm start
```

Mac dinh:

- `GEMINI_ENABLED=1`
- `GEMINI_MODEL=gemini-2.0-flash`
- `GEMINI_PARSE_TIMEOUT_MS=2500`
- `GEMINI_REPLY_TIMEOUT_MS=5000`

Neu muon tam thoi tat Gemini va chi chay RAG fallback:

```powershell
npm run start:rag
```

## Eval contract ngan gon

Bo eval moi nam o `evals/contract-cases.json`. No khong kiem tra cau tra loi phai giong tung chu, ma chi kiem tra cac rang buoc du lieu nhu danh muc, gia toi da, co san pham hay khong.

```powershell
npm run eval:contract
```

## Endpoints

- `GET http://127.0.0.1:4001/health`
- `POST http://127.0.0.1:4001/chat`
- `POST http://127.0.0.1:4001/reload`

Vi du chat:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4001/chat -ContentType application/json -Body '{"message":"Build PC gaming khoang 15 trieu"}'
```

## Dong bo catalog

Du lieu chatbot la snapshot tu MySQL. Sau khi admin them/sua/xoa san pham, danh muc, thong so, ton kho hoac ma giam gia:

```powershell
cd ai-lab
npm run sync
```

Lenh nay export lai `knowledge-base.json`, build lai `vector-index.json`, roi reload service `4001` neu service dang chay.

## Chay bang PM2

```powershell
cd ai-lab
npm run pm2:start
npm run pm2:logs
```

Dung service:

```powershell
npm run pm2:stop
```

## File runtime can giu

- `scripts/chat-service.js`: HTTP API.
- `scripts/rag-llm-pipeline.js`: dieu phoi RAG + Gemini.
- `scripts/gemini-core.js`: adapter Gemini.
- `scripts/tools/catalog-tools.js`: tool contract cho retrieval catalog.
- `scripts/rag-core.js`: retrieval, guard, fallback answer.
- `scripts/embedding-core.js`: load/search vector index.
- `scripts/sync-knowledge-base.js`: dong bo catalog va reload service.
- `scripts/export-knowledge-base.js`: export snapshot catalog tu MySQL.
- `scripts/build-vector-index.js`: build vector index local.
- `data/knowledge-base.json`: snapshot catalog.
- `data/vector-index.json`: vector index local.
- `data/chatbot-skills.json` va `data/tuning-config.json`: guard/rule config cho RAG fallback.

## File dev/test co the tach rieng

`test-cases.json`, `training-examples*`, `finetune-chat-dataset.jsonl`, `outputs/*`, va cac script trong `scripts/dev-tools/*` khong bat buoc cho runtime chatbox. Chung chi dung de danh gia, tao dataset, tuning retrieval va report.
