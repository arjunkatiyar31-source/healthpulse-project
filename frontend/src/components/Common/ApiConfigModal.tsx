import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  DEFAULT_API_BASE_URL,
} from '../../api/client';
import { Server, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const clean = url.trim().replace(/\/+$/, '');
      // Try hitting /doctors or /settings or base
      const res = await fetch(`${clean}/doctors`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Connected successfully! Server responded with status ${res.status}.`,
        });
      } else {
        setTestResult({
          ok: true,
          message: `Server reachable at ${clean} (HTTP ${res.status}).`,
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message:
          err.message ||
          'Connection failed. Ensure your backend server is running and CORS is enabled.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(url);
    if (onSaved) onSaved();
    onClose();
  };

  const handleReset = () => {
    resetApiBaseUrl();
    setUrl(DEFAULT_API_BASE_URL);
    setTestResult(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Backend Connection Settings">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            API Base URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8080/api"
              className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-[#ECE6DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#258486]/30 focus:border-[#258486] font-mono text-slate-800"
              required
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] border border-[#ECE6DA] rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              {testing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Server className="w-3.5 h-3.5 text-[#258486]" />
              )}
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Target REST API endpoint. Default is <code className="bg-[#F4EFE6] px-1.5 py-0.5 rounded text-[#0E1A2C] font-mono text-[11px] border border-[#ECE6DA]">{DEFAULT_API_BASE_URL}</code>.
          </p>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              testResult.ok
                ? 'bg-[#E6F3F3] text-[#1D6C6E] border border-[#258486]/30'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-[#258486] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{testResult.message}</div>
          </div>
        )}

        <div className="pt-4 border-t border-[#ECE6DA] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-[#0E1A2C] underline underline-offset-2 transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#0E1A2C] bg-[#F4EFE6] hover:bg-[#EDE5D8] border border-[#ECE6DA] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0E1A2C] hover:bg-[#16253B] rounded-xl transition-all shadow-xs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
