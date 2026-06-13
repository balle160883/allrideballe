"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Loader2 } from "lucide-react";
import AdminDashboard from "@/components/AdminDashboard";
import PasajeroDashboard from "@/components/PasajeroDashboard";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('auth_token');
    const userInfo = localStorage.getItem('user_info');

    if (!token || !userInfo) { router.push('/login'); return; }

    try {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      const admin =
        parsedUser.rol === 'admin' ||
        parsedUser.rol === 'admin_cliente' ||
        parsedUser.rol === 'admin_proveedor' ||
        parsedUser.rol === 'superadmin';
      setIsAdmin(admin);
    } catch {
      router.push('/login');
    }
  }, [router]);

  if (!isMounted || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!isAdmin && user.rol === 'pasajero') {
    return <PasajeroDashboard user={user} />;
  }

  return <AdminDashboard user={user} isAdmin={isAdmin} />;
}
