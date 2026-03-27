import { useState, useCallback } from 'react';
import { signIn, signUp } from '../services/auth-service';
import type { UserProfile, UserRole } from '../services/supabase';

interface LoginPageProps {
  onLogin: (user: UserProfile) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');

    const result = isRegister
      ? await signUp(username.trim(), password, role)
      : await signIn(username.trim(), password);

    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.user) onLogin(result.user);
  }, [username, password, role, isRegister, onLogin]);

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', color: '#eee', fontSize: 24, marginBottom: 8 }}>
        轨迹画廊 TrackGallery
      </h1>
      <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 32 }}>
        {isRegister ? '创建新账号' : '登录你的账号'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="text" placeholder="用户名" value={username}
          onChange={e => setUsername(e.target.value)}
          style={inputStyle} />
        <input type="password" placeholder="密码（至少6位）" value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle} />

        {isRegister && (
          <div style={{ display: 'flex', gap: 8 }}>
            {(['user', 'admin'] as UserRole[]).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{
                flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: role === r ? '2px solid #4a9eff' : '1px solid #555',
                background: role === r ? 'rgba(74,158,255,0.15)' : '#2a2a2a',
                color: role === r ? '#4a9eff' : '#ccc',
              }}>
                {r === 'admin' ? '管理员' : '普通用户'}
              </button>
            ))}
          </div>
        )}

        {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{
          padding: '10px 0', borderRadius: 8, border: 'none',
          background: '#4a9eff', color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
        }}>
          {loading ? '处理中…' : isRegister ? '注册' : '登录'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
        {isRegister ? '已有账号？' : '没有账号？'}
        <button onClick={() => { setIsRegister(p => !p); setError(''); }} style={{
          background: 'none', border: 'none', color: '#4a9eff', cursor: 'pointer', fontSize: 13,
        }}>
          {isRegister ? '去登录' : '注册一个'}
        </button>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid #555',
  background: '#2a2a2a', color: '#eee', fontSize: 14,
};
