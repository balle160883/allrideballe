'use client';

import { useState, useEffect } from 'react';
import { resetPassword } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Obtener el token de la URL en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      if (tokenParam) {
        setToken(tokenParam);
      } else {
        setError('Enlace de restablecimiento inválido o incompleto. Falta el token.');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Falta el token de restablecimiento.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña. El token podría haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 p-8 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Pro Mobile</h1>
          <p className="text-slate-400">Restablecer Contraseña</p>
        </div>

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="text-emerald-500 w-16 h-16 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">¡Contraseña Cambiada!</h3>
              <p className="text-sm text-slate-300">
                Tu contraseña ha sido restablecida exitosamente. Redirigiendo a la pantalla de inicio de sesión...
              </p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 font-semibold">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!token && !error ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-300 text-center leading-relaxed">
                  Ingresa tu nueva contraseña corporativa. Asegúrate de que sea segura.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Nueva Contraseña</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#334155] border-none text-white rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Confirmar Nueva Contraseña</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="w-full bg-[#334155] border-none text-white rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Repite la contraseña"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/20 transform active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Nueva Contraseña'
                  )}
                </button>
              </>
            )}

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-white font-semibold transition-all"
              >
                Volver al Inicio de Sesión
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
