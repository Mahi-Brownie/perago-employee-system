import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Badge, Button, Loader, Select, TextInput, Textarea } from '@mantine/core';

// =========================
// Types
// =========================
interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  address: string;
  managerId: string | null;
  children?: Employee[];
}

interface EmployeeFormData {
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  address: string;
  managerId: string | null;
}

interface FormErrors {
  name?: string;
  position?: string;
  department?: string;
  email?: string;
}

// =========================
// API Helpers
// =========================
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1',
});

const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await api.get('/employees');
  return response.data;
};

const getEmployeeById = async (id: string): Promise<Employee> => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

const createEmployee = async (payload: EmployeeFormData): Promise<Employee> => {
  const response = await api.post('/employees', payload);
  return response.data;
};

const updateEmployee = async (id: string, payload: EmployeeFormData): Promise<Employee> => {
  const response = await api.put(`/employees/${id}`, payload);
  return response.data;
};

const deleteEmployee = async (id: string): Promise<unknown> => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};

// =========================
// Tree Builder
// =========================
const buildTree = (employees: Employee[]): Employee[] => {
  const lookup = new Map<string, Employee>();

  employees.forEach((employee) => {
    lookup.set(employee.id, { ...employee, children: [] });
  });

  const roots: Employee[] = [];

  lookup.forEach((employee) => {
    if (!employee.managerId || !lookup.has(employee.managerId)) {
      roots.push(employee);
      return;
    }

    const manager = lookup.get(employee.managerId);
    if (manager) {
      manager.children = manager.children || [];
      manager.children.push(employee);
    } else {
      roots.push(employee);
    }
  });

  return roots;
};

const collectIds = (nodes: Employee[]): string[] => {
  const ids: string[] = [];
  const walk = (list: Employee[]) => {
    list.forEach((node) => {
      ids.push(node.id);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return ids;
};

const defaultForm = (): EmployeeFormData => ({
  name: '',
  position: '',
  department: '',
  email: '',
  phone: '',
  address: '',
  managerId: null,
});

const validateForm = (data: EmployeeFormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.name.trim()) errors.name = 'Name is required';
  if (!data.position.trim()) errors.position = 'Position is required';
  if (!data.department.trim()) errors.department = 'Department is required';
  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!data.email.includes('@')) {
    errors.email = 'Email must contain @';
  }

  return errors;
};

// =========================
// App Component
// =========================
function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<EmployeeFormData>(defaultForm());
  const [addErrors, setAddErrors] = useState<FormErrors>({});
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EmployeeFormData>(defaultForm());
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const previousTreeIds = useRef<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(employees), [employees]);
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedId) || null,
    [employees, selectedId]
  );

  const managerOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `${employee.name} - ${employee.position}`,
      })),
    [employees]
  );

  const editManagerOptions = useMemo(
    () => managerOptions.filter((option) => option.value !== selectedId),
    [managerOptions, selectedId]
  );

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllEmployees();
      const normalized = data.map((employee) => ({
        ...employee,
        id: String(employee.id),
        managerId: employee.managerId ? String(employee.managerId) : null,
      }));
      setEmployees(normalized);
    } catch (_fetchError) {
      setError('Failed to load employee hierarchy. Please check your API and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAddState = () => {
    setShowAddModal(false);
    setAddForm(defaultForm());
    setAddErrors({});
  };

  const updateAddForm = (field: keyof EmployeeFormData, value: string | null) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && addErrors.name) setAddErrors((prev) => ({ ...prev, name: undefined }));
    if (field === 'position' && addErrors.position) setAddErrors((prev) => ({ ...prev, position: undefined }));
    if (field === 'department' && addErrors.department) setAddErrors((prev) => ({ ...prev, department: undefined }));
    if (field === 'email' && addErrors.email) setAddErrors((prev) => ({ ...prev, email: undefined }));
  };

  const updateEditForm = (field: keyof EmployeeFormData, value: string | null) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && editErrors.name) setEditErrors((prev) => ({ ...prev, name: undefined }));
    if (field === 'position' && editErrors.position) setEditErrors((prev) => ({ ...prev, position: undefined }));
    if (field === 'department' && editErrors.department) setEditErrors((prev) => ({ ...prev, department: undefined }));
    if (field === 'email' && editErrors.email) setEditErrors((prev) => ({ ...prev, email: undefined }));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!employees.length) {
      setSelectedId(null);
      return;
    }

    const exists = employees.some((employee) => employee.id === selectedId);
    if (!exists) {
      setSelectedId(employees[0].id);
    }
  }, [employees, selectedId]);

  useEffect(() => {
    const ids = collectIds(tree);
    if (!ids.length) {
      previousTreeIds.current = new Set();
      setExpandedIds(new Set());
      return;
    }

    const currentIdSet = new Set(ids);
    setExpandedIds((prev) => {
      if (!previousTreeIds.current.size && !prev.size) {
        return currentIdSet;
      }

      const next = new Set(prev);
      ids.forEach((id) => {
        if (!previousTreeIds.current.has(id)) {
          next.add(id);
        }
      });

      Array.from(next).forEach((id) => {
        if (!currentIdSet.has(id)) next.delete(id);
      });

      return next;
    });

    previousTreeIds.current = currentIdSet;
  }, [tree]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSelectEmployee = async (id: string) => {
    setSelectedId(id);
    setPulseId(id);
    window.setTimeout(() => setPulseId((prev) => (prev === id ? null : prev)), 260);

    try {
      const full = await getEmployeeById(id);
      setEmployees((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...full,
                id,
                managerId: full.managerId ? String(full.managerId) : null,
              }
            : item
        )
      );
    } catch (_e) {
      // Keep the local selected record if the detail endpoint fails.
    }
  };

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateForm(addForm);
    setAddErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmittingAdd(true);
    try {
      await createEmployee(addForm);
      resetAddState();
      await fetchEmployees();
    } catch (_addError) {
      setAddErrors({ email: 'Could not create employee. Please try again.' });
    } finally {
      setSubmittingAdd(false);
    }
  };

  const startEdit = () => {
    if (!selectedEmployee) return;
    setIsEditing(true);
    setEditErrors({});
    setEditForm({
      name: selectedEmployee.name,
      position: selectedEmployee.position,
      department: selectedEmployee.department,
      email: selectedEmployee.email,
      phone: selectedEmployee.phone || '',
      address: selectedEmployee.address || '',
      managerId: selectedEmployee.managerId,
    });
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee) return;

    const errors = validateForm(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmittingEdit(true);
    try {
      await updateEmployee(selectedEmployee.id, editForm);
      setIsEditing(false);
      setEditErrors({});
      await fetchEmployees();
      setSelectedId(selectedEmployee.id);
    } catch (_editError) {
      setEditErrors({ email: 'Could not update employee. Please try again.' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    const directChildren = employees.filter((employee) => employee.managerId === selectedEmployee.id).length;
    const warning = directChildren
      ? 'This employee has subordinates. Deleting this record may also affect them. Continue?'
      : 'Are you sure you want to delete this employee?';

    if (!window.confirm(warning)) return;

    try {
      await deleteEmployee(selectedEmployee.id);
      setSelectedId(null);
      setIsEditing(false);
      await fetchEmployees();
    } catch (_deleteError) {
      setError('Failed to delete employee. Please try again.');
    }
  };

  const TreeNode = ({ node, depth = 0 }: { node: Employee; depth?: number }) => {
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const isHovered = hoveredId === node.id;
    const isRoot = depth === 0;

    const transform = pulseId === node.id ? 'scale(1.02)' : isHovered ? 'translateY(-2px)' : 'translateY(0)';

    return (
      <div style={{ marginBottom: 10 }}>
        <div
          role="button"
          tabIndex={0}
          style={{
            marginLeft: depth * 20,
            background: isRoot ? '#ebf2ff' : '#ffffff',
            border: isSelected ? '1px solid #2563eb' : '1px solid #d9dee8',
            boxShadow: isSelected ? '0 10px 20px rgba(37,99,235,0.18)' : '0 2px 8px rgba(15,23,42,0.08)',
            borderRadius: 12,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transform,
            transition: 'all 0.2s ease',
            animation: pulseId === node.id ? 'nodePulse 0.26s ease' : 'none',
          }}
          onMouseEnter={() => setHoveredId(node.id)}
          onMouseLeave={() => setHoveredId((current) => (current === node.id ? null : current))}
          onClick={() => onSelectEmployee(node.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectEmployee(node.id);
            }
          }}
        >
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse employee branch' : 'Expand employee branch'}
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) toggleExpand(node.id);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: hasChildren ? '#1f2937' : '#cbd5e1',
              fontSize: 13,
              cursor: hasChildren ? 'pointer' : 'default',
              width: 20,
              fontWeight: 700,
            }}
          >
            {hasChildren ? (isExpanded ? 'v' : '>') : '.'}
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{node.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{node.position}</div>
          </div>

          <Badge color="blue" variant="light" radius="sm">
            {node.children?.length || 0}
          </Badge>
        </div>

        {hasChildren && (
          <div
            style={{
              maxHeight: isExpanded ? 2200 : 0,
              opacity: isExpanded ? 1 : 0,
              overflow: 'hidden',
              transition: 'all 0.24s ease',
              marginTop: isExpanded ? 8 : 0,
            }}
          >
            {node.children?.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f1ed',
        padding: '24px 16px 40px',
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
      }}
    >
      <style>{`@keyframes nodePulse { 0% { transform: scale(0.995); } 60% { transform: scale(1.02); } 100% { transform: scale(1); } }`}</style>

      <header style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: 34, fontWeight: 700 }}>Organization Hierarchy</h1>
        <div style={{ width: 180, height: 4, margin: '10px auto 0', background: '#2563eb', borderRadius: 4 }} />
      </header>

      {error && (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto 14px',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>{error}</span>
          <Button color="red" size="xs" onClick={fetchEmployees}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader color="blue" size="lg" />
            <p style={{ marginTop: 10, color: '#374151' }}>Loading hierarchy...</p>
          </div>
        </div>
      ) : (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          <section style={{ background: '#f8fafc', border: '1px solid #d8dee9', borderRadius: 12, padding: 14 }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: 18 }}>Team Tree</h2>
              <Button color="blue" onClick={() => setShowAddModal(true)}>
                Add Employee
              </Button>
            </div>

            {!employees.length ? (
              <div style={{ color: '#4b5563', padding: 10 }}>
                No employees yet. Add the first position to build your hierarchy.
              </div>
            ) : (
              tree.map((node) => <TreeNode key={node.id} node={node} />)
            )}
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #d8dee9', borderRadius: 12, padding: 16 }}>
            {!selectedEmployee ? (
              <p style={{ color: '#6b7280', margin: 0 }}>Select an employee to view details.</p>
            ) : isEditing ? (
              <form onSubmit={handleEditSubmit}>
                <h2 style={{ marginTop: 0, color: '#111827' }}>Edit Employee</h2>

                <TextInput label="Name" value={editForm.name} onChange={(e) => updateEditForm('name', e.currentTarget.value)} />
                {editErrors.name && <div style={{ color: '#dc2626', fontSize: 12 }}>{editErrors.name}</div>}

                <TextInput mt={10} label="Position" value={editForm.position} onChange={(e) => updateEditForm('position', e.currentTarget.value)} />
                {editErrors.position && <div style={{ color: '#dc2626', fontSize: 12 }}>{editErrors.position}</div>}

                <TextInput mt={10} label="Department" value={editForm.department} onChange={(e) => updateEditForm('department', e.currentTarget.value)} />
                {editErrors.department && <div style={{ color: '#dc2626', fontSize: 12 }}>{editErrors.department}</div>}

                <TextInput mt={10} label="Email" value={editForm.email} onChange={(e) => updateEditForm('email', e.currentTarget.value)} />
                {editErrors.email && <div style={{ color: '#dc2626', fontSize: 12 }}>{editErrors.email}</div>}

                <TextInput mt={10} label="Phone" value={editForm.phone} onChange={(e) => updateEditForm('phone', e.currentTarget.value)} />
                <Textarea mt={10} label="Address" value={editForm.address} onChange={(e) => updateEditForm('address', e.currentTarget.value)} minRows={2} />
                <Select
                  mt={10}
                  label="Manager"
                  placeholder="Select manager"
                  searchable
                  clearable
                  data={editManagerOptions}
                  value={editForm.managerId}
                  onChange={(value) => updateEditForm('managerId', value || null)}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <Button type="submit" color="blue" loading={submittingEdit}>
                    Save
                  </Button>
                  <Button type="button" color="gray" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 12, color: '#111827' }}>{selectedEmployee.name}</h2>
                <p style={{ margin: '6px 0' }}>
                  <strong>Position:</strong> {selectedEmployee.position}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Department:</strong> {selectedEmployee.department}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Email:</strong> {selectedEmployee.email}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Phone:</strong> {selectedEmployee.phone || '-'}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Address:</strong> {selectedEmployee.address || '-'}
                </p>

                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <Button color="blue" onClick={startEdit}>
                    Edit
                  </Button>
                  <Button color="red" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 30,
            padding: 14,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget && !submittingAdd) {
              resetAddState();
            }
          }}
        >
          <form
            onSubmit={handleAddSubmit}
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#ffffff',
              borderRadius: 14,
              padding: 18,
              border: '1px solid #d8dee9',
              boxShadow: '0 20px 45px rgba(15,23,42,0.20)',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Add Employee</h3>

            <TextInput label="Name" value={addForm.name} onChange={(e) => updateAddForm('name', e.currentTarget.value)} />
            {addErrors.name && <div style={{ color: '#dc2626', fontSize: 12 }}>{addErrors.name}</div>}

            <TextInput mt={10} label="Position" value={addForm.position} onChange={(e) => updateAddForm('position', e.currentTarget.value)} />
            {addErrors.position && <div style={{ color: '#dc2626', fontSize: 12 }}>{addErrors.position}</div>}

            <TextInput mt={10} label="Department" value={addForm.department} onChange={(e) => updateAddForm('department', e.currentTarget.value)} />
            {addErrors.department && <div style={{ color: '#dc2626', fontSize: 12 }}>{addErrors.department}</div>}

            <TextInput mt={10} label="Email" value={addForm.email} onChange={(e) => updateAddForm('email', e.currentTarget.value)} />
            {addErrors.email && <div style={{ color: '#dc2626', fontSize: 12 }}>{addErrors.email}</div>}

            <TextInput mt={10} label="Phone" value={addForm.phone} onChange={(e) => updateAddForm('phone', e.currentTarget.value)} />
            <Textarea mt={10} label="Address" minRows={2} value={addForm.address} onChange={(e) => updateAddForm('address', e.currentTarget.value)} />

            <Select
              mt={10}
              label="Manager"
              placeholder="No manager (Root)"
              searchable
              clearable
              data={managerOptions}
              value={addForm.managerId}
              onChange={(value) => updateAddForm('managerId', value || null)}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button type="button" color="gray" onClick={resetAddState} disabled={submittingAdd}>
                Cancel
              </Button>
              <Button type="submit" color="blue" loading={submittingAdd}>
                Create
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
