# AI Lab Chatbot

Thu muc nay la moi truong thu nghiem tach rieng cho chatbot tu van san pham. No khong thay doi backend/frontend hien tai.

## Chay nhanh

```powershell
node ai-lab/scripts/export-knowledge-base.js
node ai-lab/scripts/build-vector-index.js --local
node ai-lab/scripts/vector-search.js "Build PC gaming khoang 15 trieu"
node ai-lab/scripts/chat.js "Build PC gaming khoang 15 trieu"
node ai-lab/scripts/evaluate.js --gemini
```

## Chay nhu API service rieng

```powershell
node ai-lab/scripts/chat-service.js
```

Endpoints:

- `GET http://127.0.0.1:4001/health`
- `POST http://127.0.0.1:4001/chat`
- `POST http://127.0.0.1:4001/reload`

Vi du chat:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4001/chat -ContentType application/json -Body '{"message":"Build PC gaming khoang 15 trieu"}'
```

## UI test rieng

Chay UI test rieng sau khi service `4001` dang chay:

```powershell
node ai-lab/scripts/ui-server.js
```

Sau do mo `http://127.0.0.1:4002`. UI nay chi goi API lab, chua tich hop vao frontend/backend hien tai.

Cham diem qua service:

```powershell
node ai-lab/scripts/evaluate-service.js --gemini
```

## Train/tune retrieval

Buoc nay khong fine-tune model. No sinh dataset tu catalog, hoc them alias/guard/rule retrieval, roi cham diem lai.

```powershell
node ai-lab/scripts/generate-training-examples.js
node ai-lab/scripts/tune-retrieval.js
node ai-lab/scripts/evaluate-training.js
node ai-lab/scripts/evaluate-training.js --gemini
```

## Review chat quality

```powershell
node ai-lab/scripts/analyze-chat-logs.js
node ai-lab/scripts/generate-html-report.js
```

## Pre-integration hardening

```powershell
node ai-lab/scripts/export-finetune-dataset.js
node ai-lab/scripts/load-test-service.js
node ai-lab/scripts/preintegration-check.js
```

Neu Gemini Embedding API con quota, co the build index bang embedding that:

```powershell
node ai-lab/scripts/build-vector-index.js
```

Neu khong muon goi Gemini khi cham diem:

```powershell
node ai-lab/scripts/evaluate.js
```

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

Ban thu nghiem hien tai la RAG prototype: retrieve san pham lien quan truoc, sau do dua context cho Gemini tra loi. Buoc nang cap tiep theo la thay scoring local bang embedding + vector database nhu ChromaDB, Qdrant hoac FAISS.
