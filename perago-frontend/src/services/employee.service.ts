import { api } from './api';

export const employeeService = {
  getAll: () => api.get('/employees'),
  create: (data: any) => api.post('/employees', data),
  getHierarchy: () => api.get('/employees/hierarchy'),
};
