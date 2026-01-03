// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || '';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// Helper function to get API endpoint
// In development, uses relative path (vite proxy)
// In production, uses full API_URL
export const getApiUrl = (endpoint) => {
  if (API_URL && !endpoint.startsWith('http')) {
    // Production: use full URL
    return `${API_URL}${endpoint}`;
  }
  // Development: use relative path (vite proxy handles it)
  return endpoint;
};

