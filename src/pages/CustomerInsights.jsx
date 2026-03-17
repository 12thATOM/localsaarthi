import React, { useContext, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomerInsights = () => {
  const { data, loading } = useContext(DataContext);

  const { hourlyData, weekdayData } = useMemo(() => {
    if (!data || data.length === 0) return { hourlyData: [], weekdayData: [] };

    const hours = {};
    const weekdays = {};
    const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    data.forEach(row => {
      const hr = row.hour != null ? Number(row.hour) : null;
      const day = row.weekday;
      
      const interactions = (Number(row.views_count) || 0) + (Number(row.clicks_count) || 0) + (Number(row.purchases_count) || 0);

      if (hr !== null) {
        hours[hr] = (hours[hr] || 0) + interactions;
      }
      if (day) {
        weekdays[day] = (weekdays[day] || 0) + interactions;
      }
    });

    const hData = Object.keys(hours)
      .map(k => ({ hour: `${k}:00`, interactions: hours[k] }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const wData = Object.keys(weekdays)
      .map(k => ({ day: k, interactions: weekdays[k] }))
      .sort((a, b) => weekdayOrder.indexOf(a.day) - weekdayOrder.indexOf(b.day));

    return { hourlyData: hData, weekdayData: wData };
  }, [data]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Customer Behavior Insights</h1>
          <p>Understand when and how customers interact with your store.</p>
        </div>
      </div>

      <div className="grid-charts" style={{ gridTemplateColumns: '1fr' }}>
         <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Hourly Interaction Patterns</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Area type="monotone" dataKey="interactions" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorInteractions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Interactions by Weekday</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={weekdayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="interactions" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
