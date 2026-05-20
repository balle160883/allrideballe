import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../api/backend';

interface User {
  id: string;
  email: string;
  gestor: string;
  rol: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  proximityAlertsEnabled: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  setProximityAlertsEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [proximityAlertsEnabled, setProximityAlertsEnabledState] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const authDataSerialized = await SecureStore.getItemAsync('auth_token');
      const userDataSerialized = await SecureStore.getItemAsync('user_info');
      const proximityEnabled = await SecureStore.getItemAsync('proximity_enabled');

      if (authDataSerialized && userDataSerialized) {
        setUser(JSON.parse(userDataSerialized));
      }

      if (proximityEnabled !== null) {
        setProximityAlertsEnabledState(proximityEnabled === 'true');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const setProximityAlertsEnabled = async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('proximity_enabled', enabled.toString());
      setProximityAlertsEnabledState(enabled);
    } catch (e) {
      console.error('Error saving proximity setting:', e);
    }
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass })
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas o usuario no encontrado');
      }

      const data = await response.json(); // { access_token, user: { id, email, gestor } }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        gestor: data.user.nombre || data.user.gestor || data.user.email,
        rol: data.user.rol || 'pasajero'
      };

      await SecureStore.setItemAsync('auth_token', data.access_token);
      await SecureStore.setItemAsync('user_info', JSON.stringify(userData));
      
      setUser(userData as any);
    } catch (error: any) {
       console.error(error);
       throw error;
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_info');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      proximityAlertsEnabled, 
      signIn, 
      signOut, 
      setProximityAlertsEnabled 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
