import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'teal' | 'navy' | 'sky' | 'indigo' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'teal',
}) => {
  const iconTheme = {
    teal: 'bg-[#E6F3F3] text-[#258486] border border-[#258486]/20',
    navy: 'bg-[#0E1A2C] text-white border border-[#0E1A2C]',
    sky: 'bg-[#E6F3F3] text-[#258486] border border-[#258486]/20',
    indigo: 'bg-[#0E1A2C] text-white border border-[#0E1A2C]',
    slate: 'bg-[#F4EFE6] text-[#0E1A2C] border border-[#ECE6DA]',
  }[variant] || 'bg-[#E6F3F3] text-[#258486] border border-[#258486]/20';

  return (
    <div className="bg-[#FCFBF8] border border-[#ECE6DA] rounded-2xl p-6 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_35px_-10px_rgba(14,26,44,0.08)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
          {title}
        </span>
        <div className="text-3xl lg:text-4xl font-serif font-bold text-[#0E1A2C] tracking-tight tabular-nums mt-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
      <div className={`p-3.5 rounded-xl ${iconTheme} shrink-0 shadow-2xs`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

