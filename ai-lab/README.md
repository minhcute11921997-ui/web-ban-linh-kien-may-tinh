# AI Lab Chatbot

Thu muc nay la moi truong thu nghiem tach rieng cho chatbot tu van san pham. No khong thay doi backend/frontend hien tai.

## Chay nhanh

```powershell
cd ai-lab
npm run sync
node scripts/vector-search.js "Build PC gaming khoang 15 trieu"
node scripts/chat.js "Build PC gaming khoang 15 trieu"
npm run eval
```

## Chay nhu API service rieng

Chay dev foreground:

```powershell
cd ai-lab
npm start
```

Endpoints:

- `GET http://127.0.0.1:4001/health`
- `POST http://127.0.0.1:4001/chat`
- `POST http://127.0.0.1:4001/reload`

Vi du chat:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4001/chat -ContentType application/json -Body '{"message":"Build PC gaming khoang 15 trieu"}'
```

`POST /chat` chi dung local RAG. Service khong goi dich vu AI ben ngoai.

## Dong bo catalog sau khi admin sua san pham

Chay lenh nay sau khi them/sua/xoa san pham, danh muc, thong so, ton kho hoac ma giam gia:

```powershell
cd ai-lab
npm run sync
```

Lenh nay can MySQL dang chay. No se export lai `knowledge-base`, build lai vector index bang local embedding va reload service `4001` neu service dang chay.

Neu chi muon cap nhat file, khong reload service:

```powershell
node scripts/sync-knowledge-base.js --skip-reload
```

## Chay on dinh bang PM2

```powershell
cd ai-lab
npm run pm2:start
npx pm2 status
npm run pm2:logs
```

Khi muon dung service:

```powershell
npm run pm2:stop
```

PM2 hien la co che van hanh tam thoi cho lab noi bo. Service chay noi bo tai `127.0.0.1:4001`; khong de frontend production goi truc tiep endpoint nay.

## UI test rieng

Chay UI test rieng sau khi service `4001` dang chay:

```powershell
node ai-lab/scripts/ui-server.js
```

Sau do mo `http://127.0.0.1:4002`. UI nay chi goi API lab, chua tich hop vao frontend/backend hien tai.

Cham diem qua service:

```powershell
npm run eval:service
```

## Train/tune retrieval

Buoc nay khong fine-tune model. No sinh dataset tu catalog, hoc them alias/guard/rule retrieval, roi cham diem lai.

```powershell
node scripts/generate-training-examples.js
node scripts/tune-retrieval.js
npm run eval:training
```

## Review chat quality

```powershell
node scripts/analyze-chat-logs.js
node scripts/generate-html-report.js
```

## Pre-integration hardening

```powershell
node scripts/export-finetune-dataset.js
node scripts/load-test-service.js
npm run precheck
```

Vector index luon duoc build bang local hash embedding, khong can API key ngoai.

## Ghi chu van hanh

- Du lieu chatbot la snapshot tu MySQL, khong realtime. Sau khi admin cap nhat catalog, chay `npm run sync`.
- Chatbot chi dung local RAG va local embedding.
- Backend web hien goi service AI Lab qua `/api/chatbot/message`; khong con fallback rule-based cu.
- Neu service `127.0.0.1:4001` dung, chatbox web se tra loi loi ket noi thay vi tu xu ly bang chatbot cu.
- Chatbox web gui context ngan trong phien hien tai: toi da 6 tin gan nhat va cac product cards lien quan. Context nay khong luu DB.
- Khong dua `debug` ra frontend production neu khong can.

## Dau ra

- `ai-lab/data/knowledge-base.json`: du lieu san pham da chuan hoa tu MySQL.
- `ai-lab/data/knowledge-base.md`: ban doc duoc bang Markdown.
- `ai-lab/data/vector-index.json`: vector index cho semantic search. Mac dinh lab co the build local bang `--local`; khi API embedding san sang thi build lai khong can flag.
- `ai-lab/data/training-examples.jsonl`: dataset training/evaluation sinh tu catalog.
- `ai-lab/data/tuning-config.json`: config alias/guard/rule da tune.
- `ai-lab/outputs/eval-report.json`: ket qua cham diem tu dong.
- `ai-lab/outputs/eval-report.md`: bao cao ngan gon de review.
- `ai-lab/outputs/service-eval-report.json`: ket qua cham diem qua HTTP service.
- `ai-lab/outputs/chat-logs.jsonl`: log tung request chat de review/fine-tune sau nay.
- `ai-lab/outputs/training-eval-report.json`: ket qua cham diem tren dataset training.
- `ai-lab/outputs/tuning-report.json`: nhung gi script tune da hoc/cap nhat.
- `ai-lab/outputs/chat-log-summary.md`: thong ke request chat da chay.
- `ai-lab/outputs/quality-report.html`: report HTML de duyet bang trinh duyet.
- `ai-lab/data/finetune-chat-dataset.jsonl`: dataset hoi thoai san sang de fine-tune sau nay.
- `ai-lab/outputs/load-test-report.json`: ket qua load test service.
- `ai-lab/outputs/preintegration-check.json`: ket qua kiem tra truoc khi tich hop.

## Huong phat trien tiep

Ban thu nghiem hien tai la local RAG prototype: retrieve san pham lien quan roi tra loi bang logic noi bo. Buoc nang cap tiep theo la cai thien history resolver, bo eval hoi thoai nhieu luot, hoac thay scoring local bang vector database nhu ChromaDB, Qdrant hoac FAISS.
