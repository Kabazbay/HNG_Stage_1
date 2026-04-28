import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './utils/api';

import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilesPage from './pages/ProfilesPage';
import ProfileDetailPage from './pages/ProfileDetailPage';
import SearchPage from './pages/SearchPage';
import AccountPage from './pages/AccountPage';

// ── Auth Context ──
// This lets any component access the current user without passing props
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, check if user is logged in by calling /auth/me
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Insighta Labs+...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        {user && <Navbar />}
        <main className={user ? 'main-content' : ''}>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
            <Route path="/profiles" element={user ? <ProfilesPage /> : <Navigate to="/login" />} />
            <Route path="/profiles/:id" element={user ? <ProfileDetailPage /> : <Navigate to="/login" />} />
            <Route path="/search" element={user ? <SearchPage /> : <Navigate to="/login" />} />
            <Route path="/account" element={user ? <AccountPage /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
