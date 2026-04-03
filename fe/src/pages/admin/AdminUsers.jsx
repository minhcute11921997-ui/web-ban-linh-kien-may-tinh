import { useEffect, useState } from 'react';
import { getAllUsers, updateUser, deleteUser } from '../../api/userApi';
import {
  Users,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  UserX,
  ShieldCheck,
  UserCheck,
  User,
} from 'lucide-react';

const ROLE_COLOR = {
  admin:    'bg-indigo-100 text-indigo-700',
  customer: 'bg-blue-100 text-blue-700',
  user:     'bg-gray-100 text-gray-700',
};
const ROLE_LABEL = { admin: 'Quản trị viên', customer: 'Khách hàng', user: 'Người dùng' };
const ROLE_ICON  = {
  admin:    <ShieldCheck size={11} />,
  customer: <UserCheck   size={11} />,
  user:     <User        size={11} />,
};

const inputCls = "border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none px-2 py-1 rounded-lg text-sm w-full";

const AdminUsers = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await getAllUsers(); setUsers(res.data.data || []); }
    catch { }
    finally { setLoading(false); }
  };

  const handleEdit = (user) => {
    setEditId(user.id);
    setEditForm({
      full_name: user.full_name || '', email: user.email || '',
      phone: user.phone || '', address: user.address || '',
      role: user.role || 'customer',
    });
  };

  const handleSave = async () => {
    try { await updateUser(editId, editForm); setEditId(null); fetchUsers(); }
    catch { }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa người dùng này?')) return;
    try { await deleteUser(id); fetchUsers(); }
    catch { }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="text-sm">Đang tải người dùng...</span>
      </div>
    );

  return (
    <div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Users size={24} className="text-blue-600" />
          Quản lý người dùng
        </h1>
        <span className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
          <Users size={14} />
          {users.length} người dùng
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50/60 text-gray-500">
              <th className="text-left px-6 py-3 font-medium">#</th>
              <th className="text-left px-6 py-3 font-medium">Họ tên</th>
              <th className="text-left px-6 py-3 font-medium">Email</th>
              <th className="text-left px-6 py-3 font-medium">SĐT</th>
              <th className="text-left px-6 py-3 font-medium">Role</th>
              <th className="text-left px-6 py-3 font-medium">Ngày tạo</th>
              <th className="text-left px-6 py-3 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-blue-50 hover:bg-blue-50/30 transition-colors">

                {/* ID */}
                <td className="px-6 py-3 text-gray-400">{u.id}</td>

                {/* Họ tên */}
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <input value={editForm.full_name}
                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                        className={inputCls} />
                    : <span className="font-medium text-gray-800">{u.full_name || u.username}</span>
                  }
                </td>

                {/* Email */}
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <input value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className={inputCls} />
                    : <span className="text-gray-600">{u.email}</span>
                  }
                </td>

                {/* SĐT */}
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <input value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className={inputCls} />
                    : <span className="text-gray-500">{u.phone || '—'}</span>
                  }
                </td>

                {/* Role */}
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <select value={editForm.role}
                        onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                        className="border border-blue-200 focus:ring-2 focus:ring-blue-300 outline-none px-2 py-1 rounded-lg text-sm">
                        <option value="customer">Khách hàng</option>
                        <option value="admin">Admin</option>
                      </select>
                    : <span className={`flex items-center gap-1 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_ICON[u.role]}
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                  }
                </td>

                {/* Ngày tạo */}
                <td className="px-6 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('vi-VN')}
                </td>

                {/* Thao tác */}
                <td className="px-6 py-3">
                  {editId === u.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
                      >
                        <Save size={14} /> Lưu
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 font-medium cursor-pointer transition-colors"
                      >
                        <X size={14} /> Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(u)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
                      >
                        <Pencil size={14} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {/* Empty state */}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <UserX size={32} strokeWidth={1.5} />
                    <span className="text-sm">Chưa có người dùng nào</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;