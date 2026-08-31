import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, className = '', id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3.5 text-slate-400 pointer-events-none">{icon}</div>}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`w-full bg-white border rounded-xl py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 outline-none transition-all shadow-xs ${
              disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-slate-300'
            } ${icon ? 'pl-10 pr-3.5' : 'px-3.5'} ${
              error ? 'border-rose-500 ring-rose-500/20' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
