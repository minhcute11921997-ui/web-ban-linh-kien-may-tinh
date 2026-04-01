import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { addressApi } from '../api/addressApi';
import AddressSelector from '../components/AddressSelector';
import {
  UserCircle, Pencil, X, Save, Loader2, ShieldCheck, User,
  AtSign, Phone, MapPin, CheckCircle, AlertCircle, UserCog,
  Plus, Trash2,
} from 'lucide-react';


const emptyForm = {
  receiver: '', phone: '',
  provinceCode: '', provinceName: '',
  districtCode: '', districtName: '',
  wardCode: '', wardName: '',
  detailAddress: '', fullAddress: '',
  is_default: false,
};
  const toApiFormat = (data) => ({
  receiver:       data.receiver,
  phone:          data.phone,
  province_code:  data.provinceCode  || data.province_code,
  province_name:  data.provinceName  || data.province_name,
  district_code:  data.districtCode  || data.district_code,
  district_name:  data.districtName  || data.district_name,
  ward_code:      data.wardCode      || data.ward_code,
  ward_name:      data.wardName      || data.ward_name,
  detail_address: data.detailAddress || data.detail_address,
  full_address:   data.fullAddress   || data.full_address,
  is_default:     Boolean(data.is_default),
});

function AddressForm({ initial = emptyForm, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);

  // Khi AddressSelector thay đổi → cập nhật toàn bộ address fields vào form
  const handleAddressChange = (addrData) => {
    setForm(prev => ({
      ...prev,
      provinceCode:  addrData.provinceCode,
      provinceName:  addrData.provinceName,
      districtCode:  addrData.districtCode,
      districtName:  addrData.districtName,
      wardCode:      addrData.wardCode,
      wardName:      addrData.wardName,
      detailAddress: addrData.detailAddress,
      fullAddress:   addrData.fullAddress,
    }));
  };

  // Kiểm tra defaultValue có đủ để prefill không
  const addrDefault = initial.provinceCode ? {
    provinceCode:  initial.provinceCode,
    provinceName:  initial.provinceName,
    districtCode:  initial.districtCode,
    districtName:  initial.districtName,
    wardCode:      initial.wardCode,
    wardName:      initial.wardName,
    detailAddress: initial.detailAddress,
  } : null;

  const rowCls = "flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50";


  return (
    <div className="space-y-2 pt-2">
      {/* Tên người nhận — cùng style row */}
      <div className={rowCls}>
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500">
            <User size={16} />
          </span>
          <span className="text-sm text-gray-500">Người nhận</span>
        </div>
        <input
          value={form.receiver}
          onChange={e => setForm({ ...form, receiver: e.target.value })}
          placeholder="Nguyễn Văn A"
          className="text-sm font-semibold text-gray-800 text-right bg-white border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-52"
        />
      </div>

      {/* Số điện thoại — cùng style row */}
      <div className={rowCls}>
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-500">
            <Phone size={16} />
          </span>
          <span className="text-sm text-gray-500">Điện thoại</span>
        </div>
        <input
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          placeholder="0901 234 567"
          className="text-sm font-semibold text-gray-800 text-right bg-white border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-52"
        />
      </div>

      {/* Địa chỉ — dùng AddressSelector, key để remount khi sửa địa chỉ khác */}
      <div className="px-4 py-3 rounded-xl bg-gray-50">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-orange-500">
            <MapPin size={16} />
          </span>
          <span className="text-sm text-gray-500">Địa chỉ giao hàng</span>
        </div>
        <AddressSelector
          key={initial.provinceCode || 'new'}
          defaultValue={addrDefault}
          onChange={handleAddressChange}
        />
      </div>

      {/* Đặt mặc định — cùng style row */}
      <div className={rowCls}>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Đặt làm mặc định</span>
        </div>
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={e => setForm({ ...form, is_default: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
        />
      </div>

      {/* Nút lưu / huỷ */}
      <div className="flex justify-end gap-2 pt-2 pb-1">
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm font-medium transition-colors">
          <X size={13} /> Huỷ
        </button>
        <button onClick={() => onSave(form)} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Đang lưu...' : 'Lưu địa chỉ'}
        </button>
      </div>
    </div>
  );
}


const ProfilePage = () => {
  const { user, setUser, token } = useAuthStore();
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);

  const [addresses, setAddresses]     = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [savingAddr, setSavingAddr]   = useState(false);

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Load địa chỉ ── */
  useEffect(() => {
    if (!token) return;
    setAddrLoading(true);
    addressApi.getAll()
      .then(r => setAddresses(r.data.data || []))
      .catch(() => {})
      .finally(() => setAddrLoading(false));
  }, [token]);

  const reloadAddresses = () =>
    addressApi.getAll().then(r => setAddresses(r.data.data || []));

  /* ── Profile handlers ── */
  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/auth/profile`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser({ ...user, ...res.data.user });
      setEditing(false);
      showToast('success', 'Cập nhật thông tin thành công!');
    } catch {
      showToast('error', 'Cập nhật thất bại, thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({ full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '' });
  };

  /* ── Address handlers ── */
const handleAddAddress = async (data) => {
  const payload = toApiFormat(data);
  if (!payload.full_address?.trim() || !payload.province_code) {
    showToast('error', 'Vui lòng chọn đầy đủ tỉnh/huyện/xã và nhập số nhà');
    return;
  }
  setSavingAddr(true);
  try {
    await addressApi.create(payload); 
    await reloadAddresses();
    setShowAddForm(false);
    showToast('success', 'Thêm địa chỉ thành công!');
  } catch (err) {
    showToast('error', err.response?.data?.message || 'Thêm địa chỉ thất bại');
  } finally {
    setSavingAddr(false);
  }
};

const handleUpdateAddress = async (data) => {
  const payload = toApiFormat(data);
  if (!payload.full_address?.trim() || !payload.province_code) {
    showToast('error', 'Vui lòng chọn đầy đủ tỉnh/huyện/xã và nhập số nhà');
    return;
  }
  setSavingAddr(true);
  try {
    await addressApi.update(editingAddr.id, payload);  
    setEditingAddr(null);
    showToast('success', 'Cập nhật địa chỉ thành công!');
  } catch (err) {
    showToast('error', err.response?.data?.message || 'Cập nhật thất bại');
  } finally {
    setSavingAddr(false);
  }
};

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      await addressApi.remove(id);
      await reloadAddresses();
      showToast('success', 'Đã xóa địa chỉ');
    } catch {
      showToast('error', 'Xóa địa chỉ thất bại');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressApi.setDefault(id);
      await reloadAddresses();
      showToast('success', 'Đã đặt địa chỉ mặc định');
    } catch {
      showToast('error', 'Thao tác thất bại');
    }
  };

  /* ── Profile fields config ── */
  const profileFields = [
    { label: 'Tên đăng nhập', value: user?.username,  readOnly: true,  icon: <User     size={16} />, color: 'bg-gray-100  text-gray-400'  },
    { label: 'Họ tên',        value: form.full_name,  name: 'full_name', icon: <UserCog  size={16} />, color: 'bg-blue-50   text-blue-500'  },
    { label: 'Email',         value: form.email,      name: 'email',     icon: <AtSign   size={16} />, color: 'bg-purple-50 text-purple-500' },
    { label: 'Số điện thoại', value: form.phone,      name: 'phone',     icon: <Phone    size={16} />, color: 'bg-green-50  text-green-500' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <UserCircle size={26} className="text-blue-500" />
        Thông tin tài khoản
      </h1>

      {/* ══ CARD 1: Thông tin cá nhân ══ */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {(user?.full_name || user?.username)?.at(-1)?.toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-semibold">{user?.full_name || user?.username}</p>
              <span className="flex items-center gap-1 text-sm bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full w-fit">
                {user?.role === 'admin'
                  ? <><ShieldCheck size={12} /> Quản trị viên</>
                  : <><UserCircle  size={12} /> Khách hàng</>}
              </span>
            </div>
          </div>

          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors">
              <Pencil size={14} /> Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm font-medium transition-colors">
                <X size={14} /> Huỷ
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Đang lưu...</> : <><Save size={14} /> Lưu</>}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {profileFields.map((item) => (
            <div key={item.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  {item.icon}
                </span>
                <span className="text-sm text-gray-500">{item.label}</span>
              </div>
              {editing && !item.readOnly ? (
                <input name={item.name} value={item.value}
                  onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                  className="text-sm font-semibold text-gray-800 text-right bg-white border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-48" />
              ) : (
                <span className="text-sm font-semibold text-gray-800">{item.value || '—'}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══ CARD 2: Địa chỉ giao hàng ══ */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <MapPin size={20} className="text-blue-500" />
            Địa chỉ giao hàng
          </h2>
          {!showAddForm && !editingAddr && (
            <button onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors">
              <Plus size={14} /> Thêm địa chỉ
            </button>
          )}
        </div>

        {/* Form thêm mới */}
        {showAddForm && (
          <>
            <div className="border-t pt-3 mb-1" />
            <AddressForm
              onSave={handleAddAddress}
              onCancel={() => setShowAddForm(false)}
              saving={savingAddr}
            />
          </>
        )}

        {/* Danh sách địa chỉ */}
        {addrLoading ? (
          <div className="flex justify-center py-8 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : addresses.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-gray-400">
            <MapPin size={36} className="mx-auto mb-2 opacity-30" strokeWidth={1.5} />
            <p className="text-sm">Chưa có địa chỉ nào được lưu</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {addresses.map((addr) => (
              <div key={addr.id} className="py-4 first:pt-2">
                {editingAddr?.id === addr.id ? (
                  <AddressForm
                    initial={{
                      receiver:      addr.receiver,
                      phone:         addr.phone,
                      provinceCode:  addr.province_code,
                      provinceName:  addr.province_name,
                      districtCode:  addr.district_code,
                      districtName:  addr.district_name,
                      wardCode:      addr.ward_code,
                      wardName:      addr.ward_name,
                      detailAddress: addr.detail_address,
                      fullAddress:   addr.full_address,
                      is_default:    !!addr.is_default,
                    }}
                    onSave={handleUpdateAddress}
                    onCancel={() => setEditingAddr(null)}
                    saving={savingAddr}
                  />
                ) : (
                  <div className="space-y-2">
                    {/* Hàng: Người nhận */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500">
                          <User size={16} />
                        </span>
                        <span className="text-sm text-gray-500">Người nhận</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {addr.is_default && (
                          <span className="flex items-center gap-0.5 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                         Mặc định
                          </span>
                        )}
                        <span className="text-sm font-semibold text-gray-800">{addr.receiver}</span>
                      </div>
                    </div>

                    {/* Hàng: Điện thoại */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-500">
                          <Phone size={16} />
                        </span>
                        <span className="text-sm text-gray-500">Điện thoại</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{addr.phone}</span>
                    </div>

                    {/* Hàng: Địa chỉ đầy đủ */}
                    <div className="flex items-start justify-between px-4 py-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-orange-500">
                          <MapPin size={16} />
                        </span>
                        <span className="text-sm text-gray-500">Địa chỉ</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 text-right ml-4 max-w-[260px] leading-relaxed">
                        {addr.full_address}
                      </span>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center justify-end gap-1 px-1">
                      {!addr.is_default && (
                        <button onClick={() => handleSetDefault(addr.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
                           Đặt mặc định
                        </button>
                      )}
                      <button onClick={() => { setEditingAddr(addr); setShowAddForm(false); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Pencil size={12} /> Sửa
                      </button>
                      <button onClick={() => handleDelete(addr.id)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;