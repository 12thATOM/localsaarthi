import React, { useState, useContext } from 'react';
import { DataContext } from '../context/DataContext';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UploadData = () => {
  const { refreshData } = useContext(DataContext);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setStatus('error');
      setMessage('Please upload a valid CSV file.');
      return;
    }

    setUploading(true);
    setStatus(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setStatus('success');
      setMessage(data.message);
      refreshData(); // Refresh all dashboards
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onFileSelect = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Upload Data</h1>
          <p>Upload your own CSV dataset to update all analytics instantly.</p>
        </div>
      </div>

      <div
        className="card"
        style={{
          maxWidth: '600px',
          padding: '3rem',
          textAlign: 'center',
          border: dragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
          background: dragging ? 'rgb(238 242 255)' : 'var(--bg-card)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('csv-upload-input').click()}
      >
        <Upload size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Drag & drop your CSV file here</h3>
        <p style={{ fontSize: '0.9rem' }}>or click to browse from your computer</p>
        <input
          id="csv-upload-input"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
        {uploading && <p style={{ marginTop: '1rem', color: 'var(--accent-primary)', fontWeight: 500 }}>Uploading...</p>}
      </div>

      {status && (
        <div
          className="card"
          style={{
            maxWidth: '600px',
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderLeft: `4px solid ${status === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
          }}
        >
          {status === 'success'
            ? <CheckCircle size={20} style={{ color: 'var(--accent-success)' }} />
            : <AlertCircle size={20} style={{ color: 'var(--accent-danger)' }} />
          }
          <span style={{ fontWeight: 500 }}>{message}</span>
        </div>
      )}

      <div className="card" style={{ maxWidth: '600px', marginTop: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>How it works</h3>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: '2' }}>
          <li>Upload any CSV with product sales data</li>
          <li>The system will parse it automatically</li>
          <li>All dashboard charts and AI insights will update immediately</li>
          <li>The chatbot will also answer questions based on your new data</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadData;
