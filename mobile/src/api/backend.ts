import * as SecureStore from 'expo-secure-store';
import { AppConfig } from '../constants/config';

// URL del servidor cargada desde AppConfig (configurable mediante variables o config.ts)
export const API_URL = AppConfig.apiUrl;
 

async function getHeaders() {
  const token = await SecureStore.getItemAsync('auth_token');
  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token && token !== 'local-session-token') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  async get(endpoint: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async post(endpoint: string, data: any) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async patch(endpoint: string, data: any) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
