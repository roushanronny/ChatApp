import axios from 'axios';
import { API_URL } from './api.js';
import { getToken } from '../utils/getToken.js';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token automatically
api.interceptors.request.use(
  (config) => {
    // Automatically add token from cookies/localStorage
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

