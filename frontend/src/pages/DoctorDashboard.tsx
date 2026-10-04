import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { StatusBanner } from '../components/Common/StatusBanner';
import { StatCard } from '../components/Common/StatCard';
import { Modal } from '../components/Common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  apiGetAppointments,
  apiUpdateAppointment,
  apiGetMedicalRecords,
  apiCreateMedicalRecord,
  apiGetFeedback,
  apiGetUsers,
} from '../api/client';
import { Appointment, MedicalRecord, Feedback, User } from '../types';
import {
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  Plus,
  Star,
  Clock,
  UserCheck,
  Stethoscope,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

const DOCTOR_TABS = [
  { id: 'schedule', label: 'My Schedule', icon: Calendar },
  { id: 'records', label: 'Patient Records', icon: FileText },
  { id: 'appointments', label: 'Appointment Actions', icon: CheckCircle2 },
  { id: 'feedback', label: 'Patient Feedback', icon: MessageSquare },
];

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [allPatients, setAllPatients] = useState<User[]>([]);

  // Selected patient for viewing / adding records
  const [selectedPatientId, setSelectedPatientId] = useState<string | number>('');
  const [selectedPatientRecords, setSelectedPatientRecords] = useState<MedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Add Medical Record Modal state
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [newRecordData, setNewRecordData] = useState({
    patientId: '',
    diagnosis: '',
    prescription: '',
  });

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const doctorId = user?.userId || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apptsRes, fbRes, usersRes] = await Promise.allSettled([
        apiGetAppointments({ doctorId }),
        apiGetFeedback(doctorId),
        apiGetUsers(),
      ]);

      if (apptsRes.status === 'fulfilled') {
        setAppointments(Array.isArray(apptsRes.value) ? apptsRes.value : []);
      } else {
        setError((prev) => prev || `Appointments API: ${apptsRes.reason?.message}`);
      }

      if (fbRes.status === 'fulfilled') {
        setFeedbackList(Array.isArray(fbRes.value) ? fbRes.value : []);
      } else {
        // Feedback might be empty or optional
        setFeedbackList([]);
      }

      if (usersRes.status === 'fulfilled') {
        const list = Array.isArray(usersRes.value) ? usersRes.value : [];
        setAllPatients(list.filter((u) => u.role === 'patient'));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch doctor dashboard information.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load records when selected patient changes
  const fetchPatientRecords = async (patientId: string | number) => {
    if (!patientId) return;
    setLoadingRecords(true);
    try {
      const records = await apiGetMedicalRecords(patientId);
      setSelectedPatientRecords(Array.isArray(records) ? records : []);
    } catch (err: any) {
      setError(`Failed to load medical records: ${err.message}`);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSelectPatient = (patientId: string | number) => {
    setSelectedPatientId(patientId);
    fetchPatientRecords(patientId);
  };

  // Appointment Status Change
  const handleUpdateStatus = async (
    apptId: string | number,
    newStatus: 'confirmed' | 'cancelled' | 'completed'
  ) => {
    setError(null);
    try {
      const currentAppt = appointments.find((a) => a.id === apptId);
      await apiUpdateAppointment(apptId, {
        date: currentAppt?.date,
        time: currentAppt?.time,
        status: newStatus,
        notes: currentAppt?.notes,
      });
      setSuccessMessage(`Appointment #${apptId} set to "${newStatus}".`);
      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update appointment status.');
    }
  };

  // Add Medical Record
  const handleOpenAddRecord = (patientId?: string | number) => {
    setNewRecordData({
      patientId: String(patientId || selectedPatientId || ''),
      diagnosis: '',
      prescription: '',
    });
    setIsAddRecordModalOpen(true);
  };

  const handleSaveMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecordData.patientId) {
      setError('Please select a patient.');
      return;
    }
    setError(null);
    try {
      // POST /api/medical-records { patientId, diagnosis, prescription }
      await apiCreateMedicalRecord({
        patientId: newRecordData.patientId,
        diagnosis: newRecordData.diagnosis,
        prescription: newRecordData.prescription,
      });
      setSuccessMessage('Medical record added successfully.');
      setIsAddRecordModalOpen(false);
      if (selectedPatientId === newRecordData.patientId) {
        fetchPatientRecords(newRecordData.patientId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save medical record.');
    }
  };

  // Unique patients derived from appointments & users
  const patientsList = useMemo(() => {
    const map = new Map<string | number, { id: string | number; name: string }>();
    allPatients.forEach((p) => map.set(p.id, { id: p.id, name: p.name }));
    appointments.forEach((a) => {
      if (a.patientId && !map.has(a.patientId)) {
        map.set(a.patientId, {
          id: a.patientId,
          name: a.patientName || `Patient #${a.patientId}`,
        });
      }
    });
    const list = Array.from(map.values());
    if (!searchQuery.trim()) return list;
    return list.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allPatients, appointments, searchQuery]);

  // Derived feedback stats
  const averageRating = useMemo(() => {
    if (feedbackList.length === 0) return 0;
    const sum = feedbackList.reduce((acc, f) => acc + (Number(f.rating) || 0), 0);
    return (sum / feedbackList.length).toFixed(1);
  }, [feedbackList]);

  return (
    <DashboardLayout
      role="doctor"
      title="Doctor Clinical Workspace"
      tabs={DOCTOR_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Alert Notices */}
      {error && (
        <StatusBanner
          type="error"
          message={error}
          onDismiss={() => setError(null)}
          onRetry={fetchData}
        />
      )}
      {successMessage && (
        <StatusBanner
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* Quick Action Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl text-xs shadow-2xs">
        <div className="text-xs text-slate-500">
          Clinical Portal: <span className="font-semibold text-[#0E1A2C]">{user?.name || 'Dr. Physician'}</span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs font-semibold text-[#0E1A2C] hover:bg-[#EDE5D8] flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F4EFE6] border border-[#ECE6DA] rounded-full transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#258486]' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* TAB 1: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Assigned Appointments"
              value={appointments.length}
              subtitle="Total in schedule"
              icon={Calendar}
              variant="teal"
            />
            <StatCard
              title="Confirmed Sessions"
              value={appointments.filter((a) => (a.status || '').toLowerCase() === 'confirmed').length}
              subtitle="Ready for consultation"
              icon={CheckCircle2}
              variant="navy"
            />
            <StatCard
              title="Pending Review"
              value={appointments.filter((a) => (a.status || '').toLowerCase() === 'pending').length}
              subtitle="Awaiting physician response"
              icon={Clock}
              variant="slate"
            />
          </div>

          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
            <div className="px-5 py-4 border-b border-[#ECE6DA] bg-[#F4EFE6]/60 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#0E1A2C]">
                My Appointment Schedule
              </h3>
              <span className="font-mono text-xs text-slate-500">
                GET /api/appointments?doctorId={doctorId}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6] border-b border-[#ECE6DA] text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Notes</th>
                    <th className="px-5 py-3.5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DA]">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        {loading ? 'Loading schedule...' : 'No appointments scheduled for this doctor ID.'}
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => {
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
                            {appt.patientName || `Patient #${appt.patientId}`}
                          </td>
                          <td className="px-5 py-4 font-mono tabular-nums text-slate-700">
                            {appt.date}
                          </td>
                          <td className="px-5 py-4 font-mono tabular-nums text-slate-700">
                            {appt.time}
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
                              {appt.status !== 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                                  className="px-3 py-1 text-xs font-semibold text-[#258486] bg-[#E6F3F3] hover:bg-[#258486] hover:text-white border border-[#258486]/30 rounded-full transition-colors"
                                >
                                  Confirm
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleSelectPatient(appt.patientId);
                                  setActiveTab('records');
                                }}
                                className="px-3 py-1 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] border border-[#ECE6DA] rounded-full transition-colors"
                              >
                                View Records
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
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT RECORDS */}
      {activeTab === 'records' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Selector List */}
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE6DA]">
              <span className="font-serif text-lg font-bold text-[#0E1A2C]">
                Patients Directory
              </span>
              <button
                onClick={() => handleOpenAddRecord()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-full flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Record</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
              />
            </div>

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {patientsList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No patients found.
                </div>
              ) : (
                patientsList.map((p) => {
                  const isSelected = String(selectedPatientId) === String(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#0E1A2C] text-white shadow-xs font-semibold'
                          : 'hover:bg-[#F4EFE6] text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          ID: #{p.id}
                        </div>
                      </div>
                      <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Medical Records for Selected Patient */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE6DA] gap-3 mb-6">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0E1A2C]">
                    {selectedPatientId
                      ? `Medical Records for Patient #${selectedPatientId}`
                      : 'Medical Records'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Endpoint: <code className="font-mono bg-[#F4EFE6] px-1.5 py-0.5 rounded text-[#0E1A2C] border border-[#ECE6DA]">GET /api/patients/{'{id}'}/medical-records</code>
                  </p>
                </div>
                {selectedPatientId && (
                  <button
                    onClick={() => handleOpenAddRecord(selectedPatientId)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-full flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Record</span>
                  </button>
                )}
              </div>

              {!selectedPatientId ? (
                <div className="py-14 text-center text-xs text-slate-400">
                  Select a patient from the directory on the left to inspect their medical history.
                </div>
              ) : loadingRecords ? (
                <div className="py-14 text-center text-xs text-slate-500">
                  Loading clinical records...
                </div>
              ) : selectedPatientRecords.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-500 space-y-3">
                  <p>No prior medical records on file for this patient.</p>
                  <button
                    onClick={() => handleOpenAddRecord(selectedPatientId)}
                    className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] border border-[#ECE6DA] rounded-full inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Write First Medical Record</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedPatientRecords.map((record) => (
                    <div
                      key={record.id}
                      className="border border-[#ECE6DA] rounded-2xl p-5 bg-white space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs pb-2.5 border-b border-[#ECE6DA]">
                        <span className="font-serif font-bold text-sm text-[#0E1A2C]">
                          Recorded on {record.date || 'Recent Visit'}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          By {record.doctorName || 'Dr. Attending'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Diagnosis
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1">
                          {record.diagnosis}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Prescription & Instructions
                        </span>
                        <p className="text-xs text-[#0E1A2C] font-mono bg-[#F4EFE6]/60 p-3 rounded-xl border border-[#ECE6DA] mt-1.5 whitespace-pre-wrap">
                          {record.prescription}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: APPOINTMENTS ACTIONS */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0E1A2C] mb-1">
              Confirm & Cancel Appointments
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Directly confirm consultations or cancel slots using <code className="font-mono bg-[#F4EFE6] px-1.5 py-0.5 rounded text-[#0E1A2C] border border-[#ECE6DA]">PUT /api/appointments/{'{id}'}</code>.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6] border-b border-[#ECE6DA] text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Current Status</th>
                    <th className="px-5 py-3.5 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DA]">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No appointments available to manage.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((a) => {
                      const statusBadge = {
                        confirmed: 'bg-[#E6F3F3] text-[#258486] border-[#258486]/30',
                        completed: 'bg-[#E6F3F3] text-[#258486] border-[#258486]/30',
                        cancelled: 'bg-rose-50 text-rose-700 border-rose-200/80',
                        pending: 'bg-amber-50 text-amber-800 border-amber-200/80',
                      }[a.status?.toLowerCase() || 'pending'] || 'bg-amber-50 text-amber-800 border-amber-200/80';

                      return (
                        <tr key={a.id} className="hover:bg-[#F4EFE6]/50 transition-colors">
                          <td className="px-5 py-4 font-mono text-slate-500 tabular-nums">
                            #{a.id}
                          </td>
                          <td className="px-5 py-4 font-semibold text-[#0E1A2C]">
                            {a.patientName || `Patient #${a.patientId}`}
                          </td>
                          <td className="px-5 py-4 font-mono tabular-nums text-slate-700">
                            {a.date} · {a.time}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                              {a.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'confirmed')}
                                disabled={a.status === 'confirmed'}
                                className="px-3.5 py-1.5 text-xs font-semibold text-[#258486] bg-[#E6F3F3] hover:bg-[#258486] hover:text-white disabled:opacity-40 border border-[#258486]/30 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'cancelled')}
                                disabled={a.status === 'cancelled'}
                                className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white disabled:opacity-40 border border-rose-200 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* TAB 4: FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <StatCard
              title="Average Patient Rating"
              value={`${averageRating} / 5.0`}
              subtitle={`Based on ${feedbackList.length} reviews`}
              icon={Star}
              variant="teal"
            />
            <StatCard
              title="Total Feedback Submissions"
              value={feedbackList.length}
              subtitle="Verified patient impressions"
              icon={MessageSquare}
              variant="navy"
            />
          </div>

          <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DA] mb-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#0E1A2C]">Patient Feedback & Reviews</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Read-only reviews from <code className="font-mono bg-[#F4EFE6] px-1.5 py-0.5 rounded text-[#0E1A2C] border border-[#ECE6DA]">GET /api/feedback?doctorId={doctorId}</code>
                </p>
              </div>
            </div>

            {feedbackList.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-400">
                No patient reviews recorded yet for this doctor profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {feedbackList.map((fb, idx) => (
                  <div
                    key={fb.id || idx}
                    className="border border-[#ECE6DA] rounded-2xl p-5 bg-white flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-xs text-[#0E1A2C]">
                          {fb.patientName || 'Anonymous Patient'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-mono font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{fb.rating} / 5</span>
                        </div>
                      </div>
                      <p className="font-serif text-sm italic text-slate-700 leading-relaxed">
                        "{fb.comment}"
                      </p>
                    </div>
                    {fb.date && (
                      <span className="text-[10px] text-slate-400 font-mono mt-3.5 block pt-2 border-t border-[#ECE6DA]">
                        Submitted: {fb.date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Medical Record Modal */}
      <Modal
        isOpen={isAddRecordModalOpen}
        onClose={() => setIsAddRecordModalOpen(false)}
        title="Add Patient Medical Record"
      >
        <form onSubmit={handleSaveMedicalRecord} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0E1A2C] mb-1.5">
              Select Patient
            </label>
            <select
              value={newRecordData.patientId}
              onChange={(e) =>
                setNewRecordData({ ...newRecordData, patientId: e.target.value })
              }
              required
              className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
            >
              <option value="">-- Choose Patient --</option>
              {patientsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (ID: #{p.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0E1A2C] mb-1.5">
              Diagnosis
            </label>
            <input
              type="text"
              required
              value={newRecordData.diagnosis}
              onChange={(e) =>
                setNewRecordData({ ...newRecordData, diagnosis: e.target.value })
              }
              placeholder="e.g. Acute Bronchitis, Hypertension Stage 1"
              className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0E1A2C] mb-1.5">
              Prescription & Treatment Plan
            </label>
            <textarea
              rows={4}
              required
              value={newRecordData.prescription}
              onChange={(e) =>
                setNewRecordData({
                  ...newRecordData,
                  prescription: e.target.value,
                })
              }
              placeholder="e.g. Amoxicillin 500mg TID for 7 days; rest, plenty of fluids; follow-up in 2 weeks."
              className="w-full px-3.5 py-2 text-xs border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] bg-white text-slate-800"
            />
          </div>

          <div className="pt-4 border-t border-[#ECE6DA] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] rounded-full border border-[#ECE6DA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-full shadow-xs transition-all"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};
