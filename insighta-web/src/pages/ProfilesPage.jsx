import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Pagination from '../components/Pagination';

function ProfilesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    gender: '',
    country_id: '',
    age_group: '',
    min_age: '',
    max_age: '',
    sort_by: 'created_at',
    order: 'desc',
    page: 1,
    limit: 15,
  });

  async function fetchProfiles(overrides = {}) {
    setLoading(true);
    try {
      const params = { ...filters, ...overrides };
      // Remove empty string params
      Object.keys(params).forEach(k => {
        if (params[k] === '') delete params[k];
      });

      const res = await api.get('/api/v1/profiles', { params });
      setProfiles(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  }

  function handleApplyFilters(e) {
    e.preventDefault();
    fetchProfiles({ page: 1 });
  }

  function handlePageChange(newPage) {
    setFilters(prev => ({ ...prev, page: newPage }));
    fetchProfiles({ page: newPage });
  }

  function handleClearFilters() {
    const cleared = {
      gender: '', country_id: '', age_group: '',
      min_age: '', max_age: '',
      sort_by: 'created_at', order: 'desc', page: 1, limit: 15,
    };
    setFilters(cleared);
    fetchProfiles(cleared);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Profiles</h1>
        <p className="page-subtitle">Browse and filter demographic profiles</p>
      </div>

      {/* Filter Form */}
      <form className="filters-bar" onSubmit={handleApplyFilters}>
        <select name="gender" value={filters.gender} onChange={handleFilterChange}>
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <input
          type="text"
          name="country_id"
          placeholder="Country (e.g. NG)"
          value={filters.country_id}
          onChange={handleFilterChange}
          maxLength={2}
        />

        <select name="age_group" value={filters.age_group} onChange={handleFilterChange}>
          <option value="">All Ages</option>
          <option value="child">Child (0-12)</option>
          <option value="teenager">Teenager (13-19)</option>
          <option value="adult">Adult (20-59)</option>
          <option value="senior">Senior (60+)</option>
        </select>

        <input
          type="number"
          name="min_age"
          placeholder="Min Age"
          value={filters.min_age}
          onChange={handleFilterChange}
          min={0}
        />
        <input
          type="number"
          name="max_age"
          placeholder="Max Age"
          value={filters.max_age}
          onChange={handleFilterChange}
          min={0}
        />

        <select name="sort_by" value={filters.sort_by} onChange={handleFilterChange}>
          <option value="created_at">Sort: Date</option>
          <option value="age">Sort: Age</option>
          <option value="name">Sort: Name</option>
        </select>

        <select name="order" value={filters.order} onChange={handleFilterChange}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        <button type="submit" className="btn btn-primary btn-sm">Apply</button>
        <button type="button" className="btn btn-sm" onClick={handleClearFilters}>Clear</button>
      </form>

      {/* Profiles Table */}
      {loading ? (
        <div className="spinner"></div>
      ) : profiles.length === 0 ? (
        <div className="empty-state">
          <p>No profiles found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Age Group</th>
                  <th>Country</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(profile => (
                  <tr key={profile.id} onClick={() => navigate(`/profiles/${profile.id}`)} className="clickable-row">
                    <td className="name-cell">{profile.name}</td>
                    <td>
                      <span className={`badge badge-${profile.gender}`}>
                        {profile.gender}
                      </span>
                    </td>
                    <td>{profile.age}</td>
                    <td><span className="badge">{profile.age_group}</span></td>
                    <td>{profile.country_name || profile.country_id}</td>
                    <td>{profile.gender_probability ? `${(profile.gender_probability * 100).toFixed(0)}%` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination pagination={pagination} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}

export default ProfilesPage;
