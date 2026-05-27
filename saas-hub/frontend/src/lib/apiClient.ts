import axios from 'axios';

function getToken(): string | null {
  try {
    const user = localStorage.getItem('hub_user');
    if (!user) return null;
    return JSON.parse(user).access_token ?? null;
  } catch { return null; }
}

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const apiClient = axios.create({ baseURL: BASE });

apiClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export default apiClient;
