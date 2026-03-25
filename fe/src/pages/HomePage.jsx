import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getAllCategories } from "../api/categoryApi";
import useCartStore from "../store/cartStore";
import useAuthStore from "../store/authStore";
import { toast } from "react-toastify";
import ProductCard from "../components/ProductCard";
import FeaturedProductCard from "../components/FeaturedProductCard";
import FlashSaleCard from "../components/FlashSaleCard";

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
  {
    id: 1,
    title: "🔥 Siêu sale linh kiện PC",
    subtitle: "Giảm đến 30% cho CPU & VGA",
    bg: "from-blue-600 to-blue-800",
    accent: "💻",
  },
  {
    id: 2,
    title: "⚡ RAM DDR5 giá sốc",
    subtitle: "Nâng cấp hiệu năng vượt trội",
    bg: "from-purple-600 to-indigo-800",
    accent: "🚀",
  },
  {
    id: 3,
    title: "🎮 VGA RTX 40 Series",
    subtitle: "Trải nghiệm gaming đỉnh cao",
    bg: "from-green-600 to-teal-800",
    accent: "🎯",
  },
  {
    id: 4,
    title: "💾 SSD NVMe Gen4/Gen5",
    subtitle: "Tốc độ đọc ghi siêu nhanh",
    bg: "from-orange-500 to-red-700",
    accent: "⚡",
  },
  {
    id: 5,
    title: "Miễn phí vận chuyển",
    subtitle: "Cho đơn hàng từ 500K toàn quốc",
    bg: "from-pink-500 to-rose-700",
    accent: "🚚",
  },
];

const formatPrice = (v) => {
  if (v >= 1000000)
    return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + " tr";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v.toString();
};

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
  const addItem = useCartStore((state) => state.addItem);
  const token = useAuthStore((state) => state.token);
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

  // Reset state khi quay lại HomePage
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

  // Listen event reset từ Navbar
  useEffect(() => {
    const handleResetFilters = () => {
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
    window.addEventListener("resetHomeFilters", handleResetFilters);
    return () =>
      window.removeEventListener("resetHomeFilters", handleResetFilters);
  }, []);

  // Auto-slide banner
  useEffect(() => {
    if (slidePaused) return;
    slideInterval.current = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(slideInterval.current);
  }, [slidePaused]);

  // Lấy danh mục
  useEffect(() => {
    getAllCategories()
      .then((res) => {
        if (res.data.success) setCategories(res.data.data);
      })
      .catch(() => {});
  }, []);

  // Debounce giá
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMin(priceMin);
      setDebouncedMax(priceMax);
    }, 400);
    return () => clearTimeout(timer);
  }, [priceMin, priceMax]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/products/featured`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFeaturedProducts(data.data);
      })
      .catch(() => {});
  }, []);

  // Đồng hồ đếm ngược flash sale
  useEffect(() => {
    const timer = setInterval(() => {
      if (!flashSaleEndTime.current) return;
      const remaining = Math.max(0, flashSaleEndTime.current - Date.now());
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setFlashSaleTimeLeft({ h, m, s });
      if (remaining === 0) {
        setFlashSaleProducts([]);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch filter data cho 1 category
  const fetchCategoryData = (catId) => {
    const key = catId || "all";
    if (categoryBrandsMap[key]) return;
    if (key === "all") {
      fetch(
        `${import.meta.env.VITE_API_URL}/api/products?sortBy=id&sortOrder=DESC`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const uniqueBrands = [
              ...new Set(data.data.map((p) => p.brand).filter(Boolean)),
            ].sort();
            setCategoryBrandsMap((prev) => ({ ...prev, all: uniqueBrands }));
          }
        });
    } else {
      fetch(`${import.meta.env.VITE_API_URL}/api/products/filters/${catId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCategoryBrandsMap((prev) => ({
              ...prev,
              [catId]: data.data.brands,
            }));
            setCategoryFiltersMap((prev) => ({
              ...prev,
              [catId]: data.data.specs,
            }));
          }
        });
    }
  };

  // Hover handlers
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
  const handleDropdownMouseLeave = () => {
    setHoveredCategory(null);
  };

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
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setCurrentPage(1);
    setHoveredCategory(null);
  };

  //  Reset page khi filter thay đổi
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

  //  Fetch sản phẩm chính theo page
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== "all") params.append("category", activeCategory);
    if (activeBrand !== "all") params.append("brand", activeBrand);
    if (debouncedMin > MIN_PRICE) params.append("minPrice", debouncedMin);
    if (debouncedMax < MAX_PRICE) params.append("maxPrice", debouncedMax);
    if (searchQuery.trim()) params.append("search", searchQuery.trim());
    if (Object.keys(activeSubFilters).length > 0) {
      params.append("specs", JSON.stringify(activeSubFilters));
    }
    const [sortBy, sortOrder] = sortOption.split("-");
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
    params.append("limit", ITEMS_PER_PAGE);
    params.append("page", currentPage);

    fetch(`${import.meta.env.VITE_API_URL}/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
          setTotalPages(data.totalPages || 1);
          setTotalProducts(data.total || 0);
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
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setFlashSaleProducts(data.data);
          if (data.data[0].discount_expires_at) {
            flashSaleEndTime.current = new Date(
              data.data[0].discount_expires_at
            ).getTime();
          }
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
    } catch (error) {
      const errorMsg = error?.message || "Thêm giỏ hàng thất bại!";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="p-4">
      {/*Banner Slider  */}
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
            <div
              key={slide.id}
              className={`w-full flex-shrink-0 bg-gradient-to-r ${slide.bg} px-8 py-10 md:py-14 flex items-center justify-between`}
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow">
                  {slide.title}
                </h2>
                <p className="text-white/80 text-sm md:text-base">
                  {slide.subtitle}
                </p>
              </div>
              <span className="text-5xl md:text-7xl opacity-80 drop-shadow-lg">
                {slide.accent}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setSlideIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          ‹
        </button>
        <button
          onClick={() => setSlideIndex((prev) => (prev + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          ›
        </button>
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

      {/*Section: Sản phẩm nổi bật*/}
      {featuredProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-800">
              Sản phẩm nổi bật
            </h2>
          </div>

          <div className="relative group">
            <button
              onClick={() =>
                featuredRef.current?.scrollBy({
                  left: -300,
                  behavior: "smooth",
                })
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition opacity-0 group-hover:opacity-100"
            >
              ‹
            </button>

            <div
              ref={featuredRef}
              className="flex flex-row gap-3 overflow-x-auto scroll-smooth pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {featuredProducts.map((product) => (
                <FeaturedProductCard key={product.id} product={product} />
              ))}
            </div>

            <button
              onClick={() =>
                featuredRef.current?.scrollBy({ left: 300, behavior: "smooth" })
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition opacity-0 group-hover:opacity-100"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {flashSaleProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-bold text-gray-800"> Flash Sale</h2>
            <div className="flex items-center gap-1 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-lg">
              <span>{String(flashSaleTimeLeft.h).padStart(2, "0")}</span>
              <span className="animate-pulse">:</span>
              <span>{String(flashSaleTimeLeft.m).padStart(2, "0")}</span>
              <span className="animate-pulse">:</span>
              <span>{String(flashSaleTimeLeft.s).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="relative group ">
            <button
              onClick={() =>
                flashSaleRef.current?.scrollBy({
                  left: -300,
                  behavior: "smooth",
                })
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition opacity-0 group-hover:opacity-100"
            >
              ‹
            </button>
            <div
              ref={flashSaleRef}
              className="flex flex-row gap-3 overflow-x-auto scroll-smooth pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {flashSaleProducts.map((product) => (
                <FlashSaleCard key={product.id} product={product} />
              ))}
            </div>
            <button
              onClick={() =>
                flashSaleRef.current?.scrollBy({
                  left: 300,
                  behavior: "smooth",
                })
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition opacity-0 group-hover:opacity-100"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/*  Tiêu đề Danh sách sản phẩm  */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-gray-800">Danh sách sản phẩm</h2>
      </div>

      {/*  Tab danh mục + Tìm kiếm  */}
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
                    <div className="px-4 py-2 text-xs text-gray-400">
                      Đang tải...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Thanh tìm kiếm */}
        <div className="flex gap-2 items-center flex-1 max-w-sm">
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
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setSearchQuery(searchInput);
              setCurrentPage(1);
            }}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          ></button>
        </div>
      </div>

      {/* Bộ lọc giá + Sắp xếp*/}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">
              Khoảng giá:
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {formatPrice(priceMin)} — {formatPrice(priceMax)}
            </span>
          </div>
          <div
            className="relative h-6 flex items-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              const clickedValue =
                Math.round(
                  (percent * (MAX_PRICE - MIN_PRICE) + MIN_PRICE) / PRICE_STEP
                ) * PRICE_STEP;
              const clampedValue = Math.max(
                MIN_PRICE,
                Math.min(MAX_PRICE, clickedValue)
              );
              const distToMin = Math.abs(clampedValue - priceMin);
              const distToMax = Math.abs(clampedValue - priceMax);
              if (distToMin < distToMax) {
                setPriceMin(
                  Math.max(
                    MIN_PRICE,
                    Math.min(clampedValue, priceMax - PRICE_STEP)
                  )
                );
              } else {
                setPriceMax(
                  Math.min(
                    MAX_PRICE,
                    Math.max(clampedValue, priceMin + PRICE_STEP)
                  )
                );
              }
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
          <span className="text-sm font-medium text-gray-500">🔽 Sắp xếp:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/*Grid sản phẩm */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Không có sản phẩm nào</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Trước
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
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sau →
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
