import React, { useMemo, useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Sparkles, MessageSquare, TrendingUp, Briefcase, Package, Search, Filter, Scale, ArrowUpDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ONLINE_PRODUCTS_URL = 'https://dummyjson.com/products?limit=30&skip=0';
const ONLINE_SERVICES_URL = 'https://remotive.com/api/remote-jobs?limit=30';

const isFiniteNumber = (v) => Number.isFinite(typeof v === 'string' ? Number(v) : v);

const normalizeType = (raw) => {
  const t = (raw ?? '').toString().trim().toLowerCase();
  if (t === 'product' || t === 'products' || t === 'good' || t === 'goods') return 'product';
  if (t === 'service' || t === 'services') return 'service';
  return null;
};

const normalizeCategory = (raw) => {
  const c = (raw ?? '').toString().trim();
  if (!c) return null;
  return c
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const money = (amount, currency = 'USD') => {
  if (!isFiniteNumber(amount)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
};

const scoreText = (text, query) => {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = (text ?? '').toString().toLowerCase();
  if (!t) return 0;
  // Simple scoring: exact includes weighted higher.
  return t.includes(q) ? 10 : 0;
};

const normalizeMarketplaceItem = (raw, source) => {
  const id = raw?.id ?? raw?._id ?? `${source}:${raw?.name ?? raw?.title ?? Math.random().toString(16).slice(2)}`;
  const name = raw?.name ?? raw?.title ?? 'Untitled Listing';
  const description =
    raw?.description ??
    raw?.short_description ??
    raw?.summary ??
    'No description provided.';

  const seller =
    raw?.seller ??
    raw?.vendor ??
    raw?.company_name ??
    raw?.brand ??
    raw?.company ??
    'Unknown Seller';

  const rating = isFiniteNumber(raw?.rating) ? Number(raw.rating) : (isFiniteNumber(raw?.reviewCount) ? Number(raw.reviewCount) : null);

  const currency = raw?.currency ?? 'USD';
  // Treat 0/0.0 from dirty uploads as "missing" (quotes), unless explicitly provided as a real value later.
  const priceParsed = isFiniteNumber(raw?.price) ? Number(raw.price) : null;
  const price = priceParsed === 0 ? null : priceParsed;
  const unit = raw?.unit ?? raw?.pricing_unit ?? (source === 'online_services' ? 'project' : 'unit');

  const type = normalizeType(raw?.type) ?? (source === 'online_services' ? 'service' : 'product');
  const category =
    normalizeCategory(raw?.category) ??
    normalizeCategory(raw?.industry) ??
    normalizeCategory(raw?.job_category) ??
    (source === 'online_services' ? 'Professional Services' : 'General Merchandise');

  return {
    id,
    type,
    category,
    name,
    description,
    seller,
    rating,
    price,
    currency,
    unit,
    source,
    raw,
  };
};

const isPlaceholderListing = (it) => {
  const name = (it?.name || '').toString().trim().toLowerCase();
  const seller = (it?.seller || '').toString().trim().toLowerCase();
  const desc = (it?.description || '').toString().trim().toLowerCase();
  const badName = !name || name === 'unknown item' || name === 'untitled listing';
  const badSeller = !seller || seller === 'unknown seller';
  const badDesc = !desc || desc === 'no description provided.';
  // If any two are placeholders, drop it.
  return (badName && badSeller) || (badName && badDesc) || (badSeller && badDesc);
};

const normalizeUnitForCompare = (raw) => {
  const u = (raw ?? '').toString().trim().toLowerCase();
  if (!u) return '';
  const token = u.replace(/per\s+/g, '').replace(/\//g, ' ').trim().split(/\s+/).slice(-1)[0];
  const map = {
    kgs: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    kg: 'kg',
    grams: 'g',
    gram: 'g',
    g: 'g',
    litre: 'l',
    litres: 'l',
    liter: 'l',
    liters: 'l',
    l: 'l',
    hour: 'hr',
    hours: 'hr',
    hr: 'hr',
    hrs: 'hr',
    piece: 'unit',
    pieces: 'unit',
    pc: 'unit',
    pcs: 'unit',
    unit: 'unit',
    service: 'service',
    project: 'project',
  };
  return map[token] || token;
};

const normalizeNameForCompare = (raw) => {
  const s = (raw ?? '').toString().toLowerCase();
  if (!s) return '';
  // remove punctuation, collapse spaces
  let t = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // drop common non-identifying adjectives so "Organic Tomatoes" still matches "Tomatoes"
  const drop = new Set(['fresh', 'organic', 'premium', 'best', 'local', 'handcrafted', 'artisan', 'artisanal', 'quality']);
  t = t
    .split(' ')
    .filter((w) => w && !drop.has(w))
    .join(' ');
  // naive singularize plurals (tomatoes -> tomato, apples -> apple)
  t = t.replace(/\b(\w+)es\b/g, '$1').replace(/\b(\w+)s\b/g, '$1');
  return t;
};

const normalizeCompareKey = (it) => {
  const type = (it?.type || '').toString().toLowerCase();
  const name = normalizeNameForCompare(it?.name);
  const unit = normalizeUnitForCompare(it?.unit);
  // Type + normalized name is primary; include unit only if it is meaningful (not generic).
  const unitKey = unit && unit !== 'unit' ? unit : '';
  return `${type}::${name}::${unitKey}`;
};

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSources, setDataSources] = useState({ local: false, onlineProducts: false, onlineServices: false });
  
  // Upload State
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // AI Analysis State
  const [analyzingId, setAnalyzingId] = useState(null);
  const [aiInsights, setAiInsights] = useState({});
  const [compareInsights, setCompareInsights] = useState({});

  // Marketplace Filters
  const [listingType, setListingType] = useState('all'); // all | product | service
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended'); // recommended | price_asc | price_desc | rating_desc
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // all | local | online_products | online_services

  useEffect(() => {
    fetchMarketplaceItems();
  }, []);

  const fetchMarketplaceItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [localRes, onlineProductsRes, onlineServicesRes] = await Promise.allSettled([
        fetch(`${API_BASE}/marketplace`),
        fetch(ONLINE_PRODUCTS_URL),
        fetch(ONLINE_SERVICES_URL),
      ]);

      const normalized = [];
      const nextSources = { local: false, onlineProducts: false, onlineServices: false };

      if (localRes.status === 'fulfilled' && localRes.value.ok) {
        const data = await localRes.value.json();
        const localItems = (data.items || [])
          .map((it) => normalizeMarketplaceItem(it, 'local'))
          .filter((it) => !isPlaceholderListing(it));
        normalized.push(...localItems);
        nextSources.local = true;
      }

      if (onlineProductsRes.status === 'fulfilled' && onlineProductsRes.value.ok) {
        const data = await onlineProductsRes.value.json();
        const products = (data.products || []).map((p) =>
          normalizeMarketplaceItem(
            {
              id: `dp_${p.id}`,
              type: 'product',
              category: p.category,
              name: p.title,
              description: p.description,
              seller: p.brand || 'Online Catalog',
              rating: p.rating,
              price: p.price,
              unit: 'unit',
              currency: 'USD',
            },
            'online_products'
          )
        );
        normalized.push(...products);
        nextSources.onlineProducts = true;
      }

      if (onlineServicesRes.status === 'fulfilled' && onlineServicesRes.value.ok) {
        const data = await onlineServicesRes.value.json();
        const services = (data.jobs || []).slice(0, 30).map((j) =>
          normalizeMarketplaceItem(
            {
              id: `rm_${j.id}`,
              type: 'service',
              category: j.category,
              name: j.title,
              description: j.description?.replace(/<[^>]+>/g, '').slice(0, 280) || 'Service listing.',
              seller: j.company_name,
              rating: null,
              price: null,
              unit: 'engagement',
              currency: 'USD',
            },
            'online_services'
          )
        );
        normalized.push(...services);
        nextSources.onlineServices = true;
      }

      if (normalized.length === 0) {
        // If absolutely nothing loaded, fail with a useful error.
        throw new Error('No marketplace data available (local API and online catalogs failed).');
      }

      setDataSources(nextSources);
      setItems(normalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadMessage('Please upload a valid CSV file.');
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/marketplace/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setUploadStatus('success');
      setUploadMessage(data.message);
      fetchMarketplaceItems(); // Refresh items
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err.message);
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

  const analyzeItem = async (item) => {
    setAnalyzingId(item.id);
    try {
      const res = await fetch(`${API_BASE}/marketplace/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: item.name,
          price: item.price ?? 0,
          description: item.description
        })
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const detail = data?.detail || data?.message || `Analysis failed (HTTP ${res.status}).`;
        setAiInsights(prev => ({ ...prev, [item.id]: detail }));
        return;
      }

      setAiInsights(prev => ({ ...prev, [item.id]: data?.analysis ?? 'No analysis returned.' }));
    } catch (error) {
      console.error('Failed to analyze', error);
      setAiInsights(prev => ({ ...prev, [item.id]: "Analysis failed. Please try again." }));
    } finally {
        setAnalyzingId(null);
    }
  };

  const handleContact = (seller) => {
    alert(`Initiating chat with ${seller}... (Mock Action)`);
  };

  const categories = useMemo(() => {
    const set = new Set();
    for (const it of items) {
      if (it?.category) set.add(it.category);
    }
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice.trim() === '' ? null : Number(minPrice);
    const max = maxPrice.trim() === '' ? null : Number(maxPrice);
    const base = items.filter((it) => {
      if (listingType !== 'all' && it.type !== listingType) return false;
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
      if (sourceFilter !== 'all' && it.source !== sourceFilter) return false;
      if (onlyPriced && it.price == null) return false;
      if (min != null && isFiniteNumber(min) && (it.price == null || Number(it.price) < min)) return false;
      if (max != null && isFiniteNumber(max) && (it.price == null || Number(it.price) > max)) return false;
      if (!q) return true;
      const hay = `${it.name} ${it.description} ${it.seller} ${it.category} ${it.type}`;
      return hay.toLowerCase().includes(q);
    });

    const scored = base.map((it) => ({
      it,
      score:
        scoreText(it.name, q) * 3 +
        scoreText(it.category, q) * 2 +
        scoreText(it.seller, q) * 2 +
        scoreText(it.description, q),
    }));

    const byPrice = (a, b) => {
      const ap = isFiniteNumber(a.it.price) ? a.it.price : Number.POSITIVE_INFINITY;
      const bp = isFiniteNumber(b.it.price) ? b.it.price : Number.POSITIVE_INFINITY;
      return ap - bp;
    };

    const byRating = (a, b) => {
      const ar = isFiniteNumber(a.it.rating) ? a.it.rating : -1;
      const br = isFiniteNumber(b.it.rating) ? b.it.rating : -1;
      return br - ar;
    };

    if (sortBy === 'price_asc') scored.sort(byPrice);
    if (sortBy === 'price_desc') scored.sort((a, b) => byPrice(b, a));
    if (sortBy === 'rating_desc') scored.sort(byRating);
    if (sortBy === 'recommended') scored.sort((a, b) => (b.score - a.score) || byRating(a, b) || byPrice(a, b));

    return scored.map((x) => x.it);
  }, [items, listingType, categoryFilter, sourceFilter, onlyPriced, minPrice, maxPrice, query, sortBy]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const products = filteredItems.filter((i) => i.type === 'product').length;
    const services = filteredItems.filter((i) => i.type === 'service').length;
    return { total, products, services };
  }, [filteredItems]);

  const compareGroups = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const key = normalizeCompareKey(it);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    const groups = Array.from(map.entries())
      .map(([key, group]) => {
        const priced = group.filter((g) => g.price != null);
        const prices = priced.map((p) => Number(p.price)).filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
        const low = prices.length ? prices[0] : null;
        const high = prices.length ? prices[prices.length - 1] : null;
        const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
        const type = group[0]?.type;
        const name = group[0]?.name;
        const unit = group[0]?.unit;
        const category = group[0]?.category;
        return { key, type, name, unit, category, offers: group, pricedCount: prices.length, low, high, median };
      })
      // Only show comparisons that can actually compare prices.
      .filter((g) => g.pricedCount >= 2)
      .sort((a, b) => (b.pricedCount - a.pricedCount) || (b.offers.length - a.offers.length) || (a.name || '').localeCompare(b.name || ''));
    return groups;
  }, [filteredItems]);

  const [compareKey, setCompareKey] = useState('');
  const selectedCompare = useMemo(() => compareGroups.find((g) => g.key === compareKey) || null, [compareGroups, compareKey]);

  const [compareTargetSeller, setCompareTargetSeller] = useState('');
  const [compareTargetPrice, setCompareTargetPrice] = useState('');
  const [comparingKey, setComparingKey] = useState(null);

  const requestCompareInsights = async () => {
    if (!selectedCompare) return;
    setComparingKey(selectedCompare.key);
    const unit = selectedCompare.unit || 'unit';
    const yourPriceNum = compareTargetPrice.trim() === '' ? null : Number(compareTargetPrice);
    const payload = {
      item_name: selectedCompare.name,
      item_type: selectedCompare.type,
      category: selectedCompare.category,
      unit,
      your_seller: compareTargetSeller || null,
      your_price: Number.isFinite(yourPriceNum) ? yourPriceNum : null,
      description: selectedCompare.offers[0]?.description || null,
      offers: selectedCompare.offers.map((o) => ({
        seller: o.seller,
        price: o.price == null ? null : Number(o.price),
        unit: o.unit,
        rating: o.rating == null ? null : Number(o.rating),
        source: o.source,
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/marketplace/compare_analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const detail = data?.detail || data?.message || `Recommendation failed (HTTP ${res.status}).`;
        setCompareInsights((p) => ({ ...p, [selectedCompare.key]: detail }));
        return;
      }

      setCompareInsights((p) => ({ ...p, [selectedCompare.key]: data?.analysis ?? 'No recommendation returned.' }));
    } catch (e) {
      setCompareInsights((p) => ({ ...p, [selectedCompare.key]: 'Recommendation failed. Please try again.' }));
    } finally {
      setComparingKey(null);
    }
  };

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Local Vendor Marketplace</h1>
          <p>Browse products and service providers, compare offerings, and generate business insights for sourcing decisions.</p>
        </div>
      </div>

      {/* Business Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setListingType('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: listingType === 'all' ? 'var(--bg-main)' : 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={16} /> All ({stats.total})
            </button>
            <button
              onClick={() => setListingType('product')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: listingType === 'product' ? 'var(--bg-main)' : 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Package size={16} /> Products ({stats.products})
            </button>
            <button
              onClick={() => setListingType('service')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: listingType === 'service' ? 'var(--bg-main)' : 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Briefcase size={16} /> Services ({stats.services})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings, vendors, categories…"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  background: 'white',
                }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
            >
              <option value="all">All Sources</option>
              <option value="local">Local</option>
              <option value="online_products">Online Products</option>
              <option value="online_services">Online Services</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="rating_desc">Sort: Rating</option>
              <option value="price_asc">Sort: Price (Low → High)</option>
              <option value="price_desc">Sort: Price (High → Low)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={onlyPriced} onChange={(e) => setOnlyPriced(e.target.checked)} />
            Show priced offers only
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Price range</span>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              inputMode="decimal"
              style={{ width: 90, padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>—</span>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              inputMode="decimal"
              style={{ width: 90, padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span><strong>Sources:</strong></span>
          <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: 999, background: 'white' }}>
            Local API: {dataSources.local ? 'Connected' : 'Unavailable'}
          </span>
          <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: 999, background: 'white' }}>
            Online Products: {dataSources.onlineProducts ? 'Connected' : 'Unavailable'}
          </span>
          <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: 999, background: 'white' }}>
            Online Services: {dataSources.onlineServices ? 'Connected' : 'Unavailable'}
          </span>
        </div>

        <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          This marketplace uses a <strong>business-oriented catalog model</strong> (type + category + vendor + pricing unit) so you can later add supplier performance, SLAs, lead time, and procurement workflows.
          When local data is missing, the page stays “alive” using public online catalogs from{' '}
          <a href="https://dummyjson.com/" target="_blank" rel="noreferrer">DummyJSON</a> (products) and{' '}
          <a href="https://remotive.com/api-documentation" target="_blank" rel="noreferrer">Remotive API</a> (service/provider listings).
        </div>
      </div>

      {/* Price Comparison + AI Recommendations */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>Vendor Price Comparison</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Compare the same product/service across vendors, then generate pricing and sales recommendations.
            </p>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Groups found: <strong>{compareGroups.length}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={compareKey}
              onChange={(e) => setCompareKey(e.target.value)}
              style={{ flex: '1 1 320px', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
            >
              <option value="">Select an item to compare…</option>
              {compareGroups.slice(0, 60).map((g) => (
                <option key={g.key} value={g.key}>
                  {g.type === 'service' ? 'Service' : 'Product'} • {g.name} • {g.unit} • {g.pricedCount}/{g.offers.length} priced
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={compareTargetSeller}
                onChange={(e) => setCompareTargetSeller(e.target.value)}
                placeholder="Your vendor name (optional)"
                style={{ width: 210, padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
              />
              <input
                value={compareTargetPrice}
                onChange={(e) => setCompareTargetPrice(e.target.value)}
                placeholder="Your price (optional)"
                inputMode="decimal"
                style={{ width: 140, padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'white' }}
              />
            </div>
          </div>

          {selectedCompare && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
              <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, border: '1px solid var(--border-color)', background: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
                    <Scale size={14} /> Compare
                  </span>
                  <span style={{ fontWeight: 700 }}>{selectedCompare.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>• {selectedCompare.category} • {selectedCompare.unit}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {selectedCompare.pricedCount ? (
                    <span>
                      Range: <strong>{money(selectedCompare.low)}</strong>–<strong>{money(selectedCompare.high)}</strong> • Median: <strong>{money(selectedCompare.median)}</strong>
                    </span>
                  ) : (
                    <span>No priced offers in this group yet (quotes only).</span>
                  )}
                </div>
              </div>

              <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Tip: Use filters above (type/category/price-only) to “filter out” noise and compare only relevant vendors.
                  </div>
                  <button
                    onClick={requestCompareInsights}
                    disabled={comparingKey === selectedCompare.key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 0.9rem',
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      cursor: comparingKey === selectedCompare.key ? 'wait' : 'pointer',
                      fontWeight: 700,
                      opacity: comparingKey === selectedCompare.key ? 0.7 : 1,
                    }}
                  >
                    <ArrowUpDown size={16} /> {comparingKey === selectedCompare.key ? 'Generating…' : 'AI Price + Sales Recommendations'}
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.6rem 0.4rem' }}>Vendor</th>
                        <th style={{ padding: '0.6rem 0.4rem' }}>Price</th>
                        <th style={{ padding: '0.6rem 0.4rem' }}>Unit</th>
                        <th style={{ padding: '0.6rem 0.4rem' }}>Rating</th>
                        <th style={{ padding: '0.6rem 0.4rem' }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCompare.offers
                        .slice()
                        .sort((a, b) => {
                          const ap = a.price == null ? Number.POSITIVE_INFINITY : Number(a.price);
                          const bp = b.price == null ? Number.POSITIVE_INFINITY : Number(b.price);
                          return ap - bp;
                        })
                        .slice(0, 25)
                        .map((o) => (
                          <tr key={`${selectedCompare.key}:${o.id}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.55rem 0.4rem', fontWeight: 600 }}>{o.seller}</td>
                            <td style={{ padding: '0.55rem 0.4rem' }}>{o.price == null ? 'Quote' : money(o.price, o.currency)}</td>
                            <td style={{ padding: '0.55rem 0.4rem' }}>{o.unit}</td>
                            <td style={{ padding: '0.55rem 0.4rem' }}>{o.rating == null ? 'N/A' : o.rating}</td>
                            <td style={{ padding: '0.55rem 0.4rem', color: 'var(--text-secondary)' }}>
                              {o.source === 'local' ? 'Local' : o.source === 'online_products' ? 'Online Products' : 'Online Services'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {compareInsights[selectedCompare.key] && (
                  <div style={{ backgroundColor: '#F0F9FF', padding: '1rem', borderRadius: '8px', marginTop: '1rem', borderLeft: '4px solid #0EA5E9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#0369A1', fontWeight: 800 }}>
                      <TrendingUp size={16} /> AI Recommendations (Pricing + Best Practices)
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#0C4A6E', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                      {compareInsights[selectedCompare.key]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedCompare && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Select a group above to compare vendors. (Groups are created when at least 2 vendors offer the same product/service name.)
            </div>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
         <h3 className="card-title" style={{ marginBottom: '1rem' }}>Contribute to Marketplace</h3>
         <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
           Upload a CSV with columns: <strong>type</strong> (product/service), <strong>category</strong>, seller, name, price, unit, rating, description.
           If type/category are missing, the marketplace will auto-classify and you can still browse via online catalogs.
         </p>
         
         <div
           style={{
             padding: '2rem',
             textAlign: 'center',
             border: dragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
             background: dragging ? 'rgb(238 242 255)' : 'var(--bg-main)',
             borderRadius: '8px',
             transition: 'all 0.2s ease',
             cursor: 'pointer',
           }}
           onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
           onDragLeave={() => setDragging(false)}
           onDrop={onDrop}
           onClick={() => document.getElementById('marketplace-csv').click()}
         >
           <Upload size={32} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
           <p style={{ fontWeight: 500 }}>Drop your CSV here or click to browse</p>
           <input
             id="marketplace-csv"
             type="file"
             accept=".csv"
             style={{ display: 'none' }}
             onChange={onFileSelect}
           />
           {uploading && <p style={{ marginTop: '0.5rem', color: 'var(--accent-primary)' }}>Uploading...</p>}
         </div>

         {uploadStatus && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: uploadStatus === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: uploadStatus === 'success' ? '#065F46' : '#991B1B'
          }}>
            {uploadStatus === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{uploadMessage}</span>
          </div>
         )}
      </div>

      {/* Listings Section */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        Marketplace Listings
      </h2>
      
      {loading ? (
        <p>Loading marketplace data...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredItems.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{item.name}</h3>
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {item.price == null ? 'Quote' : `${money(item.price, item.currency)} / ${item.unit}`}
                  </div>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {item.rating == null ? '⭐ N/A' : `⭐ ${item.rating}`} • Provided by <strong>{item.seller}</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, border: '1px solid var(--border-color)', background: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
                  {item.type === 'service' ? <Briefcase size={14} /> : <Package size={14} />} {item.type === 'service' ? 'Service' : 'Product'}
                </span>
                <span style={{ padding: '2px 10px', borderRadius: 999, border: '1px solid var(--border-color)', background: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
                  {item.category}
                </span>
                <span style={{ padding: '2px 10px', borderRadius: 999, border: '1px solid var(--border-color)', background: 'white', fontSize: '0.85rem' }}>
                  Source: {item.source === 'local' ? 'Local' : item.source === 'online_products' ? 'Online Products' : 'Online Services'}
                </span>
              </div>
              
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-main)', marginBottom: '1.5rem', flex: 1 }}>
                  {item.description}
              </p>

              {aiInsights[item.id] && (
                <div style={{ backgroundColor: '#F0F9FF', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #0EA5E9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#0369A1', fontWeight: 600 }}>
                        <TrendingUp size={16} /> AI Market Prediction
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#0C4A6E', margin: 0, lineHeight: 1.5 }}>
                        {aiInsights[item.id]}
                    </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                  <button 
                      onClick={() => handleContact(item.seller)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'white', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                      <MessageSquare size={16} /> Contact
                  </button>
                  <button 
                      onClick={() => analyzeItem(item)}
                      disabled={analyzingId === item.id}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '6px', border: 'none', backgroundColor: 'var(--accent-primary)', color: 'white', cursor: analyzingId === item.id ? 'wait' : 'pointer', fontWeight: 500, transition: 'background-color 0.2s', opacity: analyzingId === item.id ? 0.7 : 1 }}
                      onMouseOver={e => !analyzingId && (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
                      onMouseOut={e => !analyzingId && (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                  >
                      <Sparkles size={16} /> {analyzingId === item.id ? 'Analyzing...' : 'Predict Insights'}
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
