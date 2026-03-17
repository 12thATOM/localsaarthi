import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Users, Target, Zap, Home, Upload, PlusCircle, ShoppingBag } from 'lucide-react';

const Layout = () => {
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <Zap className="nav-icon" style={{ color: 'var(--accent-primary)' }} />
          <span className="logo-text">VendorAI</span>
        </div>
        
        <nav className="nav-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end
          >
            <Home className="nav-icon" />
            <span>Home</span>
          </NavLink>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink 
            to="/product-analytics" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <TrendingUp className="nav-icon" />
            <span>Product Analytics</span>
          </NavLink>
          <NavLink 
            to="/customer-insights" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users className="nav-icon" />
            <span>Customer Insights</span>
          </NavLink>
          <NavLink 
            to="/demand-forecast" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Target className="nav-icon" />
            <span>Demand Forecast</span>
          </NavLink>
          <NavLink 
            to="/ai-recommendations" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Zap className="nav-icon" />
            <span>AI Recommendations</span>
          </NavLink>
          <NavLink 
            to="/marketplace" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <ShoppingBag className="nav-icon" />
            <span>Marketplace</span>
          </NavLink>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />

          <NavLink 
            to="/upload-data" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Upload className="nav-icon" />
            <span>Upload Data</span>
          </NavLink>
          <NavLink 
            to="/add-sales" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <PlusCircle className="nav-icon" />
            <span>Add Sales</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
