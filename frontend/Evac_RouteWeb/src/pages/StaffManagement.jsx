import { useState, useEffect } from 'react';
import { 
  UserPlus, Shield, User, X, Edit2, Trash2, 
  LifeBuoy, QrCode, Package, Building2, Truck, Check, Filter, Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { showSuccess, showError } from '../utils/toast';
import { useAuth } from '../context/AuthContext';

const OPERATOR_TYPES = [
  {
    id: 'general',
    label: 'LGU Staff / DRRM Dispatcher',
    description: 'CDRRMO command center monitoring & emergency incident dispatch',
    icon: Building2,
    role: 'lgu_staff',
    color: 'blue',
    badgeCls: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
  },
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
    description: 'Disaster command, hazard zoning, road maintenance & rescue fleet oversight',
    icon: Building2,
    role: 'admin',
    color: 'blue',
    badgeCls: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
  },
  {
    id: 'admin',
    label: 'System Admin',
    description: 'Full administrative control over systems & users',
    icon: Shield,
    role: 'admin',
    color: 'purple',
    badgeCls: 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50'
  },
];

const RESCUE_ROLES = [
  { id: 'boat_pilot', label: 'Boat Pilot / Vessel Commander', icon: '🚤' },
  { id: 'lead_medic', label: 'Lead Paramedic / Medic', icon: '🚑' },
  { id: 'heavy_driver', label: 'Heavy 4x4 Driver / Navigator', icon: '🛻' },
  { id: 'rescue_swimmer', label: 'Field Rescue Swimmer / Rescuer', icon: '🦺' },
  { id: 'crew', label: 'Logistics & Radio Operator', icon: '📋' },
];

const CDRRMO_ROLES = ['general', 'rescue', 'cdrrmo'];
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
  const [operatorType, setOperatorType] = useState('general');
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
    setEditingStaff(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setOperatorType(user.operator_type || (user.role === 'admin' ? 'admin' : 'general'));
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

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
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
    const op = u.operator_type || (u.role === 'admin' ? 'admin' : 'general');
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
    const opType = u.operator_type || (u.role === 'admin' ? 'admin' : 'general');
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
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
              {agencyScope === 'cdrmo' 
                ? 'CDRRMO Staff & Rescue Operator Roster' 
                : agencyScope === 'cswdo'
                ? 'CSWDO Camp & Logistics Operator Roster'
                : 'Staff & Operator Management'}
            </h2>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
              agencyScope === 'cdrmo'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : agencyScope === 'cswdo'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
            }`}>
              {agencyScope === 'cdrmo' ? 'CDRRMO Tactical' : agencyScope === 'cswdo' ? 'CSWDO Social Welfare' : 'All Divisions'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {agencyScope === 'cdrmo' 
              ? 'Register and manage DRRM command dispatchers and field Search & Rescue fleet operators.' 
              : agencyScope === 'cswdo'
              ? 'Register and manage CSWDO warehouse relief officers and shelter gate scanner marshals.'
              : 'Register and manage dedicated operators across CDRRMO Rescue, Shelter Scanners, and Logistics.'}
          </p>
        </div>
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
          const count = agencyStaff.filter(u => (u.operator_type || (u.role === 'admin' ? 'admin' : 'general')) === t.id).length;
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden">
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
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
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
                    const opTypeKey = user.operator_type || (user.role === 'admin' ? 'admin' : 'general');
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
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-400 font-medium">
                                <span className="font-bold text-rose-700 dark:text-rose-400">
                                  {RESCUE_ROLES.find(r => r.id === user.rescue_role)?.icon || '🦺'}{' '}
                                  {RESCUE_ROLES.find(r => r.id === user.rescue_role)?.label || 'Rescuer'}
                                </span>
                                {(user.assigned_rescue_unit || user.rescue_units?.[0]) && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono font-bold text-gray-800 dark:text-slate-200">
                                      {(user.assigned_rescue_unit || user.rescue_units?.[0]).call_sign}
                                    </span>
                                  </>
                                )}
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold text-xs transition border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer"
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
      {isModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-slate-950 dark:to-slate-900">
              <h3 className="font-black text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
                <User size={18} className="text-blue-600" /> 
                {editingStaff ? `Edit Operator #${editingStaff.id}` : (agencyScope === 'cdrmo' ? 'Register New Field Rescue Operator' : 'Register New CSWDO Operator')}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Operator Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  1. {agencyScope === 'cdrmo' ? 'Operator Duty Assignment' : 'Choose Operator Duty & Role'}
                </label>
                {editingStaff?.role === 'admin' ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-center gap-2.5">
                    <Shield size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-purple-900 dark:text-purple-200">System Administrator Account</div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-300">
                        System administrator privileges are protected and cannot be changed to an operational staff role.
                      </div>
                    </div>
                  </div>
                ) : availableModalRoles.length === 1 ? (
                  <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                      <LifeBuoy size={18} />
                    </span>
                    <div>
                      <div className="font-black text-xs text-rose-950 dark:text-rose-200">CDRRMO Field Rescue Operator</div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-tight">
                        Field Search &amp; Rescue personnel assigned to a dedicated rescue vehicle, boat, or medic crew.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableModalRoles.map(type => {
                      const Icon = type.icon;
                      const isSelected = operatorType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setOperatorType(type.id)}
                          className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 shadow-xs'
                              : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                          }`}>
                            <Icon size={15} />
                          </span>
                          <div>
                            <div className="font-black text-xs">{type.label}</div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
                              {type.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Basic Credentials */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Operator Profile &amp; Login
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. Captain Juan Dela Cruz" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Email / Login ID</label>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="e.g. pilot.juan@lgu.gov.ph" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                      {editingStaff ? 'New Password (Leave blank to keep current)' : 'Password (Min. 6 chars)'}
                    </label>
                    <input 
                      type="password" 
                      required={!editingStaff}
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Account Status</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active (Authorized)</option>
                      <option value="inactive">Inactive (Suspended)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Specific Configuration: Rescue Operator Assignment */}
              {operatorType === 'rescue' && (
                <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center gap-2">
                    <LifeBuoy size={16} className="text-rose-600 dark:text-rose-400" />
                    <label className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                      3. Rescuer Duty Role &amp; Vehicle Link
                    </label>
                  </div>

                  {/* Rescuer Role Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Crew Member Duty Specialty
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {RESCUE_ROLES.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setRescueRole(role.id)}
                          className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                            rescueRole === role.id
                              ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-bold'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="text-base">{role.icon}</span>
                          <span className="text-xs">{role.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Assignment Options */}
                  <div className="space-y-2 pt-2 border-t border-rose-100 dark:border-rose-900/30">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Fleet Vehicle Assignment
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setRescueMode('existing')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                          rescueMode === 'existing'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        Assign to Existing Unit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescueMode('new')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                          rescueMode === 'new'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        Register New Fleet Vehicle
                      </button>
                    </div>

                    {rescueMode === 'existing' ? (
                      <div>
                        <select
                          value={existingRescueUnitId}
                          onChange={(e) => setExistingRescueUnitId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="">-- Unassigned (Standby Pool / Reserve) --</option>
                          {rescueUnits.map(unit => (
                            <option key={unit.id} value={unit.id}>
                              {unit.unit_type === 'water_rescue' ? '🚤' : unit.unit_type === 'medical_ambulance' ? '🚑' : '🛻'} {unit.name} ({unit.call_sign}) — Cap: {unit.capacity_persons}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                          The mobile rescuer will receive missions and duty notifications assigned to this vessel / vehicle.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Call Sign / Plate</label>
                            <input
                              type="text"
                              value={rescueCallSign}
                              onChange={(e) => setRescueCallSign(e.target.value)}
                              placeholder="e.g. RESCUE-BOAT-05"
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Vehicle Unit Name</label>
                            <input
                              type="text"
                              value={rescueUnitName}
                              onChange={(e) => setRescueUnitName(e.target.value)}
                              placeholder="e.g. Zamboanga Delta Rubber Boat"
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Vehicle Type</label>
                            <select
                              value={rescueUnitType}
                              onChange={(e) => setRescueUnitType(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white"
                            >
                              <option value="water_rescue">🚤 Water Rescue Boat</option>
                              <option value="medical_ambulance">🚑 Medical Ambulance</option>
                              <option value="high_clearance_truck">🛻 4x4 Heavy Rescue Truck</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Evacuee Capacity</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={rescueCapacity}
                              onChange={(e) => setRescueCapacity(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Radio / Hotline</label>
                            <input
                              type="text"
                              value={rescueContact}
                              onChange={(e) => setRescueContact(e.target.value)}
                              placeholder="e.g. 0917-123-4567"
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Specific Configuration: Shelter Scanner Assignment */}
              {operatorType === 'scanner' && (
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                      3. Evacuation Shelter Facility Assignment
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Assign this gate marshal to their designated evacuation center. Their mobile scanner app will check in evacuees and issue ration packs for this facility.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Designated Evacuation Shelter
                    </label>
                    <select
                      value={assignedShelterId}
                      onChange={(e) => setAssignedShelterId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Unassigned (Floating Gate Marshal) --</option>
                      {shelters.map(s => (
                        <option key={s.id} value={s.id}>
                          🏢 {s.name} ({s.barangay || 'City Center'}) — {s.current_occupancy}/{s.max_capacity} Occupancy
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Saving...' 
                    : editingStaff ? 'Save Operator Changes' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Details Modal */}
      {viewingStaff && (() => {
        const opTypeKey = viewingStaff.operator_type || (viewingStaff.role === 'admin' ? 'admin' : 'general');
        const opConfig = OPERATOR_TYPES.find(t => t.id === opTypeKey) || OPERATOR_TYPES[0];
        const OpIcon = opConfig.icon;
        const isSelf = viewingStaff.id === currentUser?.id;

        return (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setViewingStaff(null); }}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-xl max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black">
                    <OpIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
                      {viewingStaff.name}
                      {isSelf && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                          You
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Operator ID #{viewingStaff.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingStaff(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1">
                      Assigned Role / Duty
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase border ${opConfig.badgeCls}`}>
                      <OpIcon size={13} />
                      {opConfig.label}
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 leading-tight">
                      {opConfig.description}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1">
                      Account Status
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                      viewingStaff.status === 'active'
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900/40'
                        : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                    }`}>
                      ● {viewingStaff.status}
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 leading-tight">
                      {viewingStaff.status === 'active' ? 'Authorized for system and mobile access' : 'Access temporarily suspended'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1">
                      Official Email / Account
                    </span>
                    <div className="font-mono font-semibold text-gray-800 dark:text-slate-200 text-sm">
                      {viewingStaff.email}
                    </div>
                  </div>
                </div>

                {/* Rescuer Vehicle & Crew Duty Assignment */}
                {viewingStaff.operator_type === 'rescue' && (() => {
                  const assignedUnit = viewingStaff.assigned_rescue_unit || viewingStaff.rescue_units?.[0] || null;
                  const crewRoleCfg = RESCUE_ROLES.find(r => r.id === viewingStaff.rescue_role) || RESCUE_ROLES[0];

                  return (
                    <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5 text-xs">
                          <LifeBuoy size={15} className="text-rose-600" />
                          Field Rescuer Duty &amp; Vehicle Assignment
                        </span>
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <span>{crewRoleCfg.icon}</span>
                          <span>{crewRoleCfg.label}</span>
                        </span>
                      </div>

                      {assignedUnit ? (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                              <span className="text-sm">
                                {assignedUnit.unit_type === 'water_rescue' ? '🚤' : assignedUnit.unit_type === 'medical_ambulance' ? '🚑' : '🛻'}
                              </span>
                              <span>{assignedUnit.name}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{assignedUnit.call_sign}</span>
                              <span>•</span>
                              <span>Cap: {assignedUnit.capacity_persons} evacuees</span>
                              {assignedUnit.contact_number && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{assignedUnit.contact_number}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                            {assignedUnit.status}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-gray-500 dark:text-slate-400 italic">
                          Currently in Standby / Reserve Pool (No fleet vehicle assigned).
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Shelter Scanner Assignment Details */}
                {viewingStaff.operator_type === 'scanner' && (
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                        <QrCode size={15} className="text-emerald-600" />
                        Gate Marshal Shelter Assignment
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Mobile QR Desk
                      </span>
                    </div>

                    {viewingStaff.assigned_shelter ? (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                            <span>🏢</span>
                            <span>{viewingStaff.assigned_shelter.name}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Barangay {viewingStaff.assigned_shelter.barangay || 'City Center'}</span>
                            <span>•</span>
                            <span>Occupancy: {viewingStaff.assigned_shelter.current_occupancy}/{viewingStaff.assigned_shelter.max_capacity}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                          viewingStaff.assigned_shelter.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-700'
                        }`}>
                          {viewingStaff.assigned_shelter.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-gray-500 dark:text-slate-400 italic">
                        Currently Unassigned (Floating gate marshal without designated facility).
                      </div>
                    )}
                  </div>
                )}

                {/* Operator Permissions Notice */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                  <div className="font-bold">Access Scope &amp; System Privileges:</div>
                  <p className="text-blue-800 dark:text-blue-400 leading-relaxed">
                    {opConfig.id === 'admin' && 'Has full command over resident logs, shelter allocations, fleet dispatch, and operator accounts.'}
                    {opConfig.id === 'rescue' && 'Assigned to field search & rescue operations, evacuee staging handovers, and fleet management.'}
                    {opConfig.id === 'scanner' && 'Equipped with QR scanner privileges for shelter intake gates and real-time ration validation.'}
                    {opConfig.id === 'logistics' && 'Authorized to manage CSWDO warehouse relief goods, bundle builder, and emergency ration dispatches.'}
                    {opConfig.id === 'general' && 'Standard command center situational monitoring and general incident tracking.'}
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewingStaff(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {!isSelf ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const target = viewingStaff;
                          setViewingStaff(null);
                          openEditModal(target);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        <Edit2 size={14} /> Edit Operator
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const target = viewingStaff;
                          setViewingStaff(null);
                          handleRevoke(target);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        <Trash2 size={14} /> Revoke Access
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic pr-2">
                      Active Account (Self)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
