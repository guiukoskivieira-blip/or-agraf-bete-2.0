import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho de teclado rápido: pressionar "/" foca na busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 rounded-xl py-2 pl-9.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
      />
      <kbd className="hidden sm:inline-flex items-center absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded pointer-events-none">
        /
      </kbd>
    </div>
  );
};
