import React from 'react';
import { useAuth } from '../App';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

function AccountPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch (e) { /* ignore */ }
    setUser(null);
    navigate('/login');
  }

  if (!user) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Account</h1>
        <p className="page-subtitle">Your profile and settings</p>
      </div>
      <div className="account-card">
        <div className="account-header">
          {user.avatar_url && <img src={user.avatar_url} alt={user.username} className="account-avatar" />}
          <div>
            <h2>{user.username}</h2>
            <span className={`badge badge-lg ${user.role === 'admin' ? 'badge-admin' : 'badge-analyst'}`}>{user.role}</span>
          </div>
        </div>
        <div className="account-details">
          <div className="detail-item"><label>Email</label><span>{user.email || 'Not set'}</span></div>
          <div className="detail-item"><label>Member Since</label><span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span></div>
          <div className="detail-item"><label>Last Login</label><span>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A'}</span></div>
        </div>
        <div className="account-actions">
          <button onClick={handleLogout} className="btn btn-danger">Logout</button>
        </div>
      </div>
      <div className="section">
        <h2 className="section-title">Role Permissions</h2>
        <div className="permissions-grid">
          <div className="perm-item"><span>View Profiles</span><span className="perm-yes">✓</span></div>
          <div className="perm-item"><span>Search Profiles</span><span className="perm-yes">✓</span></div>
          <div className="perm-item"><span>Export CSV</span><span className="perm-yes">✓</span></div>
          <div className="perm-item"><span>Create Profiles</span><span className={user.role === 'admin' ? 'perm-yes' : 'perm-no'}>{user.role === 'admin' ? '✓' : '✗'}</span></div>
          <div className="perm-item"><span>Delete Profiles</span><span className={user.role === 'admin' ? 'perm-yes' : 'perm-no'}>{user.role === 'admin' ? '✓' : '✗'}</span></div>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
