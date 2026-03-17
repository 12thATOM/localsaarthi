import React, { useContext, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, Percent, Clock } from 'lucide-react';

const Dashboard = () => {
  const { data, loading, error } = useContext(DataContext);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    let totalRevenue = 0;
    let totalPurchases = 0;
    let totalViews = 0;
    let peakHourMap = {};
    let productRevenueMap = {};

    data.forEach(row => {
      const rev = Number(row.revenue) || 0;
      const purch = Number(row.purchases_count) || 0;
      const view = Number(row.views_count) || 0;
      const hour = row.hour != null ? Number(row.hour) : null;
      const product = row.product_name;

      totalRevenue += rev;
      totalPurchases += purch;
      totalViews += view;

      if (hour !== null) {
        peakHourMap[hour] = (peakHourMap[hour] || 0) + purch;
      }

      if (product) {
        productRevenueMap[product] = (productRevenueMap[product] || 0) + rev;
      }
    });

    const avgConversion = totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(2) : 0;
    
    // Find peak hour
    let peakHour = '-';
    let maxPurchasesHour = 0;
    Object.keys(peakHourMap).forEach(h => {
      if (peakHourMap[h] > maxPurchasesHour) {
        maxPurchasesHour = peakHourMap[h];
        peakHour = `${h}:00`;
      }
    });

    // Find top selling product
    let topProduct = '-';
    let maxProductRev = 0;
    Object.keys(productRevenueMap).forEach(p => {
      if (productRevenueMap[p] > maxProductRev) {
        maxProductRev = productRevenueMap[p];
        topProduct = p;
      }
    });

    // Prepare chart data (Revenue by Day/Timestamp)
    const revenueByTimeMap = {};
    data.forEach(row => {
      if (!row.timestamp) return;
      // Extract just the day part or use timestamp directly if short
      const dateKey = String(row.timestamp).split(' ')[0] || '-';
      revenueByTimeMap[dateKey] = (revenueByTimeMap[dateKey] || 0) + (Number(row.revenue) || 0);
    });

    const chartData = Object.keys(revenueByTimeMap)
      .slice(0, 15) // Limit to avoid clutter
      .map(k => ({
        date: k,
        income: Math.round(revenueByTimeMap[k])
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue: totalRevenue.toFixed(2),
      avgConversion,
      peakHour,
      topProduct,
      chartData
    };
  }, [data]);

  if (loading) return <div className="page-title">Loading data...</div>;
  if (error) return <div className="page-title" style={{color: 'red'}}>Error: {error}</div>;
  if (!stats) return <div className="page-title">No data available.</div>;

  return (
    <div>
      <div className="header-bar">
        <h1 className="page-title">Dashboard Overview</h1>
        <button className="btn-primary">Export Report</button>
      </div>

      <div className="grid-cards">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Total Revenue</div>
              <div className="card-value">${Number(stats.totalRevenue).toLocaleString()}</div>
            </div>
            <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <DollarSign size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Top Selling Product</div>
              <div className="card-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{stats.topProduct}</div>
            </div>
            <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <ShoppingBag size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Avg. Conversion Rate</div>
              <div className="card-value">{stats.avgConversion}%</div>
            </div>
            <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <Percent size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Peak Customer Hour</div>
              <div className="card-value">{stats.peakHour}</div>
            </div>
            <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <Clock size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-charts">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Revenue Over Time</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="income" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
