import { useState } from 'react';
import { authService } from '../services/auth.service';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await authService.login(username.trim(), password);
      localStorage.setItem('token', res.data.access_token);
      showToast('Login successful.', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (err) {
      console.error(err);
      showToast('Login failed. Check credentials and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: 24, border: '1px solid #ddd', borderRadius: 12 }}>
      <h1 style={{ marginBottom: 24 }}>Login</h1>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Username
        <input
          style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 6, border: '1px solid #ccc' }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          disabled={loading}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Password
        <input
          style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 6, border: '1px solid #ccc' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          disabled={loading}
        />
      </label>

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#0d47a1',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Signing in…' : 'Login'}
      </button>

      {toast && (
        <div
          style={{
            marginTop: 20,
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
  );
}
