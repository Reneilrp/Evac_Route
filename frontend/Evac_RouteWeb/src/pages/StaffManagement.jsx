import { useState } from 'react';
import { UserPlus, Shield, User, X, Edit2, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('lgu_staff');
  const [status, setStatus] = useState('active');

  // Fetch staff list
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(res => res.data),
  });

  const staff = staffData?.data || [];

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: (newStaff) => api.post('/staff', newStaff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      closeModal();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to create staff member.');
    }
  });

  // Update staff mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      closeModal();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update staff member.');
    }
  });

  // Revoke staff mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to revoke staff access.');
    }
  });

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('lgu_staff');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingStaff(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Leave blank unless changing
    setRole(user.role);
    setStatus(user.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) return;

    const data = { name, email, role, status };
    if (password) data.password = password;

    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data });
    } else {
      if (!password) {
        alert('Password is required for new accounts.');
        return;
      }
      createMutation.mutate(data);
    }
  };

  const handleRevoke = (user) => {
    if (confirm(`Are you sure you want to revoke access for ${user.name}? This will log them out immediately.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage LGU operators and command center access credentials.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition shadow-sm"
        >
          <UserPlus size={18} /> Add Operator
        </button>
      </div>

      {/* Staff List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="flex h-6 w-6 relative mr-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
            </span>
            <p className="text-gray-500 font-medium">Loading operators...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-6 font-semibold">Operator Name</th>
                  <th className="py-3 px-6 font-semibold">Email</th>
                  <th className="py-3 px-6 font-semibold">Role</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                      No staff operators registered.
                    </td>
                  </tr>
                ) : (
                  staff.map(user => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-4 px-6 font-medium text-gray-800">{user.name}</td>
                      <td className="py-4 px-6 text-gray-600 text-sm">{user.email}</td>
                      <td className="py-4 px-6">
                        <span className={`flex w-fit items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          user.status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => handleRevoke(user)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-sm transition"
                        >
                          <Trash2 size={14} /> Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <User size={20} className="text-blue-500" /> 
                {editingStaff ? 'Edit Operator Details' : 'Register New Operator'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Operator Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Official Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name@lgu.gov.ph"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password {editingStaff && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required={!editingStaff}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">System Role</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                  >
                    <option value="lgu_staff">LGU Staff</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Operator Status</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
