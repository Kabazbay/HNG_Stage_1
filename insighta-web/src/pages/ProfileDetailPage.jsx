import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ProfileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get(`/api/v1/profiles/${id}`);
        setProfile(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Profile not found');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id]);

  if (loading) {
    return <div className="page-container"><div className="spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/profiles')}>
            ← Back to Profiles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button className="btn btn-back" onClick={() => navigate('/profiles')}>
        ← Back to Profiles
      </button>

      <div className="profile-detail-card">
        <div className="profile-detail-header">
          <h1 className="profile-name">{profile.name}</h1>
          <span className={`badge badge-lg badge-${profile.gender}`}>{profile.gender}</span>
        </div>

        <div className="profile-detail-grid">
          <div className="detail-item">
            <label>ID</label>
            <span className="detail-value mono">{profile.id}</span>
          </div>
          <div className="detail-item">
            <label>Gender Probability</label>
            <div className="probability-bar">
              <div className="probability-fill" style={{ width: `${(profile.gender_probability * 100)}%` }}></div>
              <span>{(profile.gender_probability * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="detail-item">
            <label>Age</label>
            <span className="detail-value">{profile.age} years old</span>
          </div>
          <div className="detail-item">
            <label>Age Group</label>
            <span className="badge">{profile.age_group}</span>
          </div>
          <div className="detail-item">
            <label>Country</label>
            <span className="detail-value">{profile.country_name} ({profile.country_id})</span>
          </div>
          <div className="detail-item">
            <label>Country Probability</label>
            <div className="probability-bar">
              <div className="probability-fill" style={{ width: `${(profile.country_probability * 100)}%` }}></div>
              <span>{(profile.country_probability * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="detail-item">
            <label>Created</label>
            <span className="detail-value">{new Date(profile.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileDetailPage;
