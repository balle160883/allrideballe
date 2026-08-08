// Configuración Global y Marca Blanca para Pro Mobile

export const AppConfig = {
  // Información de la Aplicación
  appName: 'Pro Mobile',
  appVersion: '1.0.0',
  companyName: 'Pro Mobile',

  // Configuración de API Backend
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://2.24.81.205:4000',

  // Configuración de Mapbox (cargado desde .env)
  mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg',

  // Datos de Contacto y Soporte Tecnico (Personalizables)
  support: {
    email: 'soporte@tu-dominio.com',
    phone: '+523300000000',
    formattedPhone: '(33) 0000-0000',
  },

  // Plantilla por Defecto para Tickets de Impresora Bluetooth
  ticket: {
    headerTitle: 'PRO MOBILE',
    footerPhone: '33 0000-0000',
    website: 'www.tu-dominio.com',
    privacyPolicyUrl: 'bit.ly/tu-privacidad',
    ticketTitlePrefix: 'Ticket Pro Mobile',
  },
};
