import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const routeApi = {
  calculateRoute: async (origin: { lng: number, lat: number }, destination: { lng: number, lat: number }) => {
    const response = await axios.post(`${API_URL}/api/v1/routes/calculate`, {
      origin,
      destination
    });
    return response.data;
  },
  
  getRides: async () => {
    const response = await axios.get(`${API_URL}/api/v1/routes/rides`);
    return response.data;
  }
};
