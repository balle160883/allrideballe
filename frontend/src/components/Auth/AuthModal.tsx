import React, { useState } from 'react';
import { X, Mail, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';

    try {
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email,
        password,
        fullName: !isLogin ? fullName : undefined
      });

      if (isLogin) {
        localStorage.setItem('token', response.data.token);
        onSuccess(response.data.user);
        onClose();
      } else {
        // Después de registrar, pasar a login automáticamente
        setIsLogin(true);
        alert('✅ Registro exitoso. Por favor inicia sesión.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="glass-morphism w-full max-w-md rounded-3xl p-8 text-white relative shadow-2xl animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold">{isLogin ? 'Bienvenido de nuevo' : 'Únete a AllRide'}</h2>
          <p className="text-slate-400 text-sm mt-1">
            {isLogin ? 'Accede a tu red de movilidad corporativa' : 'Empieza a compartir viajes con tu comunidad'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Nombre Completo"
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-primary transition-all text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="email"
              placeholder="Correo Electrónico (Institucional)"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-primary transition-all text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="password"
              placeholder="Contraseña"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-primary transition-all text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-400/10 p-3 rounded-lg border border-rose-400/20">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full py-4 bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 transition-all rounded-xl font-bold shadow-lg shadow-indigo-500/20 mt-4"
          >
            {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya eres miembro?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-brand-primary font-semibold hover:underline"
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
