import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import sanitizeHtml from 'sanitize-html';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import reviewApi from '../api/reviewApi';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { token } = useAuthStore();
  const [product, setProduct] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch sản phẩm
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${id}`);
        const data = await res.json();
        if (data.success) setProduct(data.data);

        // Fetch thông số kỹ thuật
        const specRes = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${id}/specs`);
        const specData = await specRes.json();
        if (specData.success) setSpecs(specData.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const fetchReviews = async (page = 1) => {
    setLoadingReviews(true);
    try {
      const res = await reviewApi.getByProduct(id, page);
      if (res.data.success) {
        setReviews(res.data.data);
        setReviewStats(res.data.stats);
        setReviewPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const sanitizeComment = (text) =>
    sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!token) { toast.warning('Vui lòng đăng nhập!'); navigate('/login'); return; }
    const cleanComment = reviewForm.comment.trim();
    if (cleanComment.length < 1) {
      toast.error('Vui lòng nhập nội dung đánh giá!');
      return;
    }
    setSubmittingReview(true);
    try {
      const payload = { ...reviewForm, comment: cleanComment };
      if (editingReviewId) {
        await reviewApi.update(editingReviewId, payload);
      } else {
        await reviewApi.create({ product_id: parseInt(id), ...payload });
      }
      setShowReviewForm(false);
      setEditingReviewId(null);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews(1);
      fetchUserReview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi đánh giá thất bại!');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Xác nhận xoá đánh giá này?')) return;
    try {
      await reviewApi.delete(reviewId);
      toast.success('Đã xoá đánh giá!');
      fetchReviews(1);
      fetchUserReview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xoá thất bại!');
    }
  };

  const StarRating = ({ value, onChange, size = 'md' }) => {
    const [hovered, setHovered] = useState(0);
    const sizeClass = size === 'lg' ? 'text-3xl' : 'text-xl';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => onChange && setHovered(star)}
            onMouseLeave={() => onChange && setHovered(0)}
            className={`${sizeClass} transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'} ${star <= (hovered || value) ? 'text-yellow-400' : 'text-gray-300'
              }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const fetchUserReview = async () => {
    if (!token) return;
    try {
      const res = await reviewApi.checkUserReview(id);
      if (res.data.success) setUserReview(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReviews(reviewPage);
      fetchUserReview();
    }

  }, [id, reviewPage, token]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const handleAddToCart = async () => {
    if (!token) {
      toast.warning('Vui lòng đăng nhập để thêm giỏ hàng!');
      navigate('/login');
      return;
    }

    // Kiểm tra số lượng không vượt quá kho
    if (quantity > product.stock) {
      toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho!`);
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(product.id, quantity);
      toast.success(`Đã thêm "${product.name}" (x${quantity}) vào giỏ hàng!`);
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error?.message || 'Thêm giỏ hàng thất bại!');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!token) {
      toast.warning('Vui lòng đăng nhập để mua hàng!');
      navigate('/login');
      return;
    }

    // Kiểm tra số lượng không vượt quá kho
    if (quantity > product.stock) {
      toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho!`);
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(product.id, quantity);
      toast.success(`Đã thêm "${product.name}" (x${quantity}) vào giỏ hàng!`);
      navigate('/cart');
    } catch (error) {
      console.error('Buy now error:', error);
      toast.error(error?.message || 'Lỗi khi thêm vào giỏ hàng!');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-500">Đang tải...</div>;
  if (!product) return <div className="flex justify-center items-center min-h-screen text-gray-500">Không tìm thấy sản phẩm</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6 flex gap-1 items-center">
        <span className="cursor-pointer hover:text-blue-500" onClick={() => navigate('/')}>Trang chủ</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-blue-500" onClick={() => navigate(`/?category=${product.category_id}`)}>{product.category_name}</span>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{product.name}</span>
      </div>

      {/* Main */}
      <div className="bg-white rounded-2xl shadow-md p-8 grid grid-cols-1 md:grid-cols-2 gap-10 mb-6">
        {/* Ảnh */}
        <div className="bg-gray-50 rounded-xl overflow-hidden aspect-square">
          <img
            src={product.image_url?.startsWith('http') ? product.image_url : `/images/${product.image_url}`}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.target.src = 'https://placehold.co/400x400?text=No+Image')}
          />
        </div>

        {/* Thông tin */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{product.brand}</span>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          {product.discount_percent > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-blue-500">
                  {formatPrice(Math.round(product.price * (1 - product.discount_percent / 100)))}
                </span>
                <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-lg">
                  -{product.discount_percent}%
                </span>
              </div>
              <span className="text-gray-400 line-through text-base">
                {formatPrice(product.price)}
              </span>
            </div>
          ) : (
            <div className="text-3xl font-bold text-blue-500">{formatPrice(product.price)}</div>
          )}

          <span className={`text-sm font-medium px-3 py-1 rounded-full w-fit
            ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {product.stock > 0 ? `Còn hàng` : 'Hết hàng'}
          </span>

          {/* Số lượng */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Số lượng:</span>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-lg transition"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val === '') {
                    setQuantity('');
                  } else {
                    val = parseInt(val);
                    if (!isNaN(val)) {
                      if (val > product.stock) {
                        setQuantity(product.stock);
                      } else if (val < 1) {
                        setQuantity(1);
                      } else {
                        setQuantity(val);
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseInt(e.target.value) < 1) {
                    setQuantity(1);
                  }
                }}
                className="w-12 text-center font-semibold border-0 outline-none bg-transparent [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
              />
              <button className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-lg transition"
                onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-2">
            <button
              disabled={product.stock === 0 || addingToCart}
              onClick={handleAddToCart}
              className="flex-1 py-3 rounded-xl border-2 border-blue-500 text-blue-500 font-semibold hover:bg-blue-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
            </button>
            <button
              disabled={product.stock === 0 || addingToCart}
              onClick={handleBuyNow}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {addingToCart ? 'Đang xử lý...' : 'Mua ngay'}
            </button>
          </div>
        </div>
      </div>

      {/* BẢNG THÔNG SỐ KỸ THUẬT */}
      {specs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Thông số kỹ thuật</h2>
          <table className="w-full text-sm">
            <tbody>
              {specs.map((spec, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-4 font-medium text-gray-600 w-1/3 border-b border-gray-100">
                    {spec.spec_name}
                  </td>
                  <td className="py-3 px-4 text-gray-900 border-b border-gray-100">
                    {spec.spec_value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mô tả chi tiết */}
      {product.description && (
        <div className="bg-white rounded-2xl shadow-md p-8 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mô tả sản phẩm</h2>
          <div
            className={`text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none transition-all duration-300 ${descriptionExpanded ? 'max-h-none' : 'max-h-96 overflow-hidden'
              }`}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(product.description, {
                allowedTags: ['p', 'br', 'img', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot'],
                allowedAttributes: {
                  'img': ['src', 'alt', 'width', 'height'],
                  'a': ['href'],
                  'table': ['border'],
                  'td': ['colspan', 'rowspan'],
                  'th': ['colspan', 'rowspan'],
                }
              })
            }}
          />
          {product.description.length > 200 && (
            <button
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              className="mt-4 w-full py-2 text-blue-600 font-semibold transition flex items-center justify-center gap-2"
            >
              {descriptionExpanded ? '▲ Thu gọn' : '▼ Xem tất cả'}
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-8 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Đánh giá sản phẩm
            {reviewStats?.total_reviews > 0 && (
              <span className="ml-2 text-base font-normal text-gray-500">
                ({reviewStats.total_reviews} đánh giá)
              </span>
            )}
          </h2>
          {token && !userReview && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition"
            >
              + Viết đánh giá
            </button>
          )}
        </div>

        {/* Tổng quan sao */}
        {reviewStats?.total_reviews > 0 && (
          <div className="flex items-center gap-8 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400">{reviewStats.avg_rating}</div>
              <StarRating value={Math.round(reviewStats.avg_rating)} />
              <div className="text-xs text-gray-500 mt-1">{reviewStats.total_reviews} đánh giá</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = Number(reviewStats[`s${s}`] || 0);
                const pct = reviewStats.total_reviews > 0 ? (count / reviewStats.total_reviews) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-gray-600">{s}</span>
                    <span className="text-yellow-400 text-xs">★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 text-gray-500 text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form viết đánh giá */}
        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="mb-6 p-5 border border-blue-200 rounded-xl bg-blue-50">
            <h3 className="font-semibold text-gray-800 mb-3">
              {editingReviewId ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá của bạn'}
            </h3>
            <div className="mb-3">
              <label className="text-sm text-gray-600 mb-1 block">Số sao *</label>
              <StarRating
                value={reviewForm.rating}
                onChange={(v) => setReviewForm(f => ({ ...f, rating: v }))}
                size="lg"
              />
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-1 block">Nội dung đánh giá *</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                rows={4}
                maxLength={2000}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                required
              />
              <div className="text-right text-xs text-gray-400">{reviewForm.comment.length}/2000</div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-50"
              >
                {submittingReview ? 'Đang gửi...' : editingReviewId ? 'Cập nhật' : 'Gửi đánh giá'}
              </button>
              <button
                type="button"
                onClick={() => { setShowReviewForm(false); setEditingReviewId(null); setReviewForm({ rating: 5, comment: '' }); }}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Huỷ
              </button>
            </div>
          </form>
        )}

        {/* Đánh giá của user hiện tại (nếu đã đánh giá) */}
        {userReview && !showReviewForm && (
          <div className="mb-5 p-4 border-2 border-blue-300 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-blue-600">Đánh giá của bạn</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReviewForm({ rating: userReview.rating, comment: userReview.comment || '' });
                    setEditingReviewId(userReview.id);
                    setShowReviewForm(true);
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDeleteReview(userReview.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Xoá
                </button>
              </div>
            </div>
            <StarRating value={userReview.rating} />
            <p className="text-sm text-gray-700 mt-2">{userReview.comment}</p>
          </div>
        )}

        {/* Danh sách đánh giá */}
        {loadingReviews ? (
          <div className="text-center py-8 text-gray-400">Đang tải đánh giá...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">⭐</div>
            <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm shrink-0">
                    {review.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800">{review.full_name}</span>
                      <StarRating value={review.rating} />
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {reviewPagination?.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: reviewPagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setReviewPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${p === reviewPage
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ProductDetail;
