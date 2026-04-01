import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getAllCategories } from "../api/categoryApi";
import useCartStore from "../store/cartStore";
import useAuthStore from "../store/authStore";
import { toast } from "react-toastify";
import ProductCard from "../components/ProductCard";
import FeaturedProductCard from "../components/FeaturedProductCard";
import FlashSaleCard from "../components/FlashSaleCard";
import slide1 from "../assets/slide1.png";
import slide2 from "../assets/slide2.png";
import slide3 from "../assets/slide3.png";
import {
  Star,
  Zap,
  Clock,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageSearch,
} from "lucide-react";

const ITEMS_PER_PAGE = 12;
const MIN_PRICE = 0;
const MAX_PRICE = 50000000;
const PRICE_STEP = 500000;

const SORT_OPTIONS = [
  { label: "Mới nhất", value: "id-DESC" },
  { label: "Giá thấp → cao", value: "price-ASC" },
  { label: "Giá cao → thấp", value: "price-DESC" },
  { label: "Tên A → Z", value: "name-ASC" },
  { label: "Tên Z → A", value: "name-DESC" },
];

const SLIDES = [
  { id: 1, image: slide1, link: "/products/69" },
  { id: 2, image: slide2, link: "/products/48" },
  { id: 3, image: slide3, link: "/products/44" },
];

const formatPrice = (v) => {
  if (v >= 1000000)
    return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + " tr";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v.toString();
};

// Nút mũi tên dùng chung cho slider / scroll
const ArrowBtn = ({ direction, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 rounded-full bg-white shadow-md border border-gray-200
      flex items-center justify-center text-gray-600
      hover:bg-blue-600 hover:text-white transition ${className}`}
  >
    {direction === "left" ? (
      <ChevronLeft size={18} />
    ) : (
      <ChevronRight size={18} />
    )}
  </button>
);

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeBrand, setActiveBrand] = useState("all");
  const [priceMin, setPriceMin] = useState(MIN_PRICE);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  const [sortOption, setSortOption] = useState("id-DESC");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const addItem = useCartStore((s) => s.addItem);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const location = useLocation();

  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryBrandsMap, setCategoryBrandsMap] = useState({});
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [activeSubFilters, setActiveSubFilters] = useState({});
  const [slideIndex, setSlideIndex] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const slideInterval = useRef(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const featuredRef = useRef(null);
  const [categoryFiltersMap, setCategoryFiltersMap] = useState({});
  const [debouncedMin, setDebouncedMin] = useState(MIN_PRICE);
  const [debouncedMax, setDebouncedMax] = useState(MAX_PRICE);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState({
    h: 2,
    m: 7,
    s: 2,
  });
  const flashSaleRef = useRef(null);
  const flashSaleEndTime = useRef(null);

  // Reset khi quay lại HomePage
  useEffect(() => {
    setActiveCategory("all");
    setActiveBrand("all");
    setPriceMin(MIN_PRICE);
    setPriceMax(MAX_PRICE);
    setSortOption("id-DESC");
    setCurrentPage(1);
    setActiveSubFilters({});
    setSearchInput("");
    setSearchQuery("");
  }, [location.pathname]);

  // Listen reset từ Navbar
  useEffect(() => {
    const handler = () => {
      setActiveCategory("all");
      setActiveBrand("all");
      setPriceMin(MIN_PRICE);
      setPriceMax(MAX_PRICE);
      setSortOption("id-DESC");
      setCurrentPage(1);
      setActiveSubFilters({});
      setSearchInput("");
      setSearchQuery("");
    };
    window.addEventListener("resetHomeFilters", handler);
    return () => window.removeEventListener("resetHomeFilters", handler);
  }, []);

  // Auto-slide banner
  useEffect(() => {
    if (slidePaused) return;
    slideInterval.current = setInterval(
      () => setSlideIndex((p) => (p + 1) % SLIDES.length),
      4000
    );
    return () => clearInterval(slideInterval.current);
  }, [slidePaused]);

  // Danh mục
  useEffect(() => {
    getAllCategories()
      .then((res) => {
        if (res.data.success) setCategories(res.data.data);
      })
      .catch(() => {});
  }, []);

  // Debounce giá
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedMin(priceMin);
      setDebouncedMax(priceMax);
    }, 400);
    return () => clearTimeout(t);
  }, [priceMin, priceMax]);

  // Sản phẩm nổi bật
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/products/featured`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFeaturedProducts(d.data);
      })
      .catch(() => {});
  }, []);

  // Đồng hồ flash sale
  useEffect(() => {
    const t = setInterval(() => {
      if (!flashSaleEndTime.current) return;
      const rem = Math.max(0, flashSaleEndTime.current - Date.now());
      setFlashSaleTimeLeft({
        h: Math.floor(rem / 3600000),
        m: Math.floor((rem % 3600000) / 60000),
        s: Math.floor((rem % 60000) / 1000),
      });
      if (rem === 0) {
        setFlashSaleProducts([]);
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch filter data cho category
  const fetchCategoryData = (catId) => {
    const key = catId || "all";
    if (categoryBrandsMap[key]) return;
    if (key === "all") {
      fetch(
        `${import.meta.env.VITE_API_URL}/api/products?sortBy=id&sortOrder=DESC`
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const brands = [
              ...new Set(d.data.map((p) => p.brand).filter(Boolean)),
            ].sort();
            setCategoryBrandsMap((prev) => ({ ...prev, all: brands }));
          }
        });
    } else {
      fetch(`${import.meta.env.VITE_API_URL}/api/products/filters/${catId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setCategoryBrandsMap((prev) => ({
              ...prev,
              [catId]: d.data.brands,
            }));
            setCategoryFiltersMap((prev) => ({
              ...prev,
              [catId]: d.data.specs,
            }));
          }
        });
    }
  };

  const handleCategoryMouseEnter = (catId) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredCategory(catId);
    fetchCategoryData(catId);
  };
  const handleCategoryMouseLeave = () => {
    const t = setTimeout(() => setHoveredCategory(null), 200);
    setHoverTimeout(t);
  };
  const handleDropdownMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
  };
  const handleDropdownMouseLeave = () => setHoveredCategory(null);

  const handleSelectBrand = (catId, brand) => {
    setActiveCategory(catId);
    setActiveBrand(brand);
    setActiveSubFilters({});
    setHoveredCategory(null);
  };
  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setActiveBrand("all");
    setActiveSubFilters({});
    setHoveredCategory(null);
  };
  const toggleSubFilter = (catId, key, value) => {
    setActiveCategory(catId);
    setActiveSubFilters((prev) => {
      if (prev[key] === value) {
        const n = { ...prev };
        delete n[key];
        return n;
      }
      return { ...prev, [key]: value };
    });
    setCurrentPage(1);
    setHoveredCategory(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeCategory,
    activeBrand,
    debouncedMin,
    debouncedMax,
    sortOption,
    activeSubFilters,
    searchQuery,
  ]);

  // Fetch sản phẩm chính
  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (activeCategory !== "all") p.append("category", activeCategory);
    if (activeBrand !== "all") p.append("brand", activeBrand);
    if (debouncedMin > MIN_PRICE) p.append("minPrice", debouncedMin);
    if (debouncedMax < MAX_PRICE) p.append("maxPrice", debouncedMax);
    if (searchQuery.trim()) p.append("search", searchQuery.trim());
    if (Object.keys(activeSubFilters).length > 0)
      p.append("specs", JSON.stringify(activeSubFilters));
    const [sortBy, sortOrder] = sortOption.split("-");
    p.append("sortBy", sortBy);
    p.append("sortOrder", sortOrder);
    p.append("limit", ITEMS_PER_PAGE);
    p.append("page", currentPage);

    fetch(`${import.meta.env.VITE_API_URL}/api/products?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.data);
          setTotalPages(d.totalPages || 1);
          setTotalProducts(d.total || 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [
    activeCategory,
    activeBrand,
    debouncedMin,
    debouncedMax,
    sortOption,
    activeSubFilters,
    searchQuery,
    currentPage,
  ]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/products/on-sale`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.length > 0) {
          setFlashSaleProducts(d.data);
          if (d.data[0].discount_expires_at)
            flashSaleEndTime.current = new Date(
              d.data[0].discount_expires_at
            ).getTime();
        }
      })
      .catch(() => {});
  }, []);

  const handleAddToCart = async (product) => {
    if (!token) {
      toast.warning("Vui lòng đăng nhập để thêm giỏ hàng!");
      navigate("/login");
      return;
    }
    try {
      await addItem(product.id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err) {
      toast.error(err?.message || "Thêm giỏ hàng thất bại!");
    }
  };

  return (
    <div className="p-4">
      {/* ── Banner Slider ── */}
      <div
        className="relative mb-5 rounded-2xl overflow-hidden select-none"
        onMouseEnter={() => setSlidePaused(true)}
        onMouseLeave={() => setSlidePaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          {SLIDES.map((slide) => (
            <Link
              key={slide.id}
              to={slide.link || "/"}
              className="w-full flex-shrink-0 relative block"
              style={{ height: "400px" }}
            >
              <img
                src={slide.image}
                alt={`Slide ${slide.id}`}
                className="w-full h-full object-cover"
              />
            </Link>
          ))}
        </div>

        {/* Mũi tên slider */}
        <button
          onClick={() =>
            setSlideIndex((p) => (p - 1 + SLIDES.length) % SLIDES.length)
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setSlideIndex((p) => (p + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          <ChevronRight size={20} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slideIndex
                  ? "w-6 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Sản phẩm nổi bật ── */}
      {featuredProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} className="text-yellow-400 fill-yellow-400" />
            <h2 className="text-lg font-bold text-gray-800">
              Sản phẩm nổi bật
            </h2>
          </div>
          <div className="relative group">
            <ArrowBtn
              direction="left"
              onClick={() =>
                featuredRef.current?.scrollBy({
                  left: -300,
                  behavior: "smooth",
                })
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100"
            />
            <div
              ref={featuredRef}
              className="flex flex-row gap-3 overflow-x-auto scroll-smooth pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {featuredProducts.map((p) => (
                <FeaturedProductCard key={p.id} product={p} />
              ))}
            </div>
            <ArrowBtn
              direction="right"
              onClick={() =>
                featuredRef.current?.scrollBy({ left: 300, behavior: "smooth" })
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100"
            />
          </div>
        </div>
      )}

      {/* ── Flash Sale ── */}
      {flashSaleProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Zap size={18} className="text-yellow-500 fill-yellow-400" />
            <h2 className="text-lg font-bold text-gray-800">Flash Sale</h2>
            <div className="flex items-center gap-1 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-lg">
              <Clock size={12} className="text-yellow-400" />
              <span>{String(flashSaleTimeLeft.h).padStart(2, "0")}</span>
              <span className="animate-pulse">:</span>
              <span>{String(flashSaleTimeLeft.m).padStart(2, "0")}</span>
              <span className="animate-pulse">:</span>
              <span>{String(flashSaleTimeLeft.s).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="relative group">
            <ArrowBtn
              direction="left"
              onClick={() =>
                flashSaleRef.current?.scrollBy({
                  left: -300,
                  behavior: "smooth",
                })
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100"
            />
            <div
              ref={flashSaleRef}
              className="flex flex-row gap-3 overflow-x-auto scroll-smooth pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {flashSaleProducts.map((p) => (
                <FlashSaleCard key={p.id} product={p} />
              ))}
            </div>
            <ArrowBtn
              direction="right"
              onClick={() =>
                flashSaleRef.current?.scrollBy({
                  left: 300,
                  behavior: "smooth",
                })
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100"
            />
          </div>
        </div>
      )}

      {/* ── Tiêu đề danh sách ── */}
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid size={18} className="text-blue-500" />
        <h2 className="text-lg font-bold text-gray-800">Danh sách sản phẩm</h2>
      </div>

      {/* ── Tab danh mục + Tìm kiếm ── */}
      <div className="flex gap-2 flex-wrap mb-4 items-center justify-between bg-white py-3 -mx-4 px-4 shadow-sm">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => handleSelectCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tất cả
          </button>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => handleCategoryMouseEnter(cat.id)}
              onMouseLeave={handleCategoryMouseLeave}
            >
              <button
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.name} ▾
              </button>

              {hoveredCategory === cat.id && (
                <div
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                  className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 min-w-[220px] max-h-[450px] overflow-y-auto"
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Hãng sản xuất
                  </div>
                  <button
                    onClick={() => handleSelectBrand(cat.id, "all")}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeCategory === cat.id && activeBrand === "all"
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    Tất cả {cat.name}
                  </button>
                  {(categoryBrandsMap[cat.id] || []).map((brand) => (
                    <button
                      key={brand}
                      onClick={() => handleSelectBrand(cat.id, brand)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        activeCategory === cat.id && activeBrand === brand
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}

                  {(() => {
                    const specs = categoryFiltersMap[cat.id];
                    if (!specs) return null;
                    return Object.entries(specs).map(([specName, values]) => (
                      <div key={specName}>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {specName}
                        </div>
                        {values.map((v) => (
                          <button
                            key={v.value}
                            onClick={() =>
                              toggleSubFilter(cat.id, specName, v.value)
                            }
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              activeCategory === cat.id &&
                              activeSubFilters[specName] === v.value
                                ? "bg-blue-50 text-blue-600 font-medium"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                          >
                            {v.value}{" "}
                            <span className="text-gray-400 text-xs">
                              ({v.count})
                            </span>
                          </button>
                        ))}
                      </div>
                    ));
                  })()}

                  {!categoryBrandsMap[cat.id] && (
                    <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" /> Đang tải...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Thanh tìm kiếm */}
        <div className="flex gap-2 items-center flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery(searchInput);
                  setCurrentPage(1);
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery(searchInput);
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Search size={14} /> Tìm
          </button>
        </div>
      </div>

      {/* ── Bộ lọc giá + Sắp xếp ── */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <SlidersHorizontal size={14} className="text-blue-500" /> Khoảng
              giá:
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {formatPrice(priceMin)} — {formatPrice(priceMax)}
            </span>
          </div>
          <div
            className="relative h-6 flex items-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              const val =
                Math.round(
                  (pct * (MAX_PRICE - MIN_PRICE) + MIN_PRICE) / PRICE_STEP
                ) * PRICE_STEP;
              const cval = Math.max(MIN_PRICE, Math.min(MAX_PRICE, val));
              if (Math.abs(cval - priceMin) < Math.abs(cval - priceMax))
                setPriceMin(
                  Math.max(MIN_PRICE, Math.min(cval, priceMax - PRICE_STEP))
                );
              else
                setPriceMax(
                  Math.min(MAX_PRICE, Math.max(cval, priceMin + PRICE_STEP))
                );
            }}
          >
            <div className="absolute w-full h-1.5 bg-gray-200 rounded-full cursor-pointer" />
            <div
              className="absolute h-1.5 bg-blue-500 rounded-full"
              style={{
                left: `${
                  ((priceMin - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100
                }%`,
                right: `${
                  100 - ((priceMax - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100
                }%`,
              }}
            />
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={PRICE_STEP}
              value={priceMin}
              onChange={(e) =>
                setPriceMin(
                  Math.max(
                    MIN_PRICE,
                    Math.min(Number(e.target.value), priceMax - PRICE_STEP)
                  )
                )
              }
              className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={PRICE_STEP}
              value={priceMax}
              onChange={(e) =>
                setPriceMax(
                  Math.min(
                    MAX_PRICE,
                    Math.max(Number(e.target.value), priceMin + PRICE_STEP)
                  )
                )
              }
              className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
          </div>
          <div className="flex gap-1.5 mt-2">
            {[
              { label: "Tất cả", min: MIN_PRICE, max: MAX_PRICE },
              { label: "< 2tr", min: MIN_PRICE, max: 2000000 },
              { label: "2-5tr", min: 2000000, max: 5000000 },
              { label: "5-10tr", min: 5000000, max: 10000000 },
              { label: "10-20tr", min: 10000000, max: 20000000 },
              { label: "> 20tr", min: 20000000, max: MAX_PRICE },
            ].map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setPriceMin(r.min);
                  setPriceMax(r.max);
                }}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  priceMin === r.min && priceMax === r.max
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-500 hover:bg-blue-50 border border-gray-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <ArrowUpDown size={14} className="text-blue-500" /> Sắp xếp:
          </span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Grid sản phẩm ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm">Đang tải sản phẩm...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <PackageSearch size={48} strokeWidth={1.5} />
          <p className="text-sm">Không có sản phẩm nào</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} /> Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sau <ChevronRight size={15} />
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-2">
            Trang {currentPage}/{totalPages} • {totalProducts} sản phẩm
          </p>
        </>
      )}
    </div>
  );
}
