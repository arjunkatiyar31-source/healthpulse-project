import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiConfigModal } from '../Common/ApiConfigModal';
import { getApiBaseUrl } from '../../api/client';
import {
  LogOut,
  Settings as SettingsIcon,
  Menu,
  X,
  Activity,
  User as UserIcon,
  LucideIcon,
  CircleDot,
  Plus,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  role: 'admin' | 'doctor' | 'patient';
  title: string;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  role,
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    admin: 'Administrator',
    doctor: 'Doctor / Physician',
    patient: 'Patient Portal',
  }[role];

  const sectionHeader = {
    admin: 'ADMINISTRATION',
    doctor: 'CLINICAL',
    patient: 'PATIENT PORTAL',
  }[role];

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col font-sans text-slate-700">
      {/* Sticky Top Header */}
      <header className="h-20 bg-[#F9F6F0]/90 backdrop-blur-md border-b border-[#ECE6DA] sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark with navy square logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-[#0E1A2C] rounded-xl hover:bg-[#F4EFE6] transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <span className="w-8 h-8 rounded-lg bg-[#0E1A2C] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:bg-[#16253B] transition-colors">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </span>
            <span className="font-serif text-2xl font-bold text-[#0E1A2C] tracking-tight">
              HealthPulse
            </span>
          </a>
        </div>

        {/* Zone 2: Clean breadcrumb matching active page */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>{roleLabel}</span>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span className="text-[#0E1A2C] font-serif font-semibold text-sm capitalize">{activeTab}</span>
        </div>

        {/* Zone 3: Actions & User session */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            title="Configure API Endpoint"
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-[#0E1A2C] hover:bg-[#F4EFE6] rounded-full border border-[#ECE6DA] bg-[#FCFBF8] transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <CircleDot className="w-3.5 h-3.5 text-[#258486]" />
            <span className="hidden sm:inline font-mono text-[11px] truncate max-w-[130px]">
              {getApiBaseUrl().replace(/^https?:\/\//, '')}
            </span>
            <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[#ECE6DA] text-xs">
            <div className="w-8 h-8 rounded-full bg-[#E6F3F3] text-[#258486] border border-[#258486]/30 flex items-center justify-center font-bold text-xs shadow-2xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left leading-tight">
              <span className="font-semibold text-[#0E1A2C] block truncate max-w-[120px]">
                {user?.name || 'User'}
              </span>
              <span className="text-[11px] text-slate-500 capitalize block">
                {user?.role || role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#0E1A2C] hover:text-white border border-[#ECE6DA] rounded-full transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-[#F9F6F0] border-r border-[#ECE6DA] p-5 shrink-0">
          <div className="mb-4 px-3">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              {sectionHeader}
            </span>
          </div>
          <nav className="space-y-1.5 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-[#0E1A2C] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0E1A2C] hover:bg-[#EDE5D8]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick backend notice in footer */}
          <div className="pt-4 border-t border-[#ECE6DA] text-xs text-slate-500">
            <div className="flex items-center gap-2 text-slate-700">
              <Activity className="w-3.5 h-3.5 text-[#258486] shrink-0" />
              <span className="text-[11px] font-semibold">Backend Target</span>
            </div>
            <p className="font-mono text-[10px] text-slate-400 truncate mt-1">
              {getApiBaseUrl()}
            </p>
          </div>
        </aside>

        {/* Sidebar Mobile Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-[#0E1A2C]/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-[#FCFBF8] border-r border-[#ECE6DA] h-full p-5 flex flex-col z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DA] mb-4">
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{sectionHeader}</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-[#0E1A2C] rounded-full hover:bg-[#F4EFE6]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1.5 flex-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabChange(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-colors text-left ${
                        isActive
                          ? 'bg-[#0E1A2C] text-white shadow-xs'
                          : 'text-slate-600 hover:text-[#0E1A2C] hover:bg-[#EDE5D8]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#ECE6DA]">
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0E1A2C]">
                  {title}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage operations, records, and appointments smoothly in real time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-[#E6F3F3] text-[#258486] border border-[#258486]/30 font-medium shadow-2xs">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Logged in as {user?.role || role}</span>
                </span>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>

      <ApiConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};

