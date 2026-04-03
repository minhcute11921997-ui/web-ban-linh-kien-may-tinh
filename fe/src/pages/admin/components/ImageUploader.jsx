import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, Upload, ImageUp, Loader2, X } from "lucide-react";

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

      {/* Tab switch */}
      <div className="flex gap-2 mb-3">
        {[
          { key: "url",   label: "URL hình ảnh", icon: <Link size={12} /> },
          { key: "local", label: "Upload từ máy", icon: <Upload size={12} /> },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab URL */}
      {tab === "url" ? (
        <div className="relative">
          <Link size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            placeholder="https://example.com/image.jpg"
            value={value}
            onChange={handleUrlChange}
            className="w-full border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : (
        // Tab Upload
        <div
          onClick={() => fileRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors ${
            uploading
              ? "border-blue-300 bg-blue-50"
              : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-blue-500 animate-spin" />
              <p className="text-blue-500 text-sm font-medium">Đang upload...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageUp size={28} className="text-gray-300" />
              <p className="text-sm text-gray-500">Nhấn để chọn ảnh từ máy tính</p>
              <p className="text-xs text-gray-400">
                JPG, PNG, WebP, GIF · Tối đa 5MB
              </p>
            </div>
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

      {/* Preview */}
      {preview && (
        <div className="mt-3 relative w-24 h-24">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-xl border border-gray-200"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <button
            type="button"
            aria-label="Xóa ảnh"
            onClick={() => { setPreview(""); onChange(""); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
          >
            <X size={11} strokeWidth={3} />
          </button>
        </div>
      )}

    </div>
  );
};

export default ImageUploader;