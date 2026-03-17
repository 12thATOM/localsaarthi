import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, TrendingUp, Zap } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Welcome to <span style={{ color: 'var(--accent-primary)' }}>VendorAI</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          The professional AI-powered business intelligence platform designed specifically for local vendors and shop owners. 
          Understand your customers, predict demand, and increase your revenue.
        </p>
        <button 
          className="btn-primary" 
          style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard <ArrowRight size={20} />
        </button>
      </header>

      <div className="grid-cards" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <BarChart3 size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Automated Analytics</h3>
          <p>Instantly visualize your sales, product performance, and customer behavior without technical skills.</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <TrendingUp size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Demand Forecasting</h3>
          <p>Predict which products will trend next week and avoid dead stock with AI-driven demand scoring.</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'rgb(238 242 255)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Zap size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>AI Recommendations</h3>
          <p>Get actionable, smart insights on when to restock, when to discount, and how to optimize your store.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
