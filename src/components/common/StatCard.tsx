import React from 'react';
import { Card } from '../ui/Card';

export interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  badgeText?: string;
  badgeType?: 'neutral' | 'success' | 'warning' | 'info';
  isHighlighted?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  badgeText,
  badgeType = 'neutral',
  isHighlighted = false,
}) => {
  const badgeClasses = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <Card
      hoverable
      className={`relative overflow-hidden ${
        isHighlighted ? 'border-emerald-300 ring-1 ring-emerald-500/10' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-emerald-600 shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        {subtext && <span className="text-slate-500 font-medium">{subtext}</span>}
        {badgeText && (
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badgeClasses[badgeType]}`}>
            {badgeText}
          </span>
        )}
      </div>
    </Card>
  );
};
