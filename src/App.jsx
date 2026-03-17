import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ProductAnalytics from './pages/ProductAnalytics'
import CustomerInsights from './pages/CustomerInsights'
import DemandForecast from './pages/DemandForecast'
import AIRecommendations from './pages/AIRecommendations'
import UploadData from './pages/UploadData'
import AddSales from './pages/AddSales'
import Marketplace from './pages/Marketplace'
import { DataProvider } from './context/DataContext'

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="product-analytics" element={<ProductAnalytics />} />
            <Route path="customer-insights" element={<CustomerInsights />} />
            <Route path="demand-forecast" element={<DemandForecast />} />
            <Route path="ai-recommendations" element={<AIRecommendations />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="upload-data" element={<UploadData />} />
            <Route path="add-sales" element={<AddSales />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}

export default App
