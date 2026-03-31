import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ImageUploader = ({ value, onChange }) => {
  const [tab, setTab] = useState("url");
  const [preview, setPreview] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const handleUrlChange = (e) => {
    setPreview(e.target.value);
    onChange(e.target.value);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post(
        `${API_BASE}/api/products/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.data.success) {
        const fullUrl = `${API_BASE}${res.data.imageUrl}`;
        setPreview(fullUrl);
        onChange(fullUrl);
        toast.success("Upload ảnh thành công!");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload ảnh thất bại!");
      setPreview(value || "");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>

      <div className="flex gap-2 mb-3">
        {[
          { key: "url", label: "🔗 URL hình ảnh" },
          { key: "local", label: "📁 Upload từ máy" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>


      {tab === "url" ? (
        <input
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={handleUrlChange}
          className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors ${
            uploading
              ? "border-blue-300 bg-blue-50"
              : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          {uploading ? (
            <p className="text-blue-500 text-sm font-medium">⏳ Đang upload...</p>
          ) : (
            <>
              <div className="text-2xl mb-1">📷</div>
              <p className="text-sm text-gray-500">Nhấn để chọn ảnh từ máy tính</p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, WebP, GIF · Tối đa 5MB
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {preview && (
        <div className="mt-3 relative w-24 h-24">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-xl border border-gray-200"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => {
              setPreview("");
              onChange("");
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center cursor-pointer hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;