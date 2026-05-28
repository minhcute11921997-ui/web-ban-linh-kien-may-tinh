# AI Lab Chat Service API Contract

Base URL:

```text
http://127.0.0.1:4001
```

Service nay dung kien truc RAG + Gemini. Frontend production khong goi truc tiep service nay; backend web goi qua adapter `/api/chatbot/message`.

## GET /health

Response 200:

```json
{
  "ok": true,
  "service": "ai-lab-chat-service",
  "architecture": "rag_with_gemini",
  "llm": {
    "enabled": true,
    "provider": "gemini",
    "model": "gemini-2.0-flash"
  },
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
  "message": "Build PC gaming khoang 15 trieu",
  "history": [
    {
      "role": "assistant",
      "text": "Minh goi y mot so VGA...",
      "products": []
    }
  ],
  "limit": 8
}
```

Fields:

- `message`: cau hoi cua nguoi dung, bat buoc.
- `history`: tuy chon, toi da 6 tin gan nhat trong phien chat hien tai.
- `limit`: tuy chon, gioi han so san pham tra ve, mac dinh `8`, toi da `20`.

Response 200:

```json
{
  "success": true,
  "latencyMs": 123,
  "question": "Build PC gaming khoang 15 trieu",
  "source": "gemini_rag",
  "reply": "Noi dung tu van...",
  "products": [
    {
      "id": 31,
      "name": "Card man hinh ...",
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
    "vectorModel": "local-hash-embedding-v1",
    "llm": {
      "enabled": true,
      "provider": "gemini",
      "model": "gemini-2.0-flash",
      "replyProvider": "gemini"
    }
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
