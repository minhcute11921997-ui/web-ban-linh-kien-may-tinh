# AI Lab Chat Service API Contract

Base URL:

```text
http://127.0.0.1:4001
```

## GET /health

Kiem tra service, knowledge base va vector index.

Response 200:

```json
{
  "ok": true,
  "service": "ai-lab-chat-service",
  "knowledgeBase": {
    "products": 74,
    "categories": 5,
    "activeDiscounts": 0
  },
  "vectorIndex": {
    "provider": "local",
    "model": "local-hash-embedding-v1",
    "dimensions": 512,
    "count": 74
  }
}
```

## POST /chat

Request:

```json
{
  "message": "Build PC gaming khoảng 15 triệu",
  "useGemini": true,
  "limit": 8
}
```

Response 200:

```json
{
  "success": true,
  "latencyMs": 123,
  "question": "Build PC gaming khoảng 15 triệu",
  "source": "gemini_rag",
  "reply": "Nội dung tư vấn...",
  "products": [
    {
      "id": 31,
      "name": "Card màn hình ...",
      "category_name": "VGA",
      "brand": "Inno3d",
      "price": 6090000,
      "sale_price": 6090000,
      "discount_percent": 0,
      "stock": 20,
      "image_url": "https://..."
    }
  ],
  "debug": {
    "budget": 15000000,
    "tokens": ["build", "pc", "gaming"],
    "categories": ["cpu", "ram", "ssd", "vga", "mainboard"],
    "retrievalSource": "hybrid",
    "vectorModel": "local-hash-embedding-v1"
  }
}
```

Response 400:

```json
{
  "success": false,
  "message": "Missing message"
}
```

## POST /reload

Reload knowledge base va vector index tu file trong `ai-lab/data`.

Response 200:

```json
{
  "success": true,
  "errors": [],
  "health": {}
}
```

## Integration Notes

- Web backend sau nay chi can map request hien tai `{ message }` sang `POST /chat`.
- Frontend hien tai co the dung tiep shape `{ reply, products }`.
- Khong dua `debug` ra frontend production neu khong can.
- Neu AI service loi, backend web nen fallback ve chatbot rule-based hien tai.
