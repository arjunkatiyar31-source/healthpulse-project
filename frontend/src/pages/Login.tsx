import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBanner } from '../components/Common/StatusBanner';
import { ApiConfigModal } from '../components/Common/ApiConfigModal';
import { getApiBaseUrl, apiCreateUser } from '../api/client';
import { UserRole } from '../types';
import {
  Activity,
  HeartPulse,
  Lock,
  Mail,
  UserCheck,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  User,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Tab state: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [email, setEmail] = useState('admin@healthpulse.com');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  // Sign Up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<'doctor' | 'patient'>('patient');
  const [signupSpecialty, setSignupSpecialty] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Switch role helper
  const handleSelectRole = (role: UserRole) => {
    if (activeTab === 'signup' && role === 'admin') {
      setErrorMessage('Administrator accounts cannot be self-registered.');
      return;
    }

    setSelectedRole(role);

    if (activeTab === 'login') {
      if (role === 'admin') {
        setEmail('admin@healthpulse.com');
        setPassword('admin123');
      } else if (role === 'doctor') {
        setEmail('doctor@healthpulse.com');
        setPassword('doctor123');
      } else {
        setEmail('patient@healthpulse.com');
        setPassword('patient123');
      }
    } else {
      setSignupRole(role as 'doctor' | 'patient');
    }
    setErrorMessage(null);
  };

  const handleTabSwitch = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (tab === 'signup' && selectedRole === 'admin') {
      setSelectedRole('patient');
      setSignupRole('patient');
    } else if (tab === 'signup') {
      setSignupRole(selectedRole as 'doctor' | 'patient');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await login(email, password);
      const effectiveRole = (res.role || selectedRole).toLowerCase();

      if (effectiveRole === 'admin') {
        navigate('/admin');
      } else if (effectiveRole === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/patient');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Login failed. Please check credentials or backend status.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side confirm password validation
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      await apiCreateUser(
        {
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          role: signupRole,
          specialty: signupRole === 'doctor' && signupSpecialty ? signupSpecialty : undefined,
        } as any,
        null
      );

      // On success: show success message, switch back to Login tab, pre-fill email
      setSuccessMessage('Account created! Please log in.');
      setEmail(signupEmail);
      setPassword('');
      setSelectedRole(signupRole);
      setActiveTab('login');

      // Clear sign up inputs
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupSpecialty('');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to create account. Please check your information.'
      );
    } finally {
      setLoading(false);
    }
  };

  const effectiveDisplayRole = (activeTab === 'signup' ? signupRole : selectedRole).toUpperCase();

  return (
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-emerald-500/20">
      {/* Full-Screen Hospital Interior Background Image with Crisp Overlay */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.02]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=2000&auto=format&fit=crop')`,
          }}
        />
        {/* Subtle white overlay so glass card has contrast without darkening */}
        <div className="absolute inset-0 bg-white/20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/10 to-white/35" />
      </div>

      {/* Header bar: fixed, transparent, children have pointer-events */}
      <header className="fixed top-0 inset-x-0 z-30 pointer-events-none px-6 py-5 flex items-center justify-between">
        {/* Left: small glass-pill logo badge */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-md border border-white/70 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-base font-bold tracking-tight text-slate-900 font-serif">
              HealthPulse
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
              Clinical OS
            </span>
          </div>
        </div>

        {/* Right (hidden on mobile): glass pill with backend URL and pulsing green dot */}
        <div className="pointer-events-auto hidden sm:flex items-center">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/50 hover:bg-white/75 backdrop-blur-md border border-white/70 text-slate-700 shadow-xs transition-all cursor-pointer text-xs"
            title="Configure Backend API URL"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
              {getApiBaseUrl()}
            </span>
          </button>
        </div>
      </header>

      {/* Center login card */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 pt-24 pb-8 sm:pt-26 sm:pb-8">
        <div
          className="w-full max-w-[440px] rounded-[2.5rem] border border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.12)] p-7 sm:p-9 relative my-auto"
          style={{
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          }}
        >
          {/* Card header badge & titles */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100/90 text-emerald-600 flex items-center justify-center border border-white/80 shadow-xs mx-auto mb-3">
              <Activity className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {activeTab === 'login' ? 'Welcome to HealthPulse' : 'Create Account'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {activeTab === 'login'
                ? 'Sign in to access your healthcare portal'
                : 'Join the HealthPulse clinical network today'}
            </p>
          </div>

          {/* Login/Sign Up toggle segmented control */}
          <div className="p-1 bg-white/40 backdrop-blur-xs rounded-full border border-white/60 mb-5 flex">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('signup')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Role selector: Patient / Doctor / Admin */}
          <div className="mb-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'patient' as UserRole, label: 'Patient', icon: User },
                { role: 'doctor' as UserRole, label: 'Doctor', icon: Stethoscope },
                { role: 'admin' as UserRole, label: 'Admin', icon: ShieldCheck },
              ].map((item) => {
                const isSelected =
                  (activeTab === 'signup' ? signupRole : selectedRole) === item.role;
                const isSignupAdmin = activeTab === 'signup' && item.role === 'admin';
                const Icon = item.icon;

                return (
                  <button
                    key={item.role}
                    type="button"
                    disabled={isSignupAdmin}
                    onClick={() => handleSelectRole(item.role)}
                    title={isSignupAdmin ? 'Admins cannot self-register' : undefined}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-500 scale-[1.02]'
                        : isSignupAdmin
                        ? 'bg-white/20 text-slate-400 border border-white/40 opacity-40 cursor-not-allowed'
                        : 'bg-white/40 hover:bg-white/70 text-slate-700 border border-white/60 shadow-2xs'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4">
              <StatusBanner
                type="error"
                message={errorMessage}
                onDismiss={() => setErrorMessage(null)}
              />
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4">
              <StatusBanner
                type="success"
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
              />
            </div>
          )}

          {activeTab === 'login' ? (
            /* =========================================================================
               LOGIN FORM
               ========================================================================= */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Utility row: Remember me & Forgot password */}
              <div className="flex items-center justify-between text-xs pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-800">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 transition-colors accent-emerald-600 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setErrorMessage('Password recovery is managed by your system administrator.')
                  }
                  className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Sign In as {effectiveDisplayRole}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  Calls <code className="font-mono text-slate-700">POST /api/auth/login</code> at your backend.
                </p>
              </div>
            </form>
          ) : (
            /* =========================================================================
               SIGN UP FORM
               ========================================================================= */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith or John Doe"
                    required
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Specialty (text, optional) — only shown when Doctor is selected */}
              {signupRole === 'doctor' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialty <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={signupSpecialty}
                      onChange={(e) => setSignupSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology, Neurology, General"
                      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                      className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register as {effectiveDisplayRole}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  Calls <code className="font-mono text-slate-700">POST /api/users</code> at your backend.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-500 font-medium mt-4 tracking-tight drop-shadow-xs text-center">
          &copy; 2026 HealthPulse Systems.
        </p>
      </main>

      {/* Backend API Configuration Modal */}
      <ApiConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};


