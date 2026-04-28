import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch profiles to compute basic metrics
        const [allRes, maleRes, femaleRes] = await Promise.all([
          api.get('/api/v1/profiles', { params: { limit: 1 } }),
          api.get('/api/v1/profiles', { params: { gender: 'male', limit: 1 } }),
          api.get('/api/v1/profiles', { params: { gender: 'female', limit: 1 } }),
        ]);

        const total = allRes.data.pagination?.total || allRes.data.total || 0;
        const males = maleRes.data.pagination?.total || maleRes.data.total || 0;
        const females = femaleRes.data.pagination?.total || femaleRes.data.total || 0;

        // Fetch age group counts
        const [childRes, teenRes, adultRes, seniorRes] = await Promise.all([
          api.get('/api/v1/profiles', { params: { age_group: 'child', limit: 1 } }),
          api.get('/api/v1/profiles', { params: { age_group: 'teenager', limit: 1 } }),
          api.get('/api/v1/profiles', { params: { age_group: 'adult', limit: 1 } }),
          api.get('/api/v1/profiles', { params: { age_group: 'senior', limit: 1 } }),
        ]);

        setStats({
          total,
          males,
          females,
          children: childRes.data.pagination?.total || childRes.data.total || 0,
          teenagers: teenRes.data.pagination?.total || teenRes.data.total || 0,
          adults: adultRes.data.pagination?.total || adultRes.data.total || 0,
          seniors: seniorRes.data.pagination?.total || seniorRes.data.total || 0,
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="page-container"><div className="spinner"></div></div>;
  }

  if (!stats) {
    return <div className="page-container"><p>Failed to load dashboard data.</p></div>;
  }

  const malePercent = stats.total > 0 ? ((stats.males / stats.total) * 100).toFixed(1) : 0;
  const femalePercent = stats.total > 0 ? ((stats.females / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Profile Intelligence Overview</p>
      </div>

      {/* Main Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-value">{stats.total.toLocaleString()}</div>
          <div className="stat-label">Total Profiles</div>
        </div>
        <div className="stat-card stat-card-blue">
          <div className="stat-value">{stats.males.toLocaleString()}</div>
          <div className="stat-label">Male ({malePercent}%)</div>
        </div>
        <div className="stat-card stat-card-pink">
          <div className="stat-value">{stats.females.toLocaleString()}</div>
          <div className="stat-label">Female ({femalePercent}%)</div>
        </div>
      </div>

      {/* Age Group Breakdown */}
      <div className="section">
        <h2 className="section-title">Age Group Distribution</h2>
        <div className="stats-grid stats-grid-4">
          <div className="stat-card">
            <div className="stat-icon">👶</div>
            <div className="stat-value">{stats.children.toLocaleString()}</div>
            <div className="stat-label">Children (0-12)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧑</div>
            <div className="stat-value">{stats.teenagers.toLocaleString()}</div>
            <div className="stat-label">Teenagers (13-19)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👨‍💼</div>
            <div className="stat-value">{stats.adults.toLocaleString()}</div>
            <div className="stat-label">Adults (20-59)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👴</div>
            <div className="stat-value">{stats.seniors.toLocaleString()}</div>
            <div className="stat-label">Seniors (60+)</div>
          </div>
        </div>
      </div>

      {/* Gender Distribution Bar */}
      <div className="section">
        <h2 className="section-title">Gender Distribution</h2>
        <div className="gender-bar-container">
          <div className="gender-bar">
            <div className="gender-bar-male" style={{ width: `${malePercent}%` }}>
              {malePercent}% Male
            </div>
            <div className="gender-bar-female" style={{ width: `${femalePercent}%` }}>
              {femalePercent}% Female
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
