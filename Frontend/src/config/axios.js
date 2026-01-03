import axios from 'axios';
import { API_URL } from './api.js';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    // Token will be added per request where needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

