import { useEffect, useState } from 'react';
import { getAllUsers, updateUser, deleteUser } from '../../api/userApi';
import { toast } from 'react-toastify';

const ROLE_COLOR = {
  admin:    'bg-indigo-100 text-indigo-700',
  customer: 'bg-blue-100 text-blue-700',
  user:     'bg-gray-100 text-gray-700',
};
const ROLE_LABEL = { admin: 'Quản trị viên', customer: 'Khách hàng', user: 'Người dùng' };

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await getAllUsers(); setUsers(res.data.data || []); }
    catch { toast.error('Không thể tải danh sách người dùng!'); }
    finally { setLoading(false); }
  };

  const handleEdit = (user) => {
    setEditId(user.id);
    setEditForm({ full_name: user.full_name || '', email: user.email || '',
      phone: user.phone || '', address: user.address || '', role: user.role || 'customer' });
  };

  const handleSave = async () => {
    try { await updateUser(editId, editForm); toast.success('Cập nhật thành công!'); setEditId(null); fetchUsers(); }
    catch { toast.error('Cập nhật thất bại!'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa người dùng này?')) return;
    try { await deleteUser(id); toast.success('Đã xóa!'); fetchUsers(); }
    catch { toast.error('Xóa thất bại!'); }
  };

  if (loading)
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Đang tải...</div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h1>
        <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">{users.length} người dùng</span>
      </div>

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
                <td className="px-6 py-3 text-gray-400">{u.id}</td>
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <input value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                        className="border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none px-2 py-1 rounded-lg text-sm w-full" />
                    : <span className="font-medium text-gray-800">{u.full_name || u.username}</span>}
                </td>
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                        className="border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none px-2 py-1 rounded-lg text-sm w-full" />
                    : <span className="text-gray-600">{u.email}</span>}
                </td>
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                        className="border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none px-2 py-1 rounded-lg text-sm w-full" />
                    : <span className="text-gray-500">{u.phone || '—'}</span>}
                </td>
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                        className="border border-blue-200 focus:ring-2 focus:ring-blue-300 outline-none px-2 py-1 rounded-lg text-sm">
                        <option value="customer">Khách hàng</option>
                        <option value="admin">Admin</option>
                      </select>
                    : <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>}
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-3">
                  {editId === u.id
                    ? <div className="flex gap-2">
                        <button onClick={handleSave} className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Lưu</button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 font-medium cursor-pointer">Hủy</button>
                      </div>
                    : <div className="flex gap-3">
                        <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Sửa</button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 font-medium cursor-pointer">Xóa</button>
                      </div>}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Chưa có người dùng nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;