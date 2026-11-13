import { useState, useEffect } from 'react';
import { 
  UserPlus, Shield, User, X, Edit2, Trash2, 
  LifeBuoy, QrCode, Package, Building2, Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/toast';
import StaffFormModal from '../../components/staff/modals/StaffFormModal';
import StaffDetailsModal from '../../components/staff/modals/StaffDetailsModal';
import { useAuth } from '../../context/AuthContext';

const OPERATOR_TYPES = [
  {
    id: 'rescue',
    label: 'Rescue Field Operator',
    description: 'Field Search & Rescue crew with assigned vehicle / medic unit',
    icon: LifeBuoy,
    role: 'lgu_staff',
    color: 'rose',
    badgeCls: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
  },
  {
    id: 'scanner',
    label: 'Shelter Scanner Unit',
    description: 'Mobile QR check-in & ration intake gate marshal',
    icon: QrCode,
    role: 'lgu_staff',
    color: 'emerald',
    badgeCls: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
  },
  {
    id: 'logistics',
    label: 'CSWDO Logistics Officer',
    description: 'Warehouse stock, ration packing & buffer dispatch',
    icon: Package,
    role: 'lgu_staff',
    color: 'amber',
    badgeCls: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
  },
  {
    id: 'cdrrmo',
    label: 'CDRRMO Tactical Director',
    description: 'Disaster command, hazard zoning, proactive alerts & rescue fleet oversight',
    icon: Building2,
    role: 'admin',
    color: 'blue',
    badgeCls: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
  },
  {
    id: 'admin',
    label: 'System Admin (DevOps / IT)',
    description: 'Technical infrastructure, server uptime, API health & audit monitoring',
    icon: Shield,
    role: 'admin',
    color: 'purple',
    badgeCls: 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50'
  },
];

import { RESCUE_ROLES } from '../../config/staffRoles';
export { RESCUE_ROLES };

const CDRRMO_ROLES = ['rescue', 'cdrrmo'];
const CSWDO_ROLES = ['logistics', 'scanner'];
const REGISTRABLE_OPERATOR_TYPES = OPERATOR_TYPES.filter(type => type.id !== 'admin' && type.id !== 'cdrrmo');

export default function StaffManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [revokeConfirmUser, setRevokeConfirmUser] = useState(null);

  const isSuperAdmin = (currentUser?.email?.toLowerCase() === 'admin@lgu.gov.ph') || (currentUser?.role === 'admin' && currentUser?.operator_type === 'admin' && !currentUser?.email?.toLowerCase().includes('drrm'));
  const isCswdoStaff = !isSuperAdmin && (currentUser?.operator_type === 'logistics' || currentUser?.operator_type === 'scanner' || (currentUser?.email?.toLowerCase().includes('logistics') || currentUser?.email?.toLowerCase().includes('cswdo')));
  const agencyScope = isSuperAdmin ? 'all' : (isCswdoStaff ? 'cswdo' : 'cdrmo');

  const [filterType, setFilterType] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [operatorType, setOperatorType] = useState('rescue');
  const [status, setStatus] = useState('active');

  // Dynamic Rescue Unit fields (when operatorType === 'rescue')
  const [rescueMode, setRescueMode] = useState('existing'); // 'existing' | 'new'
  const [rescueRole, setRescueRole] = useState('boat_pilot');
  const [rescueUnitName, setRescueUnitName] = useState('');
  const [rescueCallSign, setRescueCallSign] = useState('');
  const [rescueUnitType, setRescueUnitType] = useState('water_rescue');
  const [rescueCapacity, setRescueCapacity] = useState(8);
  const [rescueContact, setRescueContact] = useState('');
  const [existingRescueUnitId, setExistingRescueUnitId] = useState('');

  // Dynamic Shelter Scanner field (when operatorType === 'scanner')
  const [assignedShelterId, setAssignedShelterId] = useState('');

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) closeModal();
        if (viewingStaff) setViewingStaff(null);
        if (revokeConfirmUser) setRevokeConfirmUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, viewingStaff, revokeConfirmUser]);

  // Fetch staff list
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(res => res.data),
  });

  // Fetch rescue units (to link existing if needed)
  const { data: rescueUnitsData } = useQuery({
    queryKey: ['rescue-units'],
    queryFn: () => api.get('/rescue/units').then(res => res.data.data),
  });

  // Fetch evacuation shelters (for shelter scanner assignment)
  const { data: sheltersData } = useQuery({
    queryKey: ['shelters-all'],
    queryFn: () => api.get('/shelters').then(res => res.data.data || res.data || []),
  });

  const staff = staffData?.data || [];
  const rescueUnits = rescueUnitsData || [];
  const shelters = Array.isArray(sheltersData) ? sheltersData : [];

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: (newStaff) => api.post('/staff', newStaff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      closeModal();
      showSuccess('Staff operator registered successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to register staff member.');
    }
  });

  // Update staff mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      closeModal();
      showSuccess('Staff operator updated successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to update staff member.');
    }
  });

  // Revoke staff mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      showSuccess('Staff operator access revoked successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to revoke staff access.');
    }
  });

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPassword('');
    const defaultOpType = agencyScope === 'cswdo' ? 'logistics' : 'rescue';
    setOperatorType(defaultOpType);
    setStatus('active');
    setRescueMode('existing');
    setRescueRole('boat_pilot');
    setRescueUnitName('');
    setRescueCallSign('');
    setRescueUnitType('water_rescue');
    setRescueCapacity(8);
    setRescueContact('');
    setExistingRescueUnitId(rescueUnits[0]?.id ? String(rescueUnits[0].id) : '');
    setAssignedShelterId(shelters[0]?.id ? String(shelters[0].id) : '');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    if (user.role === 'admin' && currentUser?.role !== 'admin') {
      showError('Only System Administrators can edit administrator accounts.');
      return;
    }
    setEditingStaff(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setOperatorType(user.operator_type || (user.role === 'admin' ? 'admin' : 'rescue'));
    setStatus(user.status);
    setRescueMode('existing');
    setRescueRole(user.rescue_role || 'boat_pilot');
    setRescueUnitName('');
    setRescueCallSign('');
    setRescueUnitType('water_rescue');
    setRescueCapacity(8);
    setRescueContact('');
    const assignedVehicleId = user.assigned_rescue_unit_id || user.rescue_units?.[0]?.id || '';
    setExistingRescueUnitId(assignedVehicleId ? String(assignedVehicleId) : '');
    setAssignedShelterId(user.assigned_shelter_id ? String(user.assigned_shelter_id) : '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) return;

    const role = editingStaff?.role === 'admin' ? 'admin' : 'lgu_staff';

    const payload = {
      name,
      email,
      role,
      operator_type: operatorType,
      status,
    };

    if (password) payload.password = password;

    if (operatorType === 'rescue') {
      payload.rescue_role = rescueRole;
      if (rescueMode === 'new' && rescueCallSign) {
        payload.create_rescue_unit = true;
        payload.rescue_unit_name = rescueUnitName || `${name}'s Rescue Unit`;
        payload.rescue_call_sign = rescueCallSign;
        payload.rescue_unit_type = rescueUnitType;
        payload.rescue_capacity = parseInt(rescueCapacity, 10) || 8;
        payload.rescue_contact = rescueContact || null;
      } else if (existingRescueUnitId) {
        payload.assigned_rescue_unit_id = parseInt(existingRescueUnitId, 10);
        payload.existing_rescue_unit_id = parseInt(existingRescueUnitId, 10);
      } else {
        payload.assigned_rescue_unit_id = null;
        payload.existing_rescue_unit_id = null;
      }
    } else if (operatorType === 'scanner') {
      payload.assigned_shelter_id = assignedShelterId ? parseInt(assignedShelterId, 10) : null;
    }

    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: payload });
    } else {
      if (!password) {
        showError('Password is required for new accounts.');
        return;
      }
      createMutation.mutate(payload);
    }
  };

  const handleRevoke = (user) => {
    if (user.role === 'admin' && currentUser?.role !== 'admin') {
      showError('Only System Administrators can revoke administrator accounts.');
      return;
    }
    setRevokeConfirmUser(user);
  };

  const handleConfirmRevoke = () => {
    if (revokeConfirmUser) {
      deleteMutation.mutate(revokeConfirmUser.id);
      setRevokeConfirmUser(null);
    }
  };

  // Scope staff by agency filter
  const agencyStaff = staff.filter(u => {
    const op = u.operator_type || (u.role === 'admin' ? 'admin' : 'rescue');
    if (agencyScope === 'cdrmo') {
      return CDRRMO_ROLES.includes(op) || u.role === 'admin';
    }
    if (agencyScope === 'cswdo') {
      return CSWDO_ROLES.includes(op);
    }
    return true;
  });

  // Filtered staff list by role pill
  const filteredStaff = agencyStaff.filter(u => {
    if (filterType === 'all') return true;
    const opType = u.operator_type || (u.role === 'admin' ? 'admin' : 'rescue');
    return opType === filterType;
  });

  // Determine allowed roles in modal based on agency scope (CDRRMO only registers Field Rescue Operators)
  const availableModalRoles = REGISTRABLE_OPERATOR_TYPES.filter(type => {
    if (agencyScope === 'cdrmo') return type.id === 'rescue';
    if (agencyScope === 'cswdo') return CSWDO_ROLES.includes(type.id);
    return true;
  });

  // Filter pill options based on agency scope
  const activeFilterOptions = OPERATOR_TYPES.filter(type => {
    if (agencyScope === 'cdrmo') return CDRRMO_ROLES.includes(type.id) || type.id === 'admin';
    if (agencyScope === 'cswdo') return CSWDO_ROLES.includes(type.id);
    return true;
  });

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Top Action Bar */}
      <div className="flex justify-end items-center mb-4">
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
        >
          <UserPlus size={16} /> 
          {agencyScope === 'cdrmo' ? 'Register Rescue / DRRM Operator' : agencyScope === 'cswdo' ? 'Register CSWDO Operator' : 'Register Operator'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 bg-gray-200/70 dark:bg-slate-900 p-1 rounded-xl w-fit border border-gray-200 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'all'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          All {agencyScope === 'cdrmo' ? 'CDRRMO' : agencyScope === 'cswdo' ? 'CSWDO' : ''} Operators ({agencyStaff.length})
        </button>
        {activeFilterOptions.map(t => {
          const count = agencyStaff.filter(u => (u.operator_type || (u.role === 'admin' ? 'admin' : 'rescue')) === t.id).length;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                filterType === t.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{t.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Staff List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="flex h-6 w-6 relative mr-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
            </span>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-xs">Loading operators from database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-6 font-semibold">Operator</th>
                  <th className="py-3.5 px-6 font-semibold">Email &amp; Login</th>
                  <th className="py-3.5 px-6 font-semibold">Operational Role / Assignment</th>
                  <th className="py-3.5 px-6 font-semibold">Account Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium text-xs">
                      No operators found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map(user => {
                    const opTypeKey = user.operator_type || (user.role === 'admin' ? 'admin' : 'rescue');
                    const opConfig = OPERATOR_TYPES.find(t => t.id === opTypeKey) || OPERATOR_TYPES[0];
                    const Icon = opConfig.icon;

                    return (
                      <tr key={user.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/20 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900 dark:text-slate-100 text-sm">{user.name}</div>
                          <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">ID: #{user.id}</div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 dark:text-slate-300 text-xs font-mono">
                          {user.email}
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border ${opConfig.badgeCls}`}>
                              <Icon size={13} />
                              {opConfig.label}
                            </span>
                            
                            {/* Rescuer Role & Vehicle Display */}
                            {user.operator_type === 'rescue' && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-400 font-medium">
                                <span className="font-bold text-rose-700 dark:text-rose-400">
                                  {RESCUE_ROLES.find(r => r.id === user.rescue_role)?.icon || '🦺'}{' '}
                                  {RESCUE_ROLES.find(r => r.id === user.rescue_role)?.label || 'Rescuer'}
                                </span>
                                {(user.assigned_rescue_unit || user.rescue_units?.[0]) && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono font-bold text-gray-800 dark:text-slate-200">
                                      {(user.assigned_rescue_unit || user.rescue_units?.[0])?.call_sign}
                                    </span>
                                  </>
                                )}
                                {(user.rescue_units?.length > 0 || user.rescue_units?.[0]?.assigned_personnel_id === user.id) && (
                                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    ⭐ Fleet Captain
                                  </span>
                                )}
                              </div>
                            )}

                            {/* System Administrator DevOps Display */}
                            {opTypeKey === 'admin' && (
                              <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                                <span>🛠️</span>
                                <span className="font-bold">DevOps &amp; IT Administrator (Non-Field)</span>
                              </div>
                            )}

                            {/* Scanner Shelter Assignment Display */}
                            {user.operator_type === 'scanner' && (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                <span>🏢</span>
                                <span className="font-bold">
                                  {user.assigned_shelter?.name || 'Gate Intake (Unassigned Shelter)'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            user.status === 'active'
                              ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900/40'
                              : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                          }`}>
                            ● {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => setViewingStaff(user)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 font-bold text-xs transition border border-blue-200 dark:border-blue-800/80 cursor-pointer shadow-2xs"
                          >
                            <Eye size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Modal for Register / Edit Operator */}
      <StaffFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingStaff={editingStaff}
        agencyScope={agencyScope}
        availableModalRoles={availableModalRoles}
        handleSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        OPERATOR_TYPES={OPERATOR_TYPES}
        name={name} setName={setName}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        operatorType={operatorType} setOperatorType={setOperatorType}
        status={status} setStatus={setStatus}
        rescueMode={rescueMode} setRescueMode={setRescueMode}
        rescueRole={rescueRole} setRescueRole={setRescueRole}
        rescueUnitName={rescueUnitName} setRescueUnitName={setRescueUnitName}
        rescueCallSign={rescueCallSign} setRescueCallSign={setRescueCallSign}
        rescueUnitType={rescueUnitType} setRescueUnitType={setRescueUnitType}
        rescueCapacity={rescueCapacity} setRescueCapacity={setRescueCapacity}
        rescueContact={rescueContact} setRescueContact={setRescueContact}
        existingRescueUnitId={existingRescueUnitId} setExistingRescueUnitId={setExistingRescueUnitId}
        assignedShelterId={assignedShelterId} setAssignedShelterId={setAssignedShelterId}
        rescueUnits={rescueUnits}
        shelters={shelters}
      />

      {/* View Full Details Modal */}
      <StaffDetailsModal
        viewingStaff={viewingStaff}
        onClose={() => setViewingStaff(null)}
        currentUser={currentUser}
        onEdit={(staff) => {
          setViewingStaff(null);
          openEditModal(staff);
        }}
        onRevoke={(staff) => setRevokeConfirmUser(staff)}
        OPERATOR_TYPES={OPERATOR_TYPES}
      />

      <ConfirmationModal
        isOpen={revokeConfirmUser !== null}
        onClose={() => setRevokeConfirmUser(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Operator Access"
        message={`Are you sure you want to revoke access for ${revokeConfirmUser?.name}? This will invalidate their credentials immediately and revoke access across web and mobile staff portals.`}
        confirmText="Revoke Access"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
