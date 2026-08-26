/**
 * @file NotificationContext.tsx
 * @description Sistema de avisos rápidos e informativos para feedback de interface (Light Theme)
 * @project OrçaGraf
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Info, CheckCircle2, AlertTriangle, X, XCircle } from 'lucide-react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextValue {
  showNotice: (title: string, message: string, type?: NotificationType) => void;
  clearNotice: (id: string) => void;
  activeModal: { title: string; content: string } | null;
  openFoundationModal: (title: string, content: string) => void;
  closeFoundationModal: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeModal, setActiveModal] = useState<{ title: string; content: string } | null>(null);

  const showNotice = (title: string, message: string, type: NotificationType = 'info') => {
    const id = 'notif_' + Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const clearNotice = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const openFoundationModal = (title: string, content: string) => {
    setActiveModal({ title, content });
  };

  const closeFoundationModal = () => {
    setActiveModal(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotice,
        clearNotice,
        activeModal,
        openFoundationModal,
        closeFoundationModal,
      }}
    >
      {children}

      {/* Floating Notifications Toaster */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {notifications.map(item => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-xs transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              item.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                : item.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10'
                : item.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-500/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {item.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {item.type === 'error' && <XCircle className="w-5 h-5 text-rose-600" />}
              {item.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold leading-tight">{item.title}</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
            </div>

            <button
              onClick={() => clearNotice(item.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
