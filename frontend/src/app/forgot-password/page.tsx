'use client';

import { useState } from 'react';
import { forgotPassword } from '@/lib/api';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 p-8 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Pro Mobile</h1>
          <p className="text-slate-400">Recuperación de Contraseña</p>
        </div>

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="text-emerald-500 w-16 h-16 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">¡Enlace Enviado!</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Si la cuenta <strong>{email}</strong> está registrada en nuestro sistema, recibirás un correo electrónico con instrucciones para restablecer tu contraseña.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-all"
              >
                <ArrowLeft size={16} /> Volver al Inicio de Sesión
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-semibold">
                {error}
              </div>
            )}

            <p className="text-sm text-slate-300 text-center leading-relaxed">
              Ingresa tu correo electrónico corporativo registrado y te enviaremos un enlace de recuperación seguro.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#334155] border-none text-white rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 font-medium"
                  placeholder="usuario@tuempresa.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/20 transform active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Enviando enlace...
                </>
              ) : (
                'Enviar Enlace de Recuperación'
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold transition-all"
              >
                <ArrowLeft size={14} /> Volver al Inicio de Sesión
              </Link>
            </div>
          </form>
        )}

        <div className="pt-4 text-center border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            Sistema de Transporte y Control v2.0<br/>
            © 2026 Pro Mobile AllRide
          </p>
        </div>
      </div>
    </div>
  );
}
