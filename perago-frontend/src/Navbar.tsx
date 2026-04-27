import { useState } from 'react';

const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

export default function Navbar() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 20px',
      backgroundColor: '#0d47a1',
      color: 'white',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Employee Dashboard</div>
      <button
        onClick={logout}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          border: 'none',
          borderRadius: 4,
          padding: '10px 16px',
          backgroundColor: isHovering ? '#1976d2' : '#2196f3',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Logout
      </button>
    </nav>
  );
}
