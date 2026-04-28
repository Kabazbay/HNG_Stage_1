import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../utils/api';

function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore errors
    }
    setUser(null);
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">◆</span>
        <span className="navbar-title">Insighta Labs+</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/profiles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Profiles
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Search
        </NavLink>
      </div>

      <div className="navbar-user">
        <NavLink to="/account" className="nav-user-link">
          {user?.avatar_url && <img src={user.avatar_url} alt="" className="nav-avatar" />}
          <span>{user?.username}</span>
        </NavLink>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
