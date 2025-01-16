import axios from 'axios';

const BASE_URL = import.meta.env.PROD 
  ? 'https://lms-final.onrender.com/api/v1' 
  : 'https://lms-final.onrender.com/api/v1';

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);