import React, { useContext, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ProductAnalytics = () => {
  const { data, loading, error } = useContext(DataContext);

  const productStats = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Group by product
    const map = {};
    data.forEach(row => {
      const p = row.product_name;
      if (!p) return;
      if (!map[p]) {
        map[p] = { name: p, views: 0, purchases: 0, revenue: 0 };
      }
      map[p].views += Number(row.views_count) || 0;
      map[p].purchases += Number(row.purchases_count) || 0;
      map[p].revenue += Number(row.revenue) || 0;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        conversionRate: item.views > 0 ? Number(((item.purchases / item.views) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 products
  }, [data]);

  if (loading) return <div className="page-title">Loading...</div>;
  if (!productStats.length) return <div className="page-title">No Product Data</div>;

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Product Analytics</h1>
          <p>Analyze performance and conversion metrics by product.</p>
        </div>
      </div>

      <div className="grid-charts" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Views vs Purchases (Top 10 Products)</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <BarChart data={productStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="views" name="Total Views" fill="var(--bg-main)" stroke="var(--text-secondary)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="purchases" name="Total Purchases" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid-charts">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Revenue by Product</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={productStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="var(--accent-success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Conversion Rate (%)</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={productStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Line type="monotone" dataKey="conversionRate" name="Conversion Rate" stroke="var(--accent-warning)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalytics;
