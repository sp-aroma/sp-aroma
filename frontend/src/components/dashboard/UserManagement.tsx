import { useEffect, useState } from 'react';
import { apiGetAllUsers, apiUpdateUser, apiDeleteUser } from '../../lib/api';
import { Search, Edit, Trash2, Check, X, UserCheck, UserX, Shield } from 'lucide-react';
import { Pagination } from '../Pagination';

interface User {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  is_verified_email: boolean;
  date_joined: string;
  last_login: string | null;
}

const ITEMS_PER_PAGE = 10;

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiGetAllUsers();
      setUsers(res?.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.user_id);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
  };

  const handleSave = async (userId: number) => {
    try {
      await apiUpdateUser(userId, editForm);
      await loadUsers();
      setEditingUser(null);
      setEditForm({});
    } catch (err: any) {
      console.error('Failed to update user', err);
      alert('Error: ' + (err?.body?.detail || 'Failed to update user'));
    }
  };

  const handleDelete = async (userId: number, email: string) => {
    if (!confirm(`Delete user ${email}? This action cannot be undone.`)) return;
    try {
      await apiDeleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to delete user', err);
      alert('Error: ' + (err?.body?.detail || 'Failed to delete user'));
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name || ''} ${user.last_name || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-light tracking-widest">User Management</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading text-sm sm:text-base"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-heading"></div>
            <p className="mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 text-lg mb-2">No users found</p>
            <p className="text-sm text-gray-500">Try adjusting your search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs sm:text-sm font-medium text-gray-600 bg-gray-50">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                    {editingUser === user.user_id ? (
                    <EditRow
                      user={user}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      onSave={() => handleSave(user.user_id)}
                      onCancel={() => {
                        setEditingUser(null);
                        setEditForm({});
                      }}
                    />
                  ) : (
                    <ViewRow
                      user={user}
                      onEdit={() => handleEdit(user)}
                      onDelete={() => handleDelete(user.user_id, user.email)}
                    />
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={totalItems}
        />
      )}
    </div>
  );
};

const ViewRow = ({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <>
    <td className="py-4 pr-4">
      <div>
        <p className="font-medium text-gray-900">
          {user.first_name || user.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : 'N/A'}
        </p>
        <p className="text-sm text-gray-600">{user.email}</p>
      </div>
    </td>
    <td className="py-4 pr-4">
      <div className="flex gap-2">
        {user.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
            <UserCheck size={12} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
            <UserX size={12} />
            Inactive
          </span>
        )}
        {user.is_verified_email && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            <Check size={12} />
            Verified
          </span>
        )}
      </div>
    </td>
    <td className="py-4 pr-4">
      {user.is_superuser ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
          <Shield size={12} />
          Admin
        </span>
      ) : (
        <span className="text-sm text-gray-600">User</span>
      )}
    </td>
    <td className="py-4 pr-4">
      <p className="text-sm text-gray-600">{new Date(user.date_joined).toLocaleDateString()}</p>
    </td>
    <td className="py-4">
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit user"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete user"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </td>
  </>
);

const EditRow = ({
  user: _user,
  editForm,
  setEditForm,
  onSave,
  onCancel,
}: {
  user: User;
  editForm: Partial<User>;
  setEditForm: (form: Partial<User>) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <>
    <td className="py-4 pr-4" colSpan={2}>
      <div className="space-y-2">
        <input
          type="text"
          value={editForm.first_name || ''}
          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
          placeholder="First name"
          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
        />
        <input
          type="text"
          value={editForm.last_name || ''}
          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
          placeholder="Last name"
          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
        />
      </div>
    </td>
    <td className="py-4 pr-4" colSpan={2}>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editForm.is_active || false}
            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
            className="rounded"
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editForm.is_superuser || false}
            onChange={(e) => setEditForm({ ...editForm, is_superuser: e.target.checked })}
            className="rounded"
          />
          Admin
        </label>
      </div>
    </td>
    <td className="py-4">
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Save changes"
        >
          <Check size={16} />
        </button>
        <button
          onClick={onCancel}
          className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>
    </td>
  </>
);

export default UserManagement;
