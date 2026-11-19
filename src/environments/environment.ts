/**
 * Configuración dinámica de entorno para CITEF Frontend
 * Detecta automáticamente el hostname actual (IP pública o localhost)
 */
export const environment = {
  production: true,
  apiUrl: typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost'
    ? `http://${window.location.hostname}:3000`
    : 'http://localhost:3000',
  wsUrl: typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost'
    ? `http://${window.location.hostname}:3000`
    : 'http://localhost:3000',
};
