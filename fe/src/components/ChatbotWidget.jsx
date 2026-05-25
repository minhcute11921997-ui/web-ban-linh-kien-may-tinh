import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { sendChatMessage } from "../api/chatbotApi";

const INITIAL_MESSAGES = [
  {
    role: "bot",
    seed: true,
    text: "Chào bạn, mình là trợ lý tư vấn sản phẩm. Bạn có thể hỏi: RAM 16GB, SSD dưới 2 triệu, sản phẩm đang sale, còn mã giảm giá không?",
  },
];

const DEFAULT_SUGGESTIONS = [
  "Sản phẩm đang sale",
  "CPU Intel dưới 5 triệu",
  "RAM 16GB còn hàng",
  "Có mã giảm giá không?",
];

const CHAT_MESSAGES_KEY = "pc_shop_chatbot_messages";
const CHAT_SUGGESTIONS_KEY = "pc_shop_chatbot_suggestions";

const formatPrice = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString("vi-VN")}đ`;

const resolveImage = (imageUrl) => {
  if (!imageUrl) return "https://placehold.co/120x120?text=No+Image";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return imageUrl;
};

const safeReadJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const sanitizeProduct = (product) => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  category_name: product.category_name,
  price: product.price,
  sale_price: product.sale_price,
  discount_percent: product.discount_percent,
  stock: product.stock,
  image_url: product.image_url,
});

const sanitizeMessage = (message) => ({
  role: message.role,
  text: message.text,
  seed: Boolean(message.seed),
  products: Array.isArray(message.products)
    ? message.products.slice(0, 8).map(sanitizeProduct)
    : [],
});

const loadMessages = () => {
  const stored = safeReadJson(CHAT_MESSAGES_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) return INITIAL_MESSAGES;

  const messages = stored
    .filter((message) => ["user", "bot"].includes(message?.role) && message?.text)
    .map(sanitizeMessage);

  return messages.length ? messages : INITIAL_MESSAGES;
};

const loadSuggestions = () => {
  const stored = safeReadJson(CHAT_SUGGESTIONS_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_SUGGESTIONS;

  const suggestions = stored.filter((item) => typeof item === "string" && item.trim());
  return suggestions.length ? suggestions : DEFAULT_SUGGESTIONS;
};

const toChatHistory = (items) =>
  items
    .filter((item) => !item.seed && item.text && (item.role === "user" || item.role === "bot"))
    .slice(-6)
    .map((item) => ({
      role: item.role === "bot" ? "assistant" : "user",
      text: item.text,
      products: (item.products || []).slice(0, 8).map(sanitizeProduct),
    }));

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(loadSuggestions);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    sessionStorage.setItem(
      CHAT_MESSAGES_KEY,
      JSON.stringify(messages.map(sanitizeMessage))
    );
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(CHAT_SUGGESTIONS_KEY, JSON.stringify(suggestions));
  }, [suggestions]);

  const handleClearChat = () => {
    sessionStorage.removeItem(CHAT_MESSAGES_KEY);
    sessionStorage.removeItem(CHAT_SUGGESTIONS_KEY);
    setMessages(INITIAL_MESSAGES);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setInput("");
  };

  const handleSend = async (messageOverride) => {
    const message = (messageOverride || input).trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      const history = toChatHistory(messages);
      const res = await sendChatMessage(message, history);
      const data = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply,
          products: data.products || [],
        },
      ]);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            error.response?.data?.message ||
            "Mình chưa đọc được dữ liệu lúc này. Bạn thử lại sau nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <section className="mb-3 w-[min(380px,calc(100vw-2rem))] h-[560px] max-h-[calc(100vh-7rem)] bg-white border border-gray-200 rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <header className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm">Trợ lý tư vấn</h2>
                <p className="text-xs text-blue-100 truncate">
                  Dữ liệu lấy từ sản phẩm trong shop
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearChat}
              className="mr-1 px-2 h-8 rounded-md hover:bg-white/15 text-xs font-medium"
            >
              Xóa chat
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-md hover:bg-white/15 flex items-center justify-center"
              aria-label="Đóng chatbot"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4 bg-gray-50 space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.products?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.products.map((product) => (
                        <Link
                          key={product.id}
                          to={`/products/${product.id}`}
                          className="flex gap-2 p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition"
                          onClick={() => setOpen(false)}
                        >
                          <img
                            src={resolveImage(product.image_url)}
                            alt={product.name}
                            className="w-14 h-14 object-contain bg-gray-100 rounded-md flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-gray-800 line-clamp-2">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {product.brand || product.category_name || "Sản phẩm"}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="font-bold text-blue-600 text-xs">
                                {formatPrice(product.sale_price)}
                              </span>
                              {product.discount_percent > 0 && (
                                <span className="text-[10px] bg-red-500 text-white px-1 rounded">
                                  -{product.discount_percent}%
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Tồn kho: {product.stock}
                            </div>
                          </div>
                          <ExternalLink
                            size={13}
                            className="text-gray-400 flex-shrink-0"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin text-blue-600" />
                  Đang đọc dữ liệu...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 pt-3 bg-white border-t border-gray-100">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium whitespace-nowrap hover:bg-blue-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 pb-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhập sản phẩm, hãng, giá cần tư vấn..."
                className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Gửi tin nhắn"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 flex items-center justify-center relative"
        aria-label="Mở chatbot"
      >
        {open ? <X size={24} /> : <MessageCircle size={25} />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 text-blue-900 flex items-center justify-center">
            <Sparkles size={13} />
          </span>
        )}
      </button>
    </div>
  );
}
