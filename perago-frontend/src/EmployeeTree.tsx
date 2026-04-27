import { useEffect, useState } from 'react';
import { api } from './services/api';

interface EmployeeNode {
  id: string;
  name: string;
  position: string;
  department: string;
  managerId?: string | null;
  subordinates?: EmployeeNode[];
}

const isNestedTree = (nodes: any[]): nodes is EmployeeNode[] => {
  return nodes.some((node) => Array.isArray(node.subordinates));
};

const normalizeToTree = (nodes: EmployeeNode[]): EmployeeNode[] => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return [];
  }

  if (isNestedTree(nodes)) {
    return nodes;
  }

  const lookup = new Map<string, EmployeeNode & { children: EmployeeNode[] }>();
  const roots: (EmployeeNode & { children: EmployeeNode[] })[] = [];

  nodes.forEach((node) => {
    lookup.set(node.id, { ...node, subordinates: [], children: [] });
  });

  nodes.forEach((node) => {
    const treeNode = lookup.get(node.id);
    if (!treeNode) return;

    if (node.managerId) {
      const parent = lookup.get(node.managerId);
      if (parent) {
        parent.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    } else {
      roots.push(treeNode);
    }
  });

  const attachChildren = (item: EmployeeNode & { children: EmployeeNode[] }) => {
    item.subordinates = item.children;
    item.children.forEach(attachChildren);
    delete item.children;
  };

  roots.forEach(attachChildren);
  return roots;
};

const nodeStyle = (selected: boolean) => ({
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  backgroundColor: selected ? '#d0e7ff' : '#f5f6f8',
  border: selected ? '1px solid #4a90e2' : '1px solid #ddd',
  marginBottom: 8,
});

const childrenContainerStyle = {
  marginLeft: 20,
  paddingLeft: 8,
  borderLeft: '1px dashed #ccc',
};

export default function EmployeeTree() {
  const [tree, setTree] = useState<EmployeeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHierarchy = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get<EmployeeNode[]>('/employees/hierarchy');
        setTree(normalizeToTree(response.data));
      } catch (err) {
        console.error('Failed to load employee hierarchy', err);
        setError('Unable to load employee hierarchy. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadHierarchy();
  }, []);

  const renderNode = (node: EmployeeNode) => {
    const isSelected = node.id === selectedId;

    return (
      <div key={node.id}>
        <div style={nodeStyle(isSelected)} onClick={() => setSelectedId(node.id)}>
          <div style={{ fontWeight: 600 }}>{node.name}</div>
          <div style={{ fontSize: 13, color: '#555' }}>
            {node.position} • {node.department}
          </div>
        </div>

        {node.subordinates && node.subordinates.length > 0 && (
          <div style={childrenContainerStyle}>
            {node.subordinates.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2>Employee Hierarchy</h2>

      {loading && <p>Loading employee hierarchy…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && tree.length === 0 && <p>No employee hierarchy available.</p>}

      {!loading && !error && tree.length > 0 && (
        <div>{tree.map((employee) => renderNode(employee))}</div>
      )}
    </div>
  );
}
