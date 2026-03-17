import React, { createContext, useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const DataContext = createContext({
  data: [],
  loading: true,
  error: null,
  refreshData: () => {},
});

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshData = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/data`)
      .then(res => {
        if (!res.ok) throw new Error('Backend not reachable');
        return res.json();
      })
      .then(json => {
        setData(json.rows || []);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.warn('Backend /data not available, falling back to local CSV');
        // Fallback: load the local CSV from public/
        import('papaparse').then(Papa => {
          fetch('/vendor_data.csv')
            .then(r => r.text())
            .then(csvText => {
              Papa.default.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                  setData(results.data);
                  setLoading(false);
                  setError(null);
                },
              });
            })
            .catch(e2 => {
              setError('Could not load data');
              setLoading(false);
            });
        });
      });
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ data, loading, error, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};
