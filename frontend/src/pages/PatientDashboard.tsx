import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  apiGetDoctors,
  apiGetAppointments,
  apiCreateAppointment,
  apiUpdateAppointment,
  apiDeleteAppointment,
  apiGetMedicalRecords,
  apiUpdateUser,
  apiCreateFeedback,
  apiGetPatientProfile,
  apiUpdatePatientProfile,
} from '../api/client';
import { Doctor, Appointment, MedicalRecord, PatientProfile } from '../types';
import {
  CalendarPlus,
  CalendarCheck,
  FileHeart,
  UserCheck,
  Clock,
  Trash2,
  Edit2,
  Star,
  RefreshCw,
  HeartPulse,
  Save,
  MessageSquarePlus,
  ChevronDown,
  Calendar,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Activity,
  Phone,
  ShieldAlert,
  MapPin,
  Scale,
} from 'lucide-react';

const PATIENT_TABS = [
  { id: 'book', label: 'Book Appointment', icon: CalendarPlus },
  { id: 'my-appointments', label: 'My Appointments', icon: CalendarCheck },
  { id: 'history', label: 'Medical History', icon: FileHeart },
  { id: 'profile', label: 'Patient Profile', icon: UserCheck },
];

export const PatientDashboard: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const [activeTab, setActiveTab] = useState('book');

  // Data states
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);

  // Booking Form State
  const [bookingData, setBookingData] = useState({
    doctorId: '',
    date: '',
    time: '',
  });

  // Reschedule Modal State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    time: '',
    notes: '',
  });

  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackDoctorId, setFeedbackDoctorId] = useState<string | number>('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Extended Patient Profile State
  const [extendedProfile, setExtendedProfile] = useState({
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    heightCm: '',
    weightKg: '',
    contact: '',
    address: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Loading & alerts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const patientId = user?.userId || (user as any)?.id || '';

  const fetchPatientProfile = useCallback(async () => {
    const uid = user?.userId || (user as any)?.id;
    if (!uid) return;
    setIsProfileLoading(true);
    try {
      const data = await apiGetPatientProfile(uid);
      if (data) {
        setExtendedProfile({
          dateOfBirth: data.dateOfBirth || '',
          gender: data.gender || '',
          bloodGroup: data.bloodGroup || '',
          heightCm:
            data.heightCm !== null && data.heightCm !== undefined ? String(data.heightCm) : '',
          weightKg:
            data.weightKg !== null && data.weightKg !== undefined ? String(data.weightKg) : '',
          contact: data.contact || '',
          address: data.address || '',
          allergies: data.allergies || '',
          chronicConditions: data.chronicConditions || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || '',
        });
        if (data.name) {
          setProfileData((prev) => ({ ...prev, name: data.name || prev.name }));
        }
        if (data.email) {
          setProfileData((prev) => ({ ...prev, email: data.email || prev.email }));
        }
      }
    } catch (err: any) {
      console.warn('Patient profile fetch:', err?.message || err);
    } finally {
      setIsProfileLoading(false);
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [doctorsRes, apptsRes, recordsRes] = await Promise.allSettled([
        apiGetDoctors(),
        apiGetAppointments({ patientId }),
        patientId ? apiGetMedicalRecords(patientId) : Promise.resolve([]),
      ]);

      if (doctorsRes.status === 'fulfilled') {
        setDoctors(Array.isArray(doctorsRes.value) ? doctorsRes.value : []);
      } else {
        setError((prev) => prev || `Doctors API: ${doctorsRes.reason?.message}`);
      }

      if (apptsRes.status === 'fulfilled') {
        setMyAppointments(Array.isArray(apptsRes.value) ? apptsRes.value : []);
      } else {
        setError((prev) => prev || `Appointments API: ${apptsRes.reason?.message}`);
      }

      if (recordsRes.status === 'fulfilled') {
        setMedicalRecords(Array.isArray(recordsRes.value) ? recordsRes.value : []);
      }

      // Also refresh profile on dashboard refresh
      if (patientId) {
        fetchPatientProfile();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load patient dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [patientId, fetchPatientProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchPatientProfile();
    }
  }, [activeTab, fetchPatientProfile]);

  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Live computed age from Date of Birth
  const computedAge = (() => {
    if (!extendedProfile.dateOfBirth) return null;
    const dob = new Date(extendedProfile.dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  })();

  // Live computed BMI
  const computedBmi = (() => {
    const h = parseFloat(extendedProfile.heightCm);
    const w = parseFloat(extendedProfile.weightKg);
    if (!h || !w || h <= 0 || w <= 0) {
      return { value: null, label: '—', category: null, badgeClass: '' };
    }
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    const rounded = parseFloat(bmi.toFixed(1));
    let category = 'Normal';
    let badgeClass = 'bg-[#E6F3F3] text-[#258486] border-[#258486]/30';
    if (rounded < 18.5) {
      category = 'Underweight (<18.5)';
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (rounded < 25) {
      category = 'Normal (18.5-24.9)';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (rounded < 30) {
      category = 'Overweight (25-29.9)';
      badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
    } else {
      category = 'Obese (≥30)';
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return { value: rounded, label: rounded.toFixed(1), category, badgeClass };
  })();

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData.doctorId) {
      setError('Please select a doctor.');
      return;
    }
    setError(null);
    try {
      // POST /api/appointments { doctorId, patientId, date, time }
      await apiCreateAppointment({
        doctorId: bookingData.doctorId,
        patientId: patientId,
        date: bookingData.date,
        time: bookingData.time,
      });

      setSuccessMessage('Appointment booked successfully!');
      setBookingData({ doctorId: '', date: '', time: '' });
      setActiveTab('my-appointments');

      const appts = await apiGetAppointments({ patientId });
      setMyAppointments(Array.isArray(appts) ? appts : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to book appointment.');
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (appt: Appointment) => {
    setReschedulingAppt(appt);
    setRescheduleData({
      date: appt.date,
      time: appt.time,
      notes: appt.notes || '',
    });
    setIsRescheduleModalOpen(true);
  };

  // Save Rescheduled Appointment
  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt) return;
    setError(null);
    try {
      // PUT /api/appointments/{id} { date, time, status, notes }
      await apiUpdateAppointment(reschedulingAppt.id, {
        date: rescheduleData.date,
        time: rescheduleData.time,
        status: 'pending',
        notes: rescheduleData.notes,
      });

      setSuccessMessage(`Appointment #${reschedulingAppt.id} rescheduled.`);
      setIsRescheduleModalOpen(false);

      const appts = await apiGetAppointments({ patientId });
      setMyAppointments(Array.isArray(appts) ? appts : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment.');
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (apptId: string | number) => {
    if (!window.confirm(`Are you sure you want to cancel appointment #${apptId}?`)) {
      return;
    }
    setError(null);
    try {
      // DELETE /api/appointments/{id}
      await apiDeleteAppointment(apptId);
      setSuccessMessage(`Appointment #${apptId} has been cancelled.`);
      setMyAppointments((prev) => prev.filter((a) => a.id !== apptId));
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel appointment.');
    }
  };

  // Open Feedback Modal
  const handleOpenFeedback = (docId: string | number) => {
    setFeedbackDoctorId(docId);
    setFeedbackRating(5);
    setFeedbackComment('');
    setIsFeedbackModalOpen(true);
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackDoctorId) return;
    setError(null);
    try {
      // POST /api/feedback { doctorId, rating, comment }
      await apiCreateFeedback({
        doctorId: feedbackDoctorId,
        rating: Number(feedbackRating),
        comment: feedbackComment,
      });
      setSuccessMessage('Thank you for rating your doctor!');
      setIsFeedbackModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit feedback.');
    }
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = user?.userId || (user as any)?.id;
    if (!uid) {
      setError('Patient ID is missing.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      // 1. Update user credentials (name & email)
      await apiUpdateUser(uid, {
        name: profileData.name,
        email: profileData.email,
        role: 'patient',
      });
      updateUserContext({ name: profileData.name, email: profileData.email });

      // 2. Update extended clinical profile
      const hCm =
        extendedProfile.heightCm !== '' && !isNaN(Number(extendedProfile.heightCm))
          ? Number(extendedProfile.heightCm)
          : null;
      const wKg =
        extendedProfile.weightKg !== '' && !isNaN(Number(extendedProfile.weightKg))
          ? Number(extendedProfile.weightKg)
          : null;

      await apiUpdatePatientProfile(uid, {
        dateOfBirth: extendedProfile.dateOfBirth.trim() || null,
        gender: extendedProfile.gender.trim() || null,
        bloodGroup: extendedProfile.bloodGroup.trim() || null,
        heightCm: hCm,
        weightKg: wKg,
        contact: extendedProfile.contact.trim() || null,
        address: extendedProfile.address.trim() || null,
        allergies: extendedProfile.allergies.trim() || null,
        chronicConditions: extendedProfile.chronicConditions.trim() || null,
        emergencyContactName: extendedProfile.emergencyContactName.trim() || null,
        emergencyContactPhone: extendedProfile.emergencyContactPhone.trim() || null,
      });

      setSuccessMessage('Patient profile and medical details updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      role="patient"
      title="Patient Care Portal"
      tabs={PATIENT_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Ensure Google Fonts are available */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-slate-700">
        {/* Error Banner */}
        {error && (
          <div
            className="border border-rose-200 bg-rose-50 text-rose-800 rounded-2xl p-4 flex items-start gap-3.5 text-sm shadow-xs"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium">{error}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            className="border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-2xl p-4 flex items-start gap-3.5 text-sm shadow-xs"
            role="alert"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-medium">{successMessage}</div>
            <button
              onClick={() => setSuccessMessage(null)}
              aria-label="Dismiss success message"
              className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header & Patient Pill Bar */}
        <div className="text-center max-w-2xl mx-auto pt-2 space-y-3">
          {/* Pill Badge matching reference design */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4EFE6] border border-[#EDE5D8] text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#258486] animate-pulse"></span>
            <span>Logged in as PATIENT</span>
            <span className="text-slate-400 font-normal">|</span>
            <span className="font-mono text-slate-600 font-semibold">ID #{patientId || 'N/A'}</span>
          </div>

          {/* Large Cormorant Garamond Serif Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-['Cormorant_Garamond',Georgia,serif] text-[#0E1A2C] tracking-tight font-normal leading-[1.1]">
            Patient Care Portal
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto font-normal">
            Compassionate clinical excellence, seamless consultation scheduling, and comprehensive personal health records.
          </p>

          {/* Small centered divider under heading */}
          <div className="w-12 h-0.5 bg-[#0E1A2C]/60 mx-auto mt-4 mb-2 rounded-full"></div>

          {/* Quick Refresh Row */}
          <div className="pt-1 flex justify-center">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-[#0E1A2C] bg-white hover:bg-[#F4EFE6] border border-[#ECE6DA] rounded-full transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#258486]' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
            </button>
          </div>
        </div>

        {/* Rounded-full Pill Navigation Tabs */}
        <div className="flex justify-center">
          <nav
            aria-label="Patient portal tabs"
            className="inline-flex flex-wrap items-center justify-center p-1.5 bg-[#F4EFE6]/80 border border-[#ECE6DA] rounded-full gap-1 shadow-xs max-w-full overflow-x-auto"
          >
            {PATIENT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0E1A2C] text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:text-[#0E1A2C] hover:bg-[#EDE5D8]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* =====================================================================
            TAB 1: BOOK APPOINTMENT
            ===================================================================== */}
        {activeTab === 'book' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Floating Booking Form Card (Reference Design style) */}
            <div className="bg-white rounded-3xl border border-[#ECE6DA] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)] p-6 sm:p-8 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#ECE6DA] mb-6 gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-[#258486] bg-[#E6F3F3] px-2.5 py-0.5 rounded-full mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#258486]"></span>
                    Appointment Booking &amp; Search
                  </div>
                  <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-2xl sm:text-3xl font-bold text-[#0E1A2C]">
                    Schedule New Consultation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select an available physician and pick your preferred consultation slot.
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-400 self-start sm:self-auto">
                  POST /api/appointments
                </div>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Select Doctor */}
                  <div className="relative">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                      Select Doctor / Specialist <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={bookingData.doctorId}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, doctorId: e.target.value })
                        }
                        required
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 pr-8 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent cursor-pointer appearance-none"
                      >
                        <option value="">-- Choose a Doctor --</option>
                        {doctors.length === 0 ? (
                          <option disabled value="">No doctors returned from /api/doctors</option>
                        ) : (
                          doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.name} {doc.specialty ? `— ${doc.specialty}` : ''} (ID: #{doc.id})
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Appointment Date */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                      Appointment Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingData.date}
                      onChange={(e) =>
                        setBookingData({ ...bookingData, date: e.target.value })
                      }
                      className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                  </div>

                  {/* Appointment Time */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                      Appointment Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={bookingData.time}
                      onChange={(e) =>
                        setBookingData({ ...bookingData, time: e.target.value })
                      }
                      className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#2B7A78] hover:bg-[#206361] text-white text-xs font-bold rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 active:scale-95 shadow-sm transition-all disabled:opacity-50 cursor-pointer h-[42px]"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>Confirm Appointment Booking</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-3 border-t border-[#ECE6DA]">
                  <span>GET /api/doctors: {doctors.length} specialists available</span>
                  <span>Instant slot confirmation</span>
                </div>
              </form>
            </div>

            {/* Doctor Profile Cards Showcase (Matching Reference "Doctor Profile" Section) */}
            <div className="space-y-4">
              <div className="text-center max-w-xl mx-auto pt-4">
                <h3 className="text-2xl sm:text-3xl font-['Cormorant_Garamond',Georgia,serif] text-[#0E1A2C] font-normal tracking-tight">
                  Doctor Profile
                </h3>
                <div className="w-12 h-0.5 bg-[#0E1A2C] mx-auto mt-2 mb-2 rounded-full opacity-60"></div>
                <p className="text-xs text-slate-500 font-normal">
                  Board-certified healthcare specialists available for immediate booking.
                </p>
              </div>

              {doctors.length === 0 ? (
                <div className="bg-white rounded-3xl border border-[#ECE6DA] p-8 text-center text-xs text-slate-400">
                  No doctor directory data currently loaded from <code className="font-mono">/api/doctors</code>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {doctors.map((doc) => {
                    const isSelected = String(bookingData.doctorId) === String(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className={`bg-white rounded-3xl p-4 border transition-all duration-300 flex flex-col group text-center ${
                          isSelected
                            ? 'border-[#258486] shadow-md ring-2 ring-[#258486]/20'
                            : 'border-[#ECE6DA] shadow-soft hover:shadow-card-lift hover:-translate-y-1'
                        }`}
                      >
                        {/* Avatar Tile */}
                        <div className="w-full h-40 rounded-2xl bg-[#F9F6F0] border border-[#ECE6DA] text-[#258486] flex flex-col items-center justify-center relative overflow-hidden mb-3.5 group-hover:bg-[#E6F3F3] transition-colors">
                          <div className="w-14 h-14 rounded-full bg-white/90 border border-[#ECE6DA] flex items-center justify-center text-xl font-bold font-['Cormorant_Garamond',Georgia,serif] text-[#0E1A2C] shadow-2xs">
                            {doc.name ? doc.name.replace(/^Dr\.\s*/i, '').charAt(0) : 'D'}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-1">
                            Specialist ID #{doc.id}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-[#0E1A2C] truncate">
                          {doc.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium mb-3 truncate">
                          {doc.specialty || 'General Practice'}
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setBookingData((prev) => ({ ...prev, doctorId: String(doc.id) }));
                            window.scrollTo({ top: 180, behavior: 'smooth' });
                          }}
                          className={`mt-auto w-full py-2 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#0E1A2C] text-white shadow-xs'
                              : 'text-[#0E1A2C] bg-[#F9F6F0] hover:bg-[#0E1A2C] hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Book Visit'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: MY APPOINTMENTS
            ===================================================================== */}
        {activeTab === 'my-appointments' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Stat Cards (Exact match to reference card tokens) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Stat 1 */}
              <div className="bg-white rounded-3xl p-6 border border-[#ECE6DA] shadow-soft hover:shadow-card-lift hover:-translate-y-1 transition-all duration-300 group flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    My Appointments
                  </span>
                  <div className="text-3xl sm:text-4xl font-['Cormorant_Garamond',Georgia,serif] font-bold text-[#0E1A2C] tabular-nums mt-1">
                    {myAppointments.length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Total scheduled</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F9F6F0] border border-[#ECE6DA] text-[#258486] flex items-center justify-center group-hover:bg-[#0E1A2C] group-hover:text-white transition-colors duration-300 shrink-0">
                  <CalendarCheck className="w-6 h-6" />
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white rounded-3xl p-6 border border-[#ECE6DA] shadow-soft hover:shadow-card-lift hover:-translate-y-1 transition-all duration-300 group flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Confirmed Consultations
                  </span>
                  <div className="text-3xl sm:text-4xl font-['Cormorant_Garamond',Georgia,serif] font-bold text-[#0E1A2C] tabular-nums mt-1">
                    {myAppointments.filter((a) => (a.status || '').toLowerCase() === 'confirmed').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Physician accepted</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F9F6F0] border border-[#ECE6DA] text-[#258486] flex items-center justify-center group-hover:bg-[#0E1A2C] group-hover:text-white transition-colors duration-300 shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white rounded-3xl p-6 border border-[#ECE6DA] shadow-soft hover:shadow-card-lift hover:-translate-y-1 transition-all duration-300 group flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Pending Approval
                  </span>
                  <div className="text-3xl sm:text-4xl font-['Cormorant_Garamond',Georgia,serif] font-bold text-[#0E1A2C] tabular-nums mt-1">
                    {myAppointments.filter((a) => (a.status || '').toLowerCase() === 'pending').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Awaiting clinic confirmation</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F9F6F0] border border-[#ECE6DA] text-[#258486] flex items-center justify-center group-hover:bg-[#0E1A2C] group-hover:text-white transition-colors duration-300 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Appointments Table Card */}
            <div className="bg-white rounded-3xl border border-[#ECE6DA] overflow-hidden shadow-soft">
              <div className="px-6 py-4 border-b border-[#ECE6DA] bg-[#F9F6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-xl font-bold text-[#0E1A2C]">
                    Consultation History &amp; Upcoming Visits
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track your scheduled appointments, clinical review statuses, and cancel or reschedule visits.
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-400 self-start sm:self-auto">
                  GET /api/appointments?patientId={patientId}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4EFE6] border-b border-[#ECE6DA] text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Doctor</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Time</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Notes</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE6DA]">
                    {myAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          {loading
                            ? 'Loading appointments...'
                            : 'You have no booked appointments yet. Use the "Book Appointment" tab to schedule one.'}
                        </td>
                      </tr>
                    ) : (
                      myAppointments.map((appt) => {
                        const statusKey = (appt.status || 'pending').toLowerCase();
                        const statusBadge = {
                          confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
                          pending: 'bg-amber-50 text-amber-800 border-amber-200/80',
                          cancelled: 'bg-rose-50 text-rose-700 border-rose-200/80',
                          completed: 'bg-[#E6F3F3] text-[#258486] border-[#258486]/30',
                        }[statusKey] || 'bg-amber-50 text-amber-800 border-amber-200/80';

                        return (
                          <tr key={appt.id} className="hover:bg-[#FCFBF8] transition-colors">
                            <td className="px-6 py-4 font-mono text-slate-500 tabular-nums">
                              #{appt.id}
                            </td>
                            <td className="px-6 py-4 font-semibold text-[#0E1A2C]">
                              {appt.doctorName || `Doctor #${appt.doctorId}`}
                            </td>
                            <td className="px-6 py-4 font-mono tabular-nums text-slate-700">
                              {appt.date}
                            </td>
                            <td className="px-6 py-4 font-mono tabular-nums text-slate-700">
                              {appt.time}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`capitalize text-xs font-semibold px-3 py-0.5 rounded-full border ${statusBadge}`}>
                                {appt.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">
                              {appt.notes || '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenReschedule(appt)}
                                  title="Reschedule Appointment"
                                  className="px-3.5 py-1 text-xs font-semibold text-[#0E1A2C] bg-[#F9F6F0] hover:bg-[#0E1A2C] hover:text-white border border-[#ECE6DA] rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Reschedule</span>
                                </button>
                                <button
                                  onClick={() => handleCancelAppointment(appt.id)}
                                  title="Cancel Appointment"
                                  className="px-3.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                                {appt.doctorId && (
                                  <button
                                    onClick={() => handleOpenFeedback(appt.doctorId)}
                                    title="Leave Review for Doctor"
                                    className="px-3.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    <span>Rate Doctor</span>
                                  </button>
                                )}
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

        {/* =====================================================================
            TAB 3: MEDICAL HISTORY
            ===================================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl border border-[#ECE6DA] p-6 sm:p-8 shadow-soft">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE6DA] mb-6 gap-2">
                <div>
                  <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-2xl sm:text-3xl font-bold text-[#0E1A2C]">
                    Your Clinical Medical History
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Read-only clinical observations and prescriptions from <code className="font-mono bg-[#F9F6F0] px-1.5 py-0.5 rounded text-[#0E1A2C] border border-[#ECE6DA]">GET /api/patients/{patientId}/medical-records</code>
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {medicalRecords.length} records logged
                </span>
              </div>

              {medicalRecords.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E6F3F3] text-[#258486] flex items-center justify-center mx-auto shadow-2xs">
                    <FileHeart className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    No medical records logged by your attending doctors yet.
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Once a physician completes a clinical consultation and prescribes medications, your diagnostic history will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {medicalRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-3xl border border-[#ECE6DA] p-6 shadow-soft hover:shadow-card-lift hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Meta row with teal icons */}
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-[#ECE6DA]">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Stethoscope className="w-3.5 h-3.5 text-[#258486]" />
                            <span>{record.doctorName || 'Attending Physician'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-[#258486]" />
                            <span>{record.date || 'Clinical Visit'}</span>
                          </div>
                        </div>

                        {/* Diagnosis as a semibold navy heading */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                            Diagnosis
                          </span>
                          <h4 className="text-base font-semibold text-[#0E1A2C]">
                            {record.diagnosis}
                          </h4>
                        </div>

                        {/* Prescription in slate-600 */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                            Prescription / Treatment
                          </span>
                          <p className="text-xs text-slate-600 font-mono bg-[#F9F6F0] p-3.5 rounded-2xl border border-[#ECE6DA] whitespace-pre-wrap leading-relaxed">
                            {record.prescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: PROFILE
            ===================================================================== */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-[#ECE6DA] p-6 sm:p-8 shadow-soft">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#ECE6DA] mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#F9F6F0] text-[#258486] border border-[#ECE6DA] flex items-center justify-center shadow-2xs">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-2xl sm:text-3xl font-bold text-[#0E1A2C]">
                      Personal Patient Profile
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Clinical records and health metrics synced with your primary care provider.
                    </p>
                  </div>
                </div>
                {isProfileLoading && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F3F3] text-[#258486] rounded-full text-xs font-semibold self-start sm:self-center">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading profile...</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-7">
                {/* 1. HEALTH SNAPSHOT */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-[#258486]" />
                    <h4 className="text-xs font-bold text-[#0E1A2C] uppercase tracking-wider">
                      Health Snapshot
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {/* Age */}
                    <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-3.5 text-center shadow-2xs transition-all hover:-translate-y-0.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Age
                      </span>
                      <span className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#0E1A2C]">
                        {computedAge !== null ? `${computedAge} yrs` : '—'}
                      </span>
                    </div>

                    {/* Blood Group */}
                    <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-3.5 text-center shadow-2xs transition-all hover:-translate-y-0.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Blood Group
                      </span>
                      <span className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#258486]">
                        {extendedProfile.bloodGroup || '—'}
                      </span>
                    </div>

                    {/* Height */}
                    <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-3.5 text-center shadow-2xs transition-all hover:-translate-y-0.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Height
                      </span>
                      <span className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#0E1A2C]">
                        {extendedProfile.heightCm ? `${extendedProfile.heightCm} cm` : '—'}
                      </span>
                    </div>

                    {/* Weight */}
                    <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-3.5 text-center shadow-2xs transition-all hover:-translate-y-0.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Weight
                      </span>
                      <span className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#0E1A2C]">
                        {extendedProfile.weightKg ? `${extendedProfile.weightKg} kg` : '—'}
                      </span>
                    </div>

                    {/* BMI */}
                    <div className="col-span-2 sm:col-span-1 bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-3.5 text-center shadow-2xs transition-all hover:-translate-y-0.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        BMI
                      </span>
                      <span className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#0E1A2C]">
                        {computedBmi.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. PERSONAL DETAILS */}
                <div className="space-y-3 pt-3 border-t border-[#ECE6DA]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#258486]" />
                    <h4 className="text-xs font-bold text-[#0E1A2C] uppercase tracking-wider">
                      Personal Details
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        placeholder="John Doe"
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({ ...profileData, email: e.target.value })
                        }
                        placeholder="patient@example.com"
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        max={todayDateStr}
                        value={extendedProfile.dateOfBirth}
                        onChange={(e) =>
                          setExtendedProfile({ ...extendedProfile, dateOfBirth: e.target.value })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Gender
                      </label>
                      <div className="relative">
                        <select
                          value={extendedProfile.gender}
                          onChange={(e) =>
                            setExtendedProfile({ ...extendedProfile, gender: e.target.value })
                          }
                          className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent appearance-none"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Age (Calculated Live)
                      </label>
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F9F6F0] border border-[#ECE6DA] rounded-xl text-xs font-medium text-slate-700">
                        <span className="font-semibold text-[#0E1A2C]">
                          {computedAge !== null ? `${computedAge} years old` : '—'}
                        </span>
                        {computedAge !== null && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6F3F3] text-[#258486] font-bold border border-[#258486]/30">
                            Calculated from DOB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. BODY MEASUREMENTS */}
                <div className="space-y-3 pt-3 border-t border-[#ECE6DA]">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#258486]" />
                    <h4 className="text-xs font-bold text-[#0E1A2C] uppercase tracking-wider">
                      Body Measurements
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Height (cm) <span className="text-slate-400 font-normal">[30 - 300]</span>
                      </label>
                      <input
                        type="number"
                        min={30}
                        max={300}
                        step="any"
                        placeholder="e.g. 175"
                        value={extendedProfile.heightCm}
                        onChange={(e) =>
                          setExtendedProfile({ ...extendedProfile, heightCm: e.target.value })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Weight (kg) <span className="text-slate-400 font-normal">[2 - 500]</span>
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={500}
                        step="any"
                        placeholder="e.g. 70"
                        value={extendedProfile.weightKg}
                        onChange={(e) =>
                          setExtendedProfile({ ...extendedProfile, weightKg: e.target.value })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Blood Group
                      </label>
                      <div className="relative">
                        <select
                          value={extendedProfile.bloodGroup}
                          onChange={(e) =>
                            setExtendedProfile({ ...extendedProfile, bloodGroup: e.target.value })
                          }
                          className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent appearance-none"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        BMI (Body Mass Index) Live Chip
                      </label>
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#F9F6F0] border border-[#ECE6DA] rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600">Calculated Value:</span>
                          <span className="font-bold text-[#0E1A2C] font-mono text-sm">
                            {computedBmi.label !== '—' ? `${computedBmi.label} kg/m²` : '—'}
                          </span>
                        </div>
                        {computedBmi.category && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[11px]">Classification:</span>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${computedBmi.badgeClass}`}>
                              {computedBmi.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. CONTACT & EMERGENCY */}
                <div className="space-y-3 pt-3 border-t border-[#ECE6DA]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#258486]" />
                    <h4 className="text-xs font-bold text-[#0E1A2C] uppercase tracking-wider">
                      Contact &amp; Emergency
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +1 (555) 234-5678"
                        value={extendedProfile.contact}
                        onChange={(e) =>
                          setExtendedProfile({ ...extendedProfile, contact: e.target.value })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +1 (555) 987-6543"
                        value={extendedProfile.emergencyContactPhone}
                        onChange={(e) =>
                          setExtendedProfile({
                            ...extendedProfile,
                            emergencyContactPhone: e.target.value,
                          })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah Doe (Spouse)"
                        value={extendedProfile.emergencyContactName}
                        onChange={(e) =>
                          setExtendedProfile({
                            ...extendedProfile,
                            emergencyContactName: e.target.value,
                          })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Residential Address
                      </label>
                      <input
                        type="text"
                        placeholder="123 Health Ave, Suite 400, City, State ZIP"
                        value={extendedProfile.address}
                        onChange={(e) =>
                          setExtendedProfile({ ...extendedProfile, address: e.target.value })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. MEDICAL BACKGROUND */}
                <div className="space-y-3 pt-3 border-t border-[#ECE6DA]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#258486]" />
                    <h4 className="text-xs font-bold text-[#0E1A2C] uppercase tracking-wider">
                      Medical Background
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Allergies &amp; Drug Sensitivities
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Penicillin, Peanuts, Latex, Aspirin (or 'None known')"
                        value={extendedProfile.allergies}
                        onChange={(e) =>
                          setExtendedProfile({ ...extendedProfile, allergies: e.target.value })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                        Chronic Conditions / Ongoing Illnesses
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Asthma, Hypertension, Type 2 Diabetes, Migraine (or 'None')"
                        value={extendedProfile.chronicConditions}
                        onChange={(e) =>
                          setExtendedProfile({
                            ...extendedProfile,
                            chronicConditions: e.target.value,
                          })
                        }
                        className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* SAVE ACTION */}
                <div className="pt-5 border-t border-[#ECE6DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Saves both your personal credentials and your clinical profile details.
                  </p>
                  <button
                    type="submit"
                    disabled={loading || isProfileLoading}
                    className="rounded-full px-7 py-2.5 bg-[#0E1A2C] hover:bg-[#16253B] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* =======================================================================
          MODAL: RESCHEDULE APPOINTMENT
          ======================================================================= */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0E1A2C]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setIsRescheduleModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#ECE6DA] overflow-hidden transform transition-all z-10 p-6 sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DA] mb-5">
              <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#0E1A2C]">
                {reschedulingAppt ? `Reschedule Appointment #${reschedulingAppt.id}` : 'Reschedule'}
              </h3>
              <button
                onClick={() => setIsRescheduleModalOpen(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-[#0E1A2C] p-1.5 rounded-full hover:bg-[#F9F6F0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReschedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                    New Date
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleData.date}
                    onChange={(e) =>
                      setRescheduleData({ ...rescheduleData, date: e.target.value })
                    }
                    className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                    New Time
                  </label>
                  <input
                    type="time"
                    required
                    value={rescheduleData.time}
                    onChange={(e) =>
                      setRescheduleData({ ...rescheduleData, time: e.target.value })
                    }
                    className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                  Reason / Notes for Doctor
                </label>
                <textarea
                  rows={3}
                  value={rescheduleData.notes}
                  onChange={(e) =>
                    setRescheduleData({ ...rescheduleData, notes: e.target.value })
                  }
                  placeholder="e.g. Need to reschedule due to scheduling conflict."
                  className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="pt-4 border-t border-[#ECE6DA] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#0E1A2C] bg-[#F9F6F0] hover:bg-[#EDE5D8] border border-[#ECE6DA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0E1A2C] hover:bg-[#16253B] shadow-sm active:scale-95 transition cursor-pointer"
                >
                  Submit Reschedule Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: DOCTOR FEEDBACK & RATING
          ======================================================================= */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0E1A2C]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setIsFeedbackModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#ECE6DA] overflow-hidden transform transition-all z-10 p-6 sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DA] mb-5">
              <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-bold text-[#0E1A2C]">
                Submit Doctor Feedback
              </h3>
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-[#0E1A2C] p-1.5 rounded-full hover:bg-[#F9F6F0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-2">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                        feedbackRating >= star
                          ? 'bg-amber-50 text-amber-500 border-amber-300 shadow-xs'
                          : 'bg-white text-slate-300 border-[#ECE6DA] hover:bg-[#F9F6F0]'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#0E1A2C] ml-2">
                    {feedbackRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1.5">
                  Your Review &amp; Comments
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Describe your consultation experience, physician clarity, bedside manner..."
                  className="w-full bg-white text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 border border-[#ECE6DA] shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="pt-4 border-t border-[#ECE6DA] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#0E1A2C] bg-[#F9F6F0] hover:bg-[#EDE5D8] border border-[#ECE6DA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0E1A2C] hover:bg-[#16253B] shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Submit Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
