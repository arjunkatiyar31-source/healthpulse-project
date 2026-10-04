import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface StatusBannerProps {
  type?: 'error' | 'success' | 'info';
  message: string | null;
  details?: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  type = 'error',
  message,
  details,
  onDismiss,
  onRetry,
  className = '',
}) => {
  if (!message) return null;

  const colorStyles = {
    error: 'bg-rose-50 border-rose-200/80 text-rose-800',
    success: 'bg-[#E6F3F3] border-[#258486]/30 text-[#1D6C6E]',
    info: 'bg-[#F4EFE6] border-[#ECE6DA] text-[#0E1A2C]',
  }[type];

  const Icon = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
  }[type];

  return (
    <div
      className={`border rounded-xl p-4 flex items-start gap-3.5 text-sm shadow-2xs ${colorStyles} ${className}`}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug">{message}</p>
        {details && (
          <p className="text-xs opacity-90 mt-1 font-mono break-all">{details}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
