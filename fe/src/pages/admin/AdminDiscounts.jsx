import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    adminGetAllDiscounts,
    adminCreateDiscount,
    adminUpdateDiscount,
    adminDeleteDiscount,
} from '../../api/discountApi';
import {
    Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight,
    X, Check, AlertCircle, Gift
} from 'lucide-react';

const EMPTY_FORM = {
    code: '', type: 'percent', value: '', description: '',
    min_order_value: '', max_uses: '', max_per_user: '', expires_at: '',
};

const fmt = (n) => Number(n).toLocaleString('vi-VN');

const statusBadge = (row) => {
    if (!row.active) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Tắt</span>;
    if (row.expires_at && new Date(row.expires_at) < new Date())
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Hết hạn</span>;
    if (row.max_uses !== null && row.used_count >= row.max_uses)
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">Hết lượt</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Đang hoạt động</span>;
};

export default function AdminDiscounts() {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null); // null = tạo mới
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // id cần xóa

    const fetchAll = async () => {
        try {
            setLoading(true);
            const res = await adminGetAllDiscounts();
            setDiscounts(res.data.data);
        } catch {
            toast.error('Không thể tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const openCreate = () => {
        setEditItem(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({
            code: item.code,
            type: item.type,
            value: item.value,
            description: item.description || '',
            min_order_value: item.min_order_value || '',
            max_uses: item.max_uses ?? '',
            max_per_user: item.max_per_user ?? '',
            expires_at: item.expires_at
                ? new Date(item.expires_at).toISOString().slice(0, 16)
                : '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                code: form.code.toUpperCase().trim(),
                value: Number(form.value),
                min_order_value: form.min_order_value ? Number(form.min_order_value) : 0,
                max_uses: form.max_uses ? Number(form.max_uses) : null,
                expires_at: form.expires_at || null,
            };

            if (editItem) {
                await adminUpdateDiscount(editItem.id, payload);
                toast.success('Cập nhật mã giảm giá thành công!');
            } else {
                await adminCreateDiscount(payload);
                toast.success('Tạo mã giảm giá thành công!');
            }
            setShowModal(false);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (item) => {
        try {
            await adminUpdateDiscount(item.id, { active: item.active ? 0 : 1 });
            toast.success(item.active ? 'Đã tắt mã giảm giá' : 'Đã bật mã giảm giá');
            fetchAll();
        } catch {
            toast.error('Không thể cập nhật trạng thái');
        }
    };

    const handleDelete = async (id) => {
        try {
            await adminDeleteDiscount(id);
            toast.success('Đã xóa mã giảm giá');
            setDeleteConfirm(null);
            fetchAll();
        } catch {
            toast.error('Không thể xóa mã giảm giá');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Gift size={22} className="text-blue-600" />
                        Quản lý Mã Giảm Giá
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Tổng: {discounts.length} mã &nbsp;|&nbsp;
                        Đang hoạt động: {discounts.filter(d => d.active && (!d.expires_at || new Date(d.expires_at) > new Date()) && (d.max_uses === null || d.used_count < d.max_uses)).length} mã
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                    <Plus size={16} /> Tạo mã mới
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">Đang tải...</div>
                ) : discounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                        <Tag size={36} className="opacity-30" />
                        <p>Chưa có mã giảm giá nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã</th>
                                    <th className="px-4 py-3 text-left">Loại</th>
                                    <th className="px-4 py-3 text-left">Giá trị</th>
                                    <th className="px-4 py-3 text-left">Đơn tối thiểu</th>
                                    <th className="px-4 py-3 text-left">Đã dùng / Tối đa</th>
                                    <th className="px-4 py-3 text-left">Hết hạn</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {discounts.map((d) => (
                                    <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg text-xs tracking-wider">
                                                {d.code}
                                            </span>
                                            {d.description && (
                                                <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[140px]">{d.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.type === 'percent' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {d.type === 'percent' ? '% Phần trăm' : '₫ Cố định'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">
                                            {d.type === 'percent' ? `${d.value}%` : `${fmt(d.value)}₫`}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {d.min_order_value > 0 ? `${fmt(d.min_order_value)}₫` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className={d.max_uses !== null && d.used_count >= d.max_uses ? 'text-red-500 font-medium' : ''}>
                                                {d.used_count}
                                            </span>
                                            {' / '}
                                            {d.max_uses ?? '∞'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {d.expires_at
                                                ? new Date(d.expires_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(d)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Toggle active */}
                                                <button
                                                    onClick={() => handleToggleActive(d)}
                                                    title={d.active ? 'Tắt mã' : 'Bật mã'}
                                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${d.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                >
                                                    {d.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </button>
                                                {/* Edit */}
                                                <button
                                                    onClick={() => openEdit(d)}
                                                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => setDeleteConfirm(d.id)}
                                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal Tạo / Sửa ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                                <Tag size={18} className="text-blue-600" />
                                {editItem ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                            {/* Code */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                    Mã giảm giá <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={!!editItem}
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    placeholder="Ví dụ: SUMMER2025"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
                                />
                                {editItem && <p className="text-xs text-gray-400 mt-0.5">Mã không thể thay đổi sau khi tạo</p>}
                            </div>

                            {/* Type + Value */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                        Loại giảm giá <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    >
                                        <option value="percent">% Phần trăm</option>
                                        <option value="fixed">₫ Số tiền cố định</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                        Giá trị <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            max={form.type === 'percent' ? 100 : undefined}
                                            value={form.value}
                                            onChange={e => setForm({ ...form, value: e.target.value })}
                                            placeholder={form.type === 'percent' ? '10' : '50000'}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                                            {form.type === 'percent' ? '%' : '₫'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                    Mô tả
                                </label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Ví dụ: Giảm 10% cho đơn hàng mùa hè"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                            </div>

                            {/* Min order + Max uses */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                        Đơn hàng tối thiểu (₫)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.min_order_value}
                                        onChange={e => setForm({ ...form, min_order_value: e.target.value })}
                                        placeholder="0"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                            Tổng lượt (toàn hệ thống)
                                        </label>
                                        <input
                                            type="number" min={1}
                                            value={form.max_uses}
                                            onChange={e => setForm({ ...form, max_uses: e.target.value })}
                                            placeholder="Không giới hạn"
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        />

                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                            Lượt / mỗi tài khoản
                                        </label>
                                        <input
                                            type="number" min={1}
                                            value={form.max_per_user}
                                            onChange={e => setForm({ ...form, max_per_user: e.target.value })}
                                            placeholder="Không giới hạn"
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        />

                                    </div>
                                </div>
                            </div>

                            {/* Expires at */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                                    Ngày hết hạn
                                </label>
                                <input
                                    type="datetime-local"
                                    value={form.expires_at}
                                    onChange={e => setForm({ ...form, expires_at: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                            </div>

                            {/* Preview */}
                            {form.value && (
                                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold font-mono">{form.code || 'MÃ'}</span>
                                        {' — '}
                                        Giảm <strong>{form.type === 'percent' ? `${form.value}%` : `${fmt(form.value)}₫`}</strong>
                                        {form.min_order_value > 0 && ` cho đơn từ ${fmt(form.min_order_value)}₫`}
                                        {form.expires_at && ` — HSD: ${new Date(form.expires_at).toLocaleDateString('vi-VN')}`}
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                                >
                                    <Check size={16} />
                                    {submitting ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Tạo mã'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/*Modal Xác nhận xóa */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                            <Trash2 size={22} className="text-red-500" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-base mb-1">Xóa mã giảm giá?</h3>
                        <p className="text-gray-500 text-sm mb-5">
                            Hành động này không thể hoàn tác. Mã giảm giá sẽ bị xóa vĩnh viễn.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}