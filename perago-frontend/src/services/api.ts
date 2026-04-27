import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const logout = () => {
  setAuthToken(null);
  window.location.href = '/login';
};

api.interceptors.request.use((config: any) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success) {
        return { ...response, data: response.data.data };
      }

      return Promise.reject({
        statusCode: response.data.statusCode,
        message: response.data.message,
        path: response.data.path,
        timestamp: response.data.timestamp,
      });
    }

    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      logout();
    }
    return Promise.reject(error);
  },
);
