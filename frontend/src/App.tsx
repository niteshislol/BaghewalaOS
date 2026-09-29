import React, { Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { useWellStore } from './stores/wellStore'
import { DemoOverlay } from './components/ui/DemoOverlay'
import { useDemoStore } from './stores/useDemoStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { Play, Globe, Moon, Sun, Map, Video, AlertTriangle, Bot } from 'lucide-react'

// Lazy-load pages for fast initial load
const LandingPage = React.lazy(() => import('./pages/LandingPage'))
const OverviewPage = React.lazy(() => import('./pages/OverviewPage'))
const FieldDashboard = React.lazy(() => import('./pages/FieldDashboard'))
const ReservoirPage = React.lazy(() => import('./pages/ReservoirPage'))
const WellborePage = React.lazy(() => import('./pages/WellborePage'))
const SrpPage = React.lazy(() => import('./pages/SrpPage'))
const CssOptimizerPage = React.lazy(() => import('./pages/CssOptimizerPage'))
const WhatIfPage = React.lazy(() => import('./pages/WhatIfPage'))
const HorizonPage = React.lazy(() => import('./pages/HorizonPage'))
const AlertsPage = React.lazy(() => import('./pages/AlertsPage'))
const AiCopilotPage = React.lazy(() => import('./pages/AiCopilotPage'))
const EconomicsPage = React.lazy(() => import('./pages/EconomicsPage'))
const MaintenancePage = React.lazy(() => import('./pages/MaintenancePage'))
const WorkOrdersPage = React.lazy(() => import('./pages/WorkOrdersPage'))
const TrendsPage = React.lazy(() => import('./pages/TrendsPage'))
const AuditPage = React.lazy(() => import('./pages/AuditPage'))
const ModelMetricsPage = React.lazy(() => import('./pages/ModelMetricsPage'))
const VisualizerPage = React.lazy(() => import('./pages/VisualizerPage'))

const NAV = [
  { sectionKey: 'nav.overview', items: [
    { path: '/field', labelKey: 'nav.field', icon: '🗺️' },
    { path: '/overview', labelKey: 'nav.well', icon: '📊' },
    { path: '/alerts', labelKey: 'nav.alerts', icon: '🚨' },
  ]},
  { sectionKey: 'nav.physics', items: [
    { path: '/reservoir', labelKey: 'nav.reservoir', icon: '🌡️' },
    { path: '/wellbore', labelKey: 'nav.wellbore', icon: '⬇️' },
    { path: '/srp', labelKey: 'nav.srp', icon: '⚙️' },
    { path: '/visualizer', labelKey: 'nav.visualizer', icon: '🎥' },
  ]},
  { sectionKey: 'nav.optimization', items: [
    { path: '/css-optimizer', labelKey: 'nav.css', icon: '🔥' },
    { path: '/whatif', labelKey: 'nav.whatif', icon: '🔬' },
    { path: '/horizon', labelKey: 'nav.horizon', icon: '📈' },
  ]},
  { sectionKey: 'nav.ai', items: [
    { path: '/ai', labelKey: 'nav.copilot', icon: '🤖' },
    { path: '/economics', labelKey: 'nav.economics', icon: '💰' },
    { path: '/maintenance', labelKey: 'nav.maintenance', icon: '🔧' },
  ]},
  { sectionKey: 'nav.operations', items: [
    { path: '/trends', labelKey: 'nav.trends', icon: '📉' },
    { path: '/work-orders', labelKey: 'nav.workorders', icon: '📋' },
    { path: '/audit', labelKey: 'nav.audit', icon: '🔒' },
    { path: '/models', labelKey: 'nav.models', icon: '🧠' },
  ]},
]

function Sidebar({ isOpen }: { isOpen?: boolean }) {
  const { selectedWell, setWell } = useWellStore()
  const { theme, setTheme, language, setLanguage, t } = useSettingsStore()
  const WELLS = ['BGW-01', 'BGW-04', 'BGW-07', 'BGW-09', 'BGW-12', 'BGW-15']

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <h1>BaghewalaOS</h1>
        <p>SIH26120 · Oil India Limited</p>
        <div style={{ marginTop: 12 }}>
          <select
            value={selectedWell}
            onChange={e => setWell(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px', borderRadius: 6,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
              marginBottom: 12
            }}
          >
            {WELLS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          
          <div className="flex gap-2 mb-3">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="flex-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 px-2 py-1.5"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="wg">मारवाड़ी (Waghera)</option>
            </select>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-slate-800 text-slate-300 px-3 rounded border border-slate-700 flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button 
            onClick={() => useDemoStore.getState().startDemo()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20 border border-emerald-500/50"
          >
            <Play className="w-3.5 h-3.5" /> {t('btn.demo')}
          </button>
        </div>
      </div>

      {NAV.map(section => (
        <div className="nav-section" key={section.sectionKey}>
          <div className="nav-section-label">{t(section.sectionKey)}</div>
          {section.items.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center' }}>
          <span className="pulse-dot" style={{ width: 6, height: 6 }}></span>
          {t('status.live')}
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
          {t('status.engine')}
        </p>
      </div>
    </aside>
  )
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading module...</p>
    </div>
  )
}

function AppShell() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const { startStreaming, fetchField, fetchAlerts, selectedWell } = useWellStore()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isLanding) {
      fetchField()
      fetchAlerts()
      const stopStream = startStreaming()
      return stopStream
    }
  }, [isLanding])

  if (isLanding) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    )
  }

  return (
    <div className="app-shell">
      {/* Global App Header (with Hamburger) */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setIsMobileNavOpen(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>BaghewalaOS</h1>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Well {selectedWell}</p>
          </div>
        </div>
      </header>

      {/* Drawer Overlay Backdrop */}
      <div 
        className={`drawer-overlay ${isMobileNavOpen ? 'open' : ''}`}
        onClick={() => setIsMobileNavOpen(false)}
      />

      <div className={`sidebar-wrapper ${isMobileNavOpen ? 'open' : ''}`} style={{ position: 'relative' }}>
        <Sidebar isOpen={isMobileNavOpen} />
      </div>

      <DemoOverlay />
      
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/field" element={<FieldDashboard />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/reservoir" element={<ReservoirPage />} />
            <Route path="/wellbore" element={<WellborePage />} />
            <Route path="/srp" element={<SrpPage />} />
            <Route path="/css-optimizer" element={<CssOptimizerPage />} />
            <Route path="/whatif" element={<WhatIfPage />} />
            <Route path="/horizon" element={<HorizonPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/ai" element={<AiCopilotPage />} />
            <Route path="/economics" element={<EconomicsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/models" element={<ModelMetricsPage />} />
            <Route path="/visualizer" element={<VisualizerPage />} />
            <Route path="*" element={<FieldDashboard />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/field" className={({ isActive }) => `mobile-bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Map />
          <span>Map</span>
        </NavLink>
        <NavLink to="/visualizer" className={({ isActive }) => `mobile-bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Video />
          <span>Twin</span>
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `mobile-bottom-nav-item ${isActive ? 'active' : ''}`}>
          <AlertTriangle />
          <span>Alerts</span>
        </NavLink>
        <NavLink to="/ai" className={({ isActive }) => `mobile-bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Bot />
          <span>Copilot</span>
        </NavLink>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
        }}
      />
      <Routes>
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}
