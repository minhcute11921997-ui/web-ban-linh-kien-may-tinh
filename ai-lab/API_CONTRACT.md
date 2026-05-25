# AI Lab Chat Service API Contract

Base URL:

```text
http://127.0.0.1:4001
```

Service nay dang tach biet voi backend/frontend web chinh.

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
- `history`: tuy chon, toi da vai tin gan nhat trong phien chat hien tai. Service dung de hieu cau noi tiep nhu "cai thu 2", "re hon", "so voi con dau"; khong luu DB.
- `limit`: tuy chon, gioi han so san pham tra ve, mac dinh `8`.

Response 200:

```json
{
  "success": true,
  "latencyMs": 123,
  "question": "Build PC gaming khoang 15 trieu",
  "source": "local_rag",
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

- Hien tai service tach biet, khong sua backend/frontend web chinh.
- Web backend sau nay co the map request hien tai `{ message }` sang `POST /chat`.
- Frontend hien tai co the dung tiep shape `{ reply, products }`.
- Khong dua `debug` ra frontend production neu khong can.
- Backend web hien dung AI Lab lam nguon chatbot duy nhat; khong con fallback rule-based cu.
- Neu AI service loi, backend web tra loi loi ket noi ro rang cho frontend.
- Khong de frontend production goi truc tiep `http://127.0.0.1:4001`; hay di qua backend adapter neu tich hop.
- Du lieu la snapshot tu MySQL. Sau khi admin cap nhat catalog, chay `npm run sync` trong thu muc `ai-lab`.
