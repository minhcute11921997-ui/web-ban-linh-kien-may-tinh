import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  ImageUp,
  Loader2,
  Save,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import { createBanner, getBanners, updateBanner } from "../../api/bannerApi";
import slide1 from "../../assets/slide1.png";
import slide2 from "../../assets/slide2.png";
import slide3 from "../../assets/slide3.png";

const defaultBanners = [
  {
    position: 1,
    title: "Banner 1",
    location: "vi tri slide dau tien tren trang chu",
    image_url: null,
    is_visible: true,
    fallback: slide1,
    link: "/products/69",
  },
  {
    position: 2,
    title: "Banner 2",
    location: "vi tri slide thu hai tren trang chu",
    image_url: null,
    is_visible: true,
    fallback: slide2,
    link: "/products/48",
  },
  {
    position: 3,
    title: "Banner 3",
    location: "vi tri slide thu ba tren trang chu",
    image_url: null,
    is_visible: true,
    fallback: slide3,
    link: "/products/44",
  },
];

const resolveImage = (imageUrl, fallback) => {
  if (!imageUrl) return fallback;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return imageUrl;
};

export default function AdminBanners() {
  const [banners, setBanners] = useState(defaultBanners);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [links, setLinks] = useState({});
  const [visibilities, setVisibilities] = useState({});
  const [newBanner, setNewBanner] = useState({
    file: null,
    link: "",
    is_visible: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingPosition, setSavingPosition] = useState(null);
  const [creating, setCreating] = useState(false);

  const previews = useMemo(() => {
    return Object.fromEntries(
      Object.entries(selectedFiles).map(([position, file]) => [
        position,
        file ? URL.createObjectURL(file) : null,
      ])
    );
  }, [selectedFiles]);

  const newPreview = useMemo(() => {
    return newBanner.file ? URL.createObjectURL(newBanner.file) : null;
  }, [newBanner.file]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [previews]);

  useEffect(() => {
    return () => {
      if (newPreview) URL.revokeObjectURL(newPreview);
    };
  }, [newPreview]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const res = await getBanners();
      const apiBanners = res.data.data || [];
      const apiByPosition = new Map(
        apiBanners.map((banner) => [Number(banner.position), banner])
      );
      const positions = [
        ...new Set([
          ...defaultBanners.map((banner) => banner.position),
          ...apiBanners.map((banner) => Number(banner.position)),
        ]),
      ].sort((a, b) => a - b);

      const nextBanners = positions.map((position) => {
        const defaultBanner = defaultBanners.find(
          (banner) => banner.position === position
        );
        const apiBanner = apiByPosition.get(position);

        return {
          position,
          title: defaultBanner?.title || `Banner ${position}`,
          location:
            defaultBanner?.location || `vi tri slide ${position} tren trang chu`,
          image_url: apiBanner?.image_url || defaultBanner?.image_url || null,
          link: apiBanner?.link || defaultBanner?.link || "",
          is_visible:
            typeof apiBanner?.is_visible === "boolean"
              ? apiBanner.is_visible
              : true,
          fallback: defaultBanner?.fallback || null,
          updated_at: apiBanner?.updated_at || null,
        };
      });

      setBanners(nextBanners);
      setLinks(
        Object.fromEntries(
          nextBanners.map((banner) => [banner.position, banner.link || ""])
        )
      );
      setVisibilities(
        Object.fromEntries(
          nextBanners.map((banner) => [banner.position, banner.is_visible])
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Khong the tai danh sach banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleFileChange = (position, file) => {
    setSelectedFiles((prev) => ({ ...prev, [position]: file || null }));
  };

  const handleCreateBanner = async () => {
    if (!newBanner.file) {
      toast.error("Vui long chon anh banner");
      return;
    }

    const formData = new FormData();
    formData.append("image", newBanner.file);
    formData.append("link", newBanner.link || "");
    formData.append("is_visible", newBanner.is_visible ? "true" : "false");

    try {
      setCreating(true);
      await createBanner(formData);
      toast.success("Da them banner moi");
      setNewBanner({ file: null, link: "", is_visible: true });
      await loadBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Khong the them banner");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (banner) => {
    const formData = new FormData();
    const file = selectedFiles[banner.position];

    if (file) formData.append("image", file);
    formData.append("link", links[banner.position] || "");
    formData.append(
      "is_visible",
      visibilities[banner.position] === false ? "false" : "true"
    );

    try {
      setSavingPosition(banner.position);
      await updateBanner(banner.position, formData);
      toast.success(`Da cap nhat ${banner.title} - ${banner.location}`);
      setSelectedFiles((prev) => ({ ...prev, [banner.position]: null }));
      await loadBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Khong the cap nhat banner");
    } finally {
      setSavingPosition(null);
    }
  };

  const handleToggleVisibility = async (banner) => {
    const nextVisible = !(visibilities[banner.position] ?? true);
    const formData = new FormData();
    formData.append("link", links[banner.position] || "");
    formData.append("is_visible", nextVisible ? "true" : "false");

    try {
      setSavingPosition(banner.position);
      await updateBanner(banner.position, formData);
      toast.success(
        nextVisible
          ? `Da hien ${banner.title} tren trang chu`
          : `Da an ${banner.title} khoi trang chu`
      );
      await loadBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Khong the cap nhat banner");
    } finally {
      setSavingPosition(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quan ly banner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chon anh trong may de thay dung vi tri banner dang hien thi tren trang chu.
        </p>
      </div>

      <section className="bg-white border border-gray-100 rounded-lg shadow-sm p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Them banner moi</h2>
            <p className="text-xs text-gray-500 mt-1">
              Banner moi se duoc them vao cuoi slider trang chu.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
            Vi tri ke tiep
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,380px)_1fr] gap-4">
          <div className="aspect-[16/7] bg-gray-100 rounded-md overflow-hidden border border-gray-100 flex items-center justify-center">
            {newPreview ? (
              <img
                src={newPreview}
                alt="Banner moi preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 text-sm">
                <ImagePlus size={28} />
                Chua chon anh
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Anh banner moi
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) =>
                  setNewBanner((prev) => ({
                    ...prev,
                    file: event.target.files?.[0] || null,
                  }))
                }
                className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Link khi bam vao banner
              </span>
              <div className="mt-2 relative">
                <ExternalLink
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={newBanner.link}
                  onChange={(event) =>
                    setNewBanner((prev) => ({
                      ...prev,
                      link: event.target.value,
                    }))
                  }
                  placeholder="/products/69"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={newBanner.is_visible}
                onChange={(event) =>
                  setNewBanner((prev) => ({
                    ...prev,
                    is_visible: event.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Hien banner sau khi them
            </label>

            <button
              type="button"
              onClick={handleCreateBanner}
              disabled={creating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImagePlus size={16} />
              )}
              Them banner
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 bg-white border border-gray-100 rounded-lg p-5">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          Dang tai banner...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {banners.map((banner) => {
            const preview = previews[banner.position];
            const imageSrc =
              preview || resolveImage(banner.image_url, banner.fallback);
            const isSaving = savingPosition === banner.position;
            const isVisible = visibilities[banner.position] !== false;

            return (
              <section
                key={banner.position}
                className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-gray-800">
                        {banner.title}
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Se thay: {banner.location}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        Vi tri {banner.position}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          isVisible
                            ? "text-green-700 bg-green-50"
                            : "text-gray-600 bg-gray-100"
                        }`}
                      >
                        {isVisible ? "Dang hien" : "Dang an"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="aspect-[16/7] bg-gray-100 rounded-md overflow-hidden border border-gray-100 relative">
                    <img
                      src={imageSrc}
                      alt={`${banner.title} preview`}
                      className={`w-full h-full object-cover ${
                        isVisible ? "" : "opacity-45 grayscale"
                      }`}
                    />
                    {!isVisible && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/25 text-white text-sm font-semibold">
                        Banner dang bi an
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(banner)}
                    disabled={isSaving}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      isVisible
                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isVisible ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                    {isVisible ? "An banner" : "Hien banner"}
                  </button>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Chon tep anh thay cho {banner.title}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) =>
                        handleFileChange(
                          banner.position,
                          event.target.files?.[0] || null
                        )
                      }
                      className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Link khi bam vao banner
                    </span>
                    <div className="mt-2 relative">
                      <ExternalLink
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={links[banner.position] || ""}
                        onChange={(event) =>
                          setLinks((prev) => ({
                            ...prev,
                            [banner.position]: event.target.value,
                          }))
                        }
                        placeholder="/products/69"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleSave(banner)}
                    disabled={isSaving}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Luu thay doi
                  </button>

                  <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                    <ImageUp size={14} className="mt-0.5 text-blue-500" />
                    Anh ban chon se thay {banner.title} tai {banner.location}.
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
