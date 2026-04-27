import { useEffect, useState } from 'react';
import { employeeService } from '../services/employee.service';
import Navbar from '../Navbar';

interface EmployeeFormValues {
  name: string;
  email: string;
  position: string;
  department: string;
  managerId: string;
}

export default function Dashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<EmployeeFormValues>({
    name: '',
    email: '',
    position: '',
    department: '',
    managerId: '',
  });
  const [errors, setErrors] = useState<Partial<EmployeeFormValues>>({});
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const fetchEmployees = async () => {
    setIsFetching(true);
    setFetchError('');

    try {
      const res = await employeeService.getAll();
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      setFetchError('Unable to load employees. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      window.location.href = '/';
      return;
    }

    fetchEmployees();
  }, []);

  const validateForm = () => {
    const nextErrors: Partial<EmployeeFormValues> = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required.';
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    }
    if (!form.position.trim()) {
      nextErrors.position = 'Position is required.';
    }
    if (!form.department.trim()) {
      nextErrors.department = 'Department is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createEmployee = async () => {
    setToast(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await employeeService.create({
        name: form.name.trim(),
        email: form.email.trim(),
        position: form.position.trim(),
        department: form.department.trim(),
        managerId: form.managerId.trim() || undefined,
      });

      setForm({
        name: '',
        email: '',
        position: '',
        department: '',
        managerId: '',
      });
      setErrors({});
      showToast('Employee created successfully.', 'success');
      fetchEmployees();
    } catch (err) {
      console.error(err);
      showToast('Could not create employee. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof EmployeeFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 20 }}>
      <Navbar />

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gap: 24 }}>
          <section style={{ padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <h2 style={{ marginBottom: 16 }}>Create Employee</h2>

            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Name*</span>
                <input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Name"
                  disabled={isSubmitting}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                />
                {errors.name && <span style={{ color: '#c62828' }}>{errors.name}</span>}
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Email*</span>
                <input
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Email"
                  disabled={isSubmitting}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                />
                {errors.email && <span style={{ color: '#c62828' }}>{errors.email}</span>}
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Position*</span>
                <input
                  value={form.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  placeholder="Position"
                  disabled={isSubmitting}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                />
                {errors.position && <span style={{ color: '#c62828' }}>{errors.position}</span>}
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Department*</span>
                <input
                  value={form.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="Department"
                  disabled={isSubmitting}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                />
                {errors.department && <span style={{ color: '#c62828' }}>{errors.department}</span>}
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Manager ID</span>
                <input
                  value={form.managerId}
                  onChange={(e) => handleChange('managerId', e.target.value)}
                  placeholder="Manager ID (optional)"
                  disabled={isSubmitting}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </label>

              <button
                onClick={createEmployee}
                disabled={isSubmitting}
                style={{
                  width: 160,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#0d47a1',
                  color: '#fff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Creating…' : 'Create Employee'}
              </button>

              {toast && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    backgroundColor: toast.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: toast.type === 'success' ? '#2e7d32' : '#c62828',
                  }}
                >
                  {toast.message}
                </div>
              )}
            </div>
          </section>

          <section style={{ padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <h2 style={{ marginBottom: 16 }}>Employee List</h2>

            {isFetching && <div>Loading employees…</div>}
            {fetchError && <div style={{ color: '#c62828' }}>{fetchError}</div>}

            {!isFetching && !fetchError && (
              <div style={{ display: 'grid', gap: 12 }}>
                {employees.map((e) => (
                  <div key={e.id} style={{ padding: 14, borderRadius: 10, border: '1px solid #e0e0e0' }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ color: '#555', fontSize: 14 }}>{e.position} • {e.department}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
