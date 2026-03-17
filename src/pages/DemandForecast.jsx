import React, { useContext, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const DemandForecast = () => {
  const { data, loading } = useContext(DataContext);

  const { demandData, highDemand, lowDemand } = useMemo(() => {
    if (!data || data.length === 0) return { demandData: [], highDemand: [], lowDemand: [] };

    // Aggregate by product for high/low demand
    const map = {};
    const dateMap = {};

    data.forEach(row => {
      const p = row.product_name;
      const date = row.timestamp ? String(row.timestamp).split(' ')[0] : null;

      if (p) {
        if (!map[p]) map[p] = { name: p, score: 0, count: 0 };
        map[p].score += Number(row.demand_score) || 0;
        map[p].count += 1;
      }

      if (date) {
        if (!dateMap[date]) dateMap[date] = { date, demand_score: 0, count: 0 };
        dateMap[date].demand_score += Number(row.demand_score) || 0;
        dateMap[date].count += 1;
      }
    });

    const products = Object.values(map)
      .map(item => ({ name: item.name, avgScore: item.count > 0 ? (item.score / item.count).toFixed(2) : 0 }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const dData = Object.values(dateMap)
      .map(item => ({ date: item.date, avgDemand: item.count > 0 ? Number((item.demand_score / item.count).toFixed(2)) : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { 
      demandData: dData, 
      highDemand: products.slice(0, 5), 
      lowDemand: products.slice(-5).reverse() 
    };
  }, [data]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Demand Forecast</h1>
          <p>Predict future stock needs using AI-driven demand scores.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Average Weekly Demand Trend</h3>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <LineChart data={demandData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
              <Line type="monotone" dataKey="avgDemand" name="Avg Demand Score" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-charts">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp style={{ color: 'var(--accent-success)' }} />
            <h3 className="card-title" style={{ marginBottom: 0 }}>Rising Demand (Top 5)</h3>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 0', fontWeight: '500' }}>Product</th>
                <th style={{ padding: '0.75rem 0', fontWeight: '500', textAlign: 'right' }}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {highDemand.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 0' }}>{p.name}</td>
                  <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: '600', color: 'var(--accent-success)' }}>{p.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingDown style={{ color: 'var(--accent-danger)' }} />
            <h3 className="card-title" style={{ marginBottom: 0 }}>Falling Popularity (Bottom 5)</h3>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 0', fontWeight: '500' }}>Product</th>
                <th style={{ padding: '0.75rem 0', fontWeight: '500', textAlign: 'right' }}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {lowDemand.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 0' }}>{p.name}</td>
                  <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: '600', color: 'var(--accent-danger)' }}>{p.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DemandForecast;
