import React, { useEffect } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<ToastProps> = ({ id, title, message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const config = {
    success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    info: { icon: Info, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    error: { icon: X, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  };

  const { icon: Icon, color, bg, border } = config[type];

  return (
    <div className={`w-80 sm:w-96 bg-slate-900/90 backdrop-blur-2xl border ${border} rounded-3xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10 duration-500 mb-3`}>
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center shrink-0`}>
        <Icon size={24} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-black text-white tracking-tight">{title}</h4>
        <p className="text-xs text-slate-400 truncate">{message}</p>
      </div>
      <button onClick={() => onClose(id)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationToast;
