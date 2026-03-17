import React, { useContext, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import { AlertCircle, ArrowUpRight, Tag, Info } from 'lucide-react';

const AIRecommendations = () => {
  const { data, loading } = useContext(DataContext);

  const recommendations = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const productMap = {};
    const hourMap = {};

    data.forEach(row => {
      const p = row.product_name;
      const hr = row.hour != null ? Number(row.hour) : null;

      if (p) {
        if (!productMap[p]) productMap[p] = { name: p, views: 0, purchases: 0, score: 0, count: 0 };
        productMap[p].views += Number(row.views_count) || 0;
        productMap[p].purchases += Number(row.purchases_count) || 0;
        productMap[p].score += Number(row.recommendation_score) || 0;
        productMap[p].count += 1;
      }

      if (hr !== null) {
        if (!hourMap[hr]) hourMap[hr] = 0;
        hourMap[hr] += Number(row.views_count) || 0;
      }
    });

    const recs = [];

    // Rule 1: High views, low conversion -> Needs discount/promotion
    Object.values(productMap).forEach(item => {
      const convRate = item.views > 0 ? (item.purchases / item.views) : 0;
      if (item.views > 200 && convRate < 0.1) {
        recs.push({
          type: 'discount',
          title: `Consider Discounting ${item.name}`,
          description: `${item.name} is attracting a high number of views (${item.views}) but only converting at ${(convRate*100).toFixed(1)}%. A small discount might trigger more sales.`,
          icon: <Tag style={{ color: 'var(--accent-warning)' }} size={24} />
        });
      }
    });

    // Rule 2: High recommendation score -> Should be stocked more / featured
    Object.values(productMap).forEach(item => {
      const avgScore = item.count > 0 ? (item.score / item.count) : 0;
      if (avgScore > 0.8) {
        recs.push({
          type: 'stock',
          title: `Increase Stock for ${item.name}`,
          description: `AI recommendation models rate ${item.name} extremely high (Score: ${avgScore.toFixed(2)}). Ensure you have enough inventory for the upcoming week.`,
          icon: <ArrowUpRight style={{ color: 'var(--accent-success)' }} size={24} />
        });
      }
    });

    // Rule 3: Find peak view hour for flash sales
    let peakHr = 0;
    let maxViews = 0;
    Object.keys(hourMap).forEach(h => {
      if (hourMap[h] > maxViews) {
        maxViews = hourMap[h];
        peakHr = h;
      }
    });
    
    if (maxViews > 0) {
      recs.push({
        type: 'timing',
        title: `Optimal Flash Sale Time: ${peakHr}:00`,
        description: `Your store hits peak traffic at ${peakHr}:00 with historically ${maxViews} interactions. This is the perfect time to run limited-time promotions.`,
        icon: <AlertCircle style={{ color: 'var(--accent-primary)' }} size={24} />
      });
    }

    // Default general recommendation if none caught
    if (recs.length === 0) {
      recs.push({
        type: 'general',
        title: 'Maintain Current Strategy',
        description: 'Your metrics are stable. Keep an eye on the dashboard for sudden changes in customer behavior.',
        icon: <Info style={{ color: 'var(--text-secondary)' }} size={24} />
      });
    }

    return recs.slice(0, 6); // Limit to top 6 actionable insights
  }, [data]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">AI Business Recommendations</h1>
          <p>Actionable intelligence derived from your dataset patterns.</p>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {recommendations.map((rec, index) => (
          <div key={index} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              {rec.icon}
            </div>
            <div>
              <h3 className="card-title" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{rec.title}</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{rec.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIRecommendations;
