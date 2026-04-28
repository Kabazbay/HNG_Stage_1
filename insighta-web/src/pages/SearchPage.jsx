import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Pagination from '../components/Pagination';

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function doSearch(q, page = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/profiles/search', { params: { q, page, limit: 15 } });
      setResults(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) { e.preventDefault(); if (query.trim()) doSearch(query); }

  const suggestions = ['young males from nigeria', 'female adults', 'teenagers from japan', 'seniors over 70'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Search Profiles</h1>
        <p className="page-subtitle">Use natural language to find profiles</p>
      </div>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-container">
          <input type="text" className="search-input" placeholder='Try: "young males from nigeria"' value={query} onChange={e => setQuery(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </div>
      </form>
      <div className="search-suggestions">
        <p>Examples:</p>
        <div className="suggestion-chips">
          {suggestions.map(s => (<button key={s} className="chip" onClick={() => { setQuery(s); doSearch(s); }}>{s}</button>))}
        </div>
      </div>
      {error && <div className="error-banner"><p>{error}</p></div>}
      {loading && <div className="spinner"></div>}
      {results && !loading && (
        <>
          <p className="results-count">Found {pagination?.total || results.length} results for &quot;{query}&quot;</p>
          {results.length === 0 ? <div className="empty-state"><p>No profiles match your query.</p></div> : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Gender</th><th>Age</th><th>Age Group</th><th>Country</th></tr></thead>
                  <tbody>
                    {results.map(p => (
                      <tr key={p.id} onClick={() => navigate(`/profiles/${p.id}`)} className="clickable-row">
                        <td className="name-cell">{p.name}</td>
                        <td><span className={`badge badge-${p.gender}`}>{p.gender}</span></td>
                        <td>{p.age}</td><td><span className="badge">{p.age_group}</span></td>
                        <td>{p.country_name || p.country_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={pg => doSearch(query, pg)} />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;
