import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { StatusBanner } from '../components/Common/StatusBanner';
import { StatCard } from '../components/Common/StatCard';
import { Modal } from '../components/Common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  apiGetUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  apiGetAppointments,
  apiUpdateAppointment,
  apiDeleteAppointment,
  apiGetSettings,
  apiUpdateSettings,
} from '../api/client';
import { User, Appointment, Settings, UserRole } from '../types';
import {
  Users,
  Calendar,
  Settings as SettingsIcon,
  BarChart3,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  CalendarCheck,
  Stethoscope,
  Save,
  Plus,
  X,
  Key,
} from 'lucide-react';

const ADMIN_TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const AdminDashboard: React.FC = () => {
  // Retrieve authentication state and Bearer token directly from AuthContext
  const { token, user: currentAuthUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<Settings>({});

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User form state (used for both Add and Edit with standard HTML form elements)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }>({
    name: '',
    email: '',
    password: '',
    role: 'patient',
  });
  const [showAddForm, setShowAddForm] = useState(true);

  // Appointment edit modal state
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [apptFormData, setApptFormData] = useState({
    date: '',
    time: '',
    status: 'pending',
    notes: '',
  });

  // Settings editing state
  const [settingsFormData, setSettingsFormData] = useState<{ [key: string]: string }>({});
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingVal, setNewSettingVal] = useState('');

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [apptStatusFilter, setApptStatusFilter] = useState<string>('all');

  // Fetch all administrative data attaching the Bearer token from AuthContext
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, apptsRes, settingsRes] = await Promise.allSettled([
        apiGetUsers(token),
        apiGetAppointments(undefined, token),
        apiGetSettings(token),
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
      } else {
        setError((prev) => prev || `Users API: ${usersRes.reason?.message}`);
      }

      if (apptsRes.status === 'fulfilled') {
        setAppointments(Array.isArray(apptsRes.value) ? apptsRes.value : []);
      } else {
        setError((prev) => prev || `Appointments API: ${apptsRes.reason?.message}`);
      }

      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value || {};
        setSettings(s);
        const flattened: { [key: string]: string } = {};
        Object.entries(s).forEach(([k, v]) => {
          flattened[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        });
        setSettingsFormData(flattened);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch administrator data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // USER MANAGEMENT: Add / Edit User Form Handlers
  const handleStartAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'patient',
    });
    setShowAddForm(true);
  };

  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowAddForm(true);
    // Scroll smoothly to form
    const formElement = document.getElementById('user-action-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleCancelUserForm = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'patient',
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        // PUT /api/users/{id} { name, email, role } attaching Bearer token from AuthContext
        await apiUpdateUser(
          editingUser.id,
          {
            name: userFormData.name,
            email: userFormData.email,
            role: userFormData.role,
          },
          token
        );
        setSuccessMessage(`User "${userFormData.name}" updated successfully via PUT /api/users/${editingUser.id}.`);
      } else {
        // POST /api/users { name, email, password, role } attaching Bearer token from AuthContext
        await apiCreateUser(
          {
            name: userFormData.name,
            email: userFormData.email,
            password: userFormData.password,
            role: userFormData.role,
          },
          token
        );
        setSuccessMessage(`User "${userFormData.name}" created successfully via POST /api/users.`);
      }

      // Reset form and reload users list with Bearer token
      handleCancelUserForm();
      const updatedUsers = await apiGetUsers(token);
      setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to save user.');
    }
  };

  const handleDeleteUser = async (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}" (ID: #${id})?`)) {
      return;
    }
    setError(null);
    try {
      // DELETE /api/users/{id} attaching Bearer token from AuthContext
      await apiDeleteUser(id, token);
      setSuccessMessage(`User "${name}" (ID: #${id}) deleted via DELETE /api/users/${id}.`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (editingUser && editingUser.id === id) {
        handleCancelUserForm();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user.');
    }
  };

  // APPOINTMENT MANAGEMENT: Edit / Reschedule / Cancel
  const handleOpenEditAppt = (appt: Appointment) => {
    setEditingAppt(appt);
    setApptFormData({
      date: appt.date,
      time: appt.time,
      status: appt.status || 'pending',
      notes: appt.notes || '',
    });
    setIsApptModalOpen(true);
  };

  const handleSaveAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt) return;
    setError(null);
    try {
      // PUT /api/appointments/{id} { date, time, status, notes } attaching Bearer token from AuthContext
      await apiUpdateAppointment(
        editingAppt.id,
        {
          date: apptFormData.date,
          time: apptFormData.time,
          status: apptFormData.status,
          notes: apptFormData.notes,
        },
        token
      );
      setSuccessMessage(`Appointment #${editingAppt.id} updated via PUT /api/appointments/${editingAppt.id}.`);
      setIsApptModalOpen(false);
      const updated = await apiGetAppointments(undefined, token);
      setAppointments(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to update appointment.');
    }
  };

  const handleDeleteAppt = async (id: string | number) => {
    if (!window.confirm(`Are you sure you want to cancel / delete appointment #${id}?`)) {
      return;
    }
    setError(null);
    try {
      // DELETE /api/appointments/{id} attaching Bearer token from AuthContext
      await apiDeleteAppointment(id, token);
      setSuccessMessage(`Appointment #${id} deleted via DELETE /api/appointments/${id}.`);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete appointment.');
    }
  };

  // SETTINGS MANAGEMENT: Update Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // PUT /api/settings { key: value } attaching Bearer token from AuthContext
      await apiUpdateSettings(settingsFormData, token);
      setSuccessMessage('System settings updated successfully via PUT /api/settings.');
      const res = await apiGetSettings(token);
      setSettings(res || {});
    } catch (err: any) {
      setError(err?.message || 'Failed to update settings.');
    }
  };

  const handleAddSettingField = () => {
    if (!newSettingKey.trim()) return;
    setSettingsFormData((prev) => ({
      ...prev,
      [newSettingKey.trim()]: newSettingVal,
    }));
    setNewSettingKey('');
    setNewSettingVal('');
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole =
        userRoleFilter === 'all' || u.role.toLowerCase() === userRoleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (apptStatusFilter === 'all') return true;
      return (a.status || 'pending').toLowerCase() === apptStatusFilter.toLowerCase();
    });
  }, [appointments, apptStatusFilter]);

  // Derived Analytics stats
  const analytics = useMemo(() => {
    const totalUsers = users.length;
    const totalDoctors = users.filter((u) => u.role === 'doctor').length;
    const totalPatients = users.filter((u) => u.role === 'patient').length;
    const totalAdmins = users.filter((u) => u.role === 'admin').length;

    const totalAppts = appointments.length;
    const pendingAppts = appointments.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
    const confirmedAppts = appointments.filter((a) => (a.status || '').toLowerCase() === 'confirmed').length;
    const cancelledAppts = appointments.filter((a) => (a.status || '').toLowerCase() === 'cancelled').length;
    const completedAppts = appointments.filter((a) => (a.status || '').toLowerCase() === 'completed').length;

    const confirmationRate = totalAppts > 0 ? Math.round((confirmedAppts / totalAppts) * 100) : 0;

    return {
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAdmins,
      totalAppts,
      pendingAppts,
      confirmedAppts,
      cancelledAppts,
      completedAppts,
      confirmationRate,
    };
  }, [users, appointments]);

  return (
    <DashboardLayout
      role="admin"
      title="Admin Dashboard"
      tabs={ADMIN_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Alert Notices */}
      {error && (
        <StatusBanner
          type="error"
          message={error}
          onDismiss={() => setError(null)}
          onRetry={fetchAllData}
        />
      )}
      {successMessage && (
        <StatusBanner
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* Auth & Token Indicator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#E6F3F3] text-[#258486]">
            <Key className="w-3.5 h-3.5 shrink-0" />
          </div>
          <span className="font-semibold text-[#0E1A2C]">AuthContext Session:</span>
          <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
            Bearer {token ? `${token.substring(0, 16)}...` : '(No token stored)'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            Admin: <strong className="text-[#0E1A2C] font-semibold">{currentAuthUser?.name || 'Administrator'}</strong>
          </span>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="text-xs font-semibold text-[#0E1A2C] hover:bg-[#EDE5D8] flex items-center gap-1.5 px-3 py-1.5 bg-[#F4EFE6] border border-[#ECE6DA] rounded-full transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#258486]' : ''}`} />
            <span>{loading ? 'Fetching...' : 'Reload'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: USERS (Table + Add/Edit/Delete Forms calling /api/users)
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Functional User Form Card (Standard HTML Form Elements) */}
          {showAddForm && (
            <div
              id="user-action-form"
              className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)] transition-all"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DA] mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#E6F3F3] text-[#258486] border border-[#258486]/20">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0E1A2C]">
                      {editingUser
                        ? `Edit User: ${editingUser.name} (ID: #${editingUser.id})`
                        : 'Add New User'}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                      {editingUser
                        ? `PUT /api/users/${editingUser.id}`
                        : 'POST /api/users'}
                    </span>
                  </div>
                </div>
                {editingUser && (
                  <button
                    type="button"
                    onClick={handleCancelUserForm}
                    className="text-xs font-semibold text-slate-500 hover:text-[#0E1A2C] flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F4EFE6] hover:bg-[#EDE5D8] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>

              {/* Standard HTML Form */}
              <form onSubmit={handleSaveUser} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Name Input */}
                  <div>
                    <label
                      htmlFor="user-form-name"
                      className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
                    >
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="user-form-name"
                      name="name"
                      type="text"
                      required
                      value={userFormData.name}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, name: e.target.value })
                      }
                      placeholder="e.g. Dr. John Doe"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="user-form-email"
                      className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
                    >
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="user-form-email"
                      name="email"
                      type="email"
                      required
                      value={userFormData.email}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, email: e.target.value })
                      }
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800 font-mono"
                    />
                  </div>

                  {/* Password Input (Required when adding, optional when editing) */}
                  <div>
                    <label
                      htmlFor="user-form-password"
                      className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
                    >
                      Password{' '}
                      {editingUser ? (
                        <span className="text-slate-400 font-normal">(Keep existing)</span>
                      ) : (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <input
                      id="user-form-password"
                      name="password"
                      type="password"
                      required={!editingUser}
                      disabled={!!editingUser}
                      value={userFormData.password}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, password: e.target.value })
                      }
                      placeholder={editingUser ? 'Unchanged during edit' : '••••••••'}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800 disabled:bg-[#F4EFE6] disabled:text-slate-400"
                    />
                  </div>

                  {/* Role Select */}
                  <div>
                    <label
                      htmlFor="user-form-role"
                      className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
                    >
                      Assigned Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="user-form-role"
                      name="role"
                      required
                      value={userFormData.role}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          role: e.target.value as UserRole,
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800 capitalize"
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#ECE6DA]">
                  <p className="text-[11px] text-slate-400">
                    Requests automatically attach Bearer token from AuthContext.
                  </p>
                  <div className="flex items-center gap-2.5">
                    {editingUser && (
                      <button
                        type="button"
                        onClick={handleCancelUserForm}
                        className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] border border-[#ECE6DA] rounded-full transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-full transition-all duration-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {editingUser ? (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Update User (PUT)</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add User (POST)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* User Search & Filter Bar */}
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-2xs">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name or email..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
                />
              </div>

              {/* Segmented Role Filter */}
              <div className="flex items-center gap-1 p-1 bg-[#F4EFE6] rounded-full">
                {['all', 'admin', 'doctor', 'patient'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setUserRoleFilter(role)}
                    className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                      userRoleFilter === role
                        ? 'bg-[#0E1A2C] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-[#0E1A2C]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartAddUser}
                className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#0E1A2C] hover:text-white border border-[#ECE6DA] rounded-full transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New User Form</span>
              </button>
            </div>
          </div>

          {/* Standard HTML Table of Users */}
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6] border-b border-[#ECE6DA] text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">User ID</th>
                    <th scope="col" className="px-5 py-3.5">Full Name</th>
                    <th scope="col" className="px-5 py-3.5">Email Address</th>
                    <th scope="col" className="px-5 py-3.5">Role</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DA] font-normal">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        {loading ? 'Loading users via GET /api/users...' : 'No users found matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrentlyEditing = editingUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-[#F4EFE6]/50 transition-colors ${
                            isCurrentlyEditing ? 'bg-[#E6F3F3]/50' : ''
                          }`}
                        >
                          <td className="px-5 py-4 font-mono text-slate-500 tabular-nums">
                            #{u.id}
                          </td>
                          <td className="px-5 py-4 font-semibold text-[#0E1A2C]">
                            {u.name}
                            {isCurrentlyEditing && (
                              <span className="ml-2 text-[10px] text-[#258486] font-semibold bg-[#E6F3F3] border border-[#258486]/30 px-2 py-0.5 rounded-full">
                                Editing
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="px-5 py-4">
                            <span className="capitalize text-xs font-medium text-[#0E1A2C] px-2.5 py-0.5 rounded-full bg-[#F4EFE6] border border-[#ECE6DA]">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEditUser(u)}
                                title="Edit User"
                                className="px-3 py-1 text-xs font-semibold text-[#258486] bg-[#E6F3F3] hover:bg-[#258486] hover:text-white border border-[#258486]/30 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Delete User"
                                className="px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 border-t border-[#ECE6DA] bg-[#F4EFE6]/50 text-[11px] text-slate-500 flex justify-between items-center">
              <span>Showing {filteredUsers.length} of {users.length} users</span>
              <span className="font-mono">Header: Authorization: Bearer &lt;token&gt; attached</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: APPOINTMENTS (Table + Reschedule / Edit / Cancel via API)
          ========================================================================= */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#0E1A2C]">Filter Status:</span>
              <div className="flex items-center gap-1 p-1 bg-[#F4EFE6] rounded-full">
                {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setApptStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                      apptStatusFilter === status
                        ? 'bg-[#0E1A2C] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-[#0E1A2C]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Total <strong className="text-[#0E1A2C]">{filteredAppointments.length}</strong> matching appointments
            </div>
          </div>

          {/* Standard HTML Table of Appointments */}
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6] border-b border-[#ECE6DA] text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">ID</th>
                    <th scope="col" className="px-5 py-3.5">Doctor</th>
                    <th scope="col" className="px-5 py-3.5">Patient</th>
                    <th scope="col" className="px-5 py-3.5">Date & Time</th>
                    <th scope="col" className="px-5 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5">Notes</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DA]">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        {loading ? 'Loading appointments...' : 'No appointments found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => {
                      const statusBadge = {
                        confirmed: 'bg-[#E6F3F3] text-[#258486] border-[#258486]/30',
                        completed: 'bg-[#E6F3F3] text-[#258486] border-[#258486]/30',
                        cancelled: 'bg-rose-50 text-rose-700 border-rose-200/80',
                        pending: 'bg-amber-50 text-amber-800 border-amber-200/80',
                      }[appt.status?.toLowerCase() || 'pending'] || 'bg-amber-50 text-amber-800 border-amber-200/80';

                      return (
                        <tr key={appt.id} className="hover:bg-[#F4EFE6]/50 transition-colors">
                          <td className="px-5 py-4 font-mono text-slate-500 tabular-nums">
                            #{appt.id}
                          </td>
                          <td className="px-5 py-4 font-semibold text-[#0E1A2C]">
                            {appt.doctorName || `Dr. (ID: ${appt.doctorId})`}
                          </td>
                          <td className="px-5 py-4 text-slate-800 font-medium">
                            {appt.patientName || `Patient (ID: ${appt.patientId})`}
                          </td>
                          <td className="px-5 py-4 font-mono tabular-nums text-slate-600">
                            {appt.date} · {appt.time}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                              {appt.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">
                            {appt.notes || '—'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditAppt(appt)}
                                title="Reschedule / Edit"
                                className="px-3 py-1 text-xs font-semibold text-[#258486] bg-[#E6F3F3] hover:bg-[#258486] hover:text-white rounded-full border border-[#258486]/30 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Reschedule</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAppt(appt.id)}
                                title="Delete / Cancel Appointment"
                                className="px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-full border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 border-t border-[#ECE6DA] bg-[#F4EFE6]/50 text-[11px] text-slate-500 flex justify-between items-center">
              <span>GET /api/appointments</span>
              <span className="font-mono">PUT & DELETE /api/appointments/{'{id}'}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SETTINGS (Standard HTML Form calling GET & PUT /api/settings)
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DA] mb-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#0E1A2C]">System & Hospital Settings</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Update key-value pairs stored in the backend via <code className="font-mono bg-[#F4EFE6] px-1.5 py-0.5 rounded text-[#0E1A2C] border border-[#ECE6DA]">PUT /api/settings</code>.
                </p>
              </div>
            </div>

            {/* Standard HTML Form for Settings */}
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {Object.keys(settingsFormData).length === 0 ? (
                <div className="p-5 bg-[#F4EFE6]/60 border border-[#ECE6DA] rounded-2xl text-xs text-slate-500 text-center">
                  No configuration keys returned from backend. You can add new keys below.
                </div>
              ) : (
                Object.entries(settingsFormData).map(([key, val]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label
                      htmlFor={`setting-key-${key}`}
                      className="sm:w-1/3 text-xs font-semibold text-[#0E1A2C] font-mono truncate"
                    >
                      {key}
                    </label>
                    <div className="flex-1 flex gap-2">
                      <input
                        id={`setting-key-${key}`}
                        name={`setting_${key}`}
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            [key]: e.target.value,
                          })
                        }
                        className="flex-1 px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] font-mono bg-white text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const copy = { ...settingsFormData };
                          delete copy[key];
                          setSettingsFormData(copy);
                        }}
                        title="Remove key"
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Add New Key Section */}
              <div className="pt-5 border-t border-[#ECE6DA]">
                <span className="text-xs font-semibold text-[#0E1A2C] block mb-2.5">
                  Add New Setting Key
                </span>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Key (e.g. hospitalName, clinicHours)"
                    value={newSettingKey}
                    onChange={(e) => setNewSettingKey(e.target.value)}
                    className="sm:w-1/2 px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl font-mono bg-white text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. HealthPulse Metro Care)"
                    value={newSettingVal}
                    onChange={(e) => setNewSettingVal(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddSettingField}
                    className="px-4 py-2 text-xs font-semibold bg-[#F4EFE6] hover:bg-[#EDE5D8] text-[#0E1A2C] border border-[#ECE6DA] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="pt-5 flex items-center justify-between border-t border-[#ECE6DA]">
                <span className="text-[11px] text-slate-400 font-mono">
                  Authorization: Bearer &lt;token&gt; attached
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-full transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Settings (PUT)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: ANALYTICS (Derived Metrics from Users & Appointments)
          ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Users"
              value={analytics.totalUsers}
              subtitle={`${analytics.totalDoctors} doctors · ${analytics.totalPatients} patients`}
              icon={Users}
              variant="teal"
            />
            <StatCard
              title="Total Appointments"
              value={analytics.totalAppts}
              subtitle={`${analytics.confirmedAppts} confirmed · ${analytics.pendingAppts} pending`}
              icon={CalendarCheck}
              variant="navy"
            />
            <StatCard
              title="Confirmation Rate"
              value={`${analytics.confirmationRate}%`}
              subtitle="Ratio of confirmed to total"
              icon={BarChart3}
              variant="teal"
            />
            <StatCard
              title="Active Doctors"
              value={analytics.totalDoctors}
              subtitle="Healthcare providers"
              icon={Stethoscope}
              variant="slate"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
              <h3 className="font-serif text-xl font-bold text-[#0E1A2C] mb-5">
                Appointment Status Distribution
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#ECE6DA]">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-slate-700">Pending Review</span>
                  </div>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.pendingAppts}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#ECE6DA]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#258486]" />
                    <span className="font-semibold text-slate-700">Confirmed</span>
                  </div>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.confirmedAppts}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#ECE6DA]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-700">Completed</span>
                  </div>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.completedAppts}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2.5">
                  <div className="flex items-center gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span className="font-semibold text-slate-700">Cancelled</span>
                  </div>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.cancelledAppts}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
              <h3 className="font-serif text-xl font-bold text-[#0E1A2C] mb-5">
                User Role Distribution
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#ECE6DA]">
                  <span className="font-semibold text-slate-700">Patients</span>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.totalPatients}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2.5 border-b border-[#ECE6DA]">
                  <span className="font-semibold text-slate-700">Doctors</span>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.totalDoctors}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-2.5">
                  <span className="font-semibold text-slate-700">Administrators</span>
                  <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                    {analytics.totalAdmins}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Edit / Reschedule Modal with Standard Form Elements */}
      <Modal
        isOpen={isApptModalOpen}
        onClose={() => setIsApptModalOpen(false)}
        title={editingAppt ? `Reschedule Appointment #${editingAppt.id}` : 'Appointment Details'}
      >
        <form onSubmit={handleSaveAppt} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="appt-date-input"
                className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
              >
                Date
              </label>
              <input
                id="appt-date-input"
                name="date"
                type="date"
                required
                value={apptFormData.date}
                onChange={(e) =>
                  setApptFormData({ ...apptFormData, date: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
              />
            </div>
            <div>
              <label
                htmlFor="appt-time-input"
                className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
              >
                Time
              </label>
              <input
                id="appt-time-input"
                name="time"
                type="time"
                required
                value={apptFormData.time}
                onChange={(e) =>
                  setApptFormData({ ...apptFormData, time: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="appt-status-select"
              className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
            >
              Status
            </label>
            <select
              id="appt-status-select"
              name="status"
              value={apptFormData.status}
              onChange={(e) =>
                setApptFormData({ ...apptFormData, status: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl capitalize bg-white text-slate-800"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="appt-notes-textarea"
              className="block text-xs font-semibold text-[#0E1A2C] mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="appt-notes-textarea"
              name="notes"
              rows={3}
              value={apptFormData.notes}
              onChange={(e) =>
                setApptFormData({ ...apptFormData, notes: e.target.value })
              }
              placeholder="Clinical notes or reason for reschedule"
              className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
            />
          </div>

          <div className="pt-4 border-t border-[#ECE6DA] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsApptModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] rounded-full border border-[#ECE6DA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-full shadow-xs cursor-pointer transition-all"
            >
              Save Appointment (PUT)
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};
