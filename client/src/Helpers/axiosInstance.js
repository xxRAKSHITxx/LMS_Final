import axios from 'axios';

const BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-render-url.onrender.com/api/v1' 
  : 'https://lms-final.onrender.com/api/v1';

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});