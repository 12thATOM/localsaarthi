import React, { useState, useContext } from 'react';
import { DataContext } from '../context/DataContext';
import { PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AddSales = () => {
  const { refreshData } = useContext(DataContext);
  const [form, setForm] = useState({
    product_name: '',
    price: '',
    quantity: '',
    timestamp: '',
  });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_name || !form.price || !form.quantity) {
      setStatus('error');
      setMessage('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_BASE}/add_sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: form.product_name,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity),
          timestamp: form.timestamp || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add sale');
      setStatus('success');
      setMessage(data.message);
      setEntries(prev => [...prev, { ...form, revenue: (parseFloat(form.price) * parseInt(form.quantity)).toFixed(2) }]);
      setForm({ product_name: '', price: '', quantity: '', timestamp: '' });
      refreshData();
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-family)',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.375rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  };

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Add Sales</h1>
          <p>Manually log a new sale to keep your data up to date.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '900px' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={18} style={{ color: 'var(--accent-primary)' }} /> New Sale Entry
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Product / Service Name *</label>
              <input
                style={inputStyle}
                type="text"
                name="product_name"
                value={form.product_name}
                onChange={handleChange}
                placeholder="e.g. Organic Milk"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Price ($) *</label>
                <input
                  style={inputStyle}
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label style={labelStyle}>Quantity *</label>
                <input
                  style={inputStyle}
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Date & Time (optional)</label>
              <input
                style={inputStyle}
                type="datetime-local"
                name="timestamp"
                value={form.timestamp}
                onChange={handleChange}
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Add Sale'}
            </button>
          </form>

          {status && (
            <div style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: status === 'success' ? '#f0fdf4' : '#fef2f2',
              color: status === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)',
              fontWeight: 500,
              fontSize: '0.9rem',
            }}>
              {status === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Recent Entries</h3>
          {entries.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No entries added yet in this session.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: 500 }}>Product</th>
                  <th style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 500 }}>Qty</th>
                  <th style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 500 }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0' }}>{e.product_name}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{e.quantity}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: 'var(--accent-success)' }}>${e.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddSales;
