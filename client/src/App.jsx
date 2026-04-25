import React, { useState } from 'react';
import './App.css';
import AnalyticsInsights from './components/AnalyticsInsights';
import WorkflowDecision from './components/WorkflowDecision';
import RealTimeSafety from './components/RealTimeSafety';
import MapVisualization from './components/MapVisualization';
import Chatbot from './components/Chatbot';

const PAGES = [
  {
    id: 'analytics',
    label: 'Crime Statistics',
    icon: '📊',
    badge: '20K',
    header: 'Crime Statistics & Trends',
    sub: 'Explore incident patterns, risk breakdowns, and demographic insights',
  },
  {
    id: 'workflow',
    label: 'Emergency Response',
    icon: '🚨',
    badge: '6',
    header: 'Emergency Response Tracker',
    sub: 'Track active incidents, response progress, and resolution rates',
  },
  {
    id: 'realtime',
    label: 'Live Safety Feed',
    icon: '📡',
    badge: 'LIVE',
    header: 'Live Safety Feed',
    sub: 'Real-time sensor readings, risk levels, and emergency alerts',
  },
  {
    id: 'map',
    label: 'Danger Zone Map',
    icon: '🗺️',
    badge: '11K',
    header: 'Danger Zone Map',
    sub: 'See where incidents happen, when they peak, and which areas need attention',
  },
  {
    id: 'chat',
    label: 'Ask the AI Assistant',
    icon: '🤖',
    badge: 'AI',
    header: 'Ask the AI Assistant',
    sub: 'Get plain-English answers about any part of the data',
  },
];

export default function App() {
  const [activePage, setActivePage] = useState('analytics');
  const page = PAGES.find(p => p.id === activePage);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1>Alert Way<br/>Guardian</h1>
          <p>Safety Analytics Platform</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Dashboards</div>
          {PAGES.filter(p => p.id !== 'chat').map(p => (
            <div key={p.id} className={`nav-item ${activePage === p.id ? 'active' : ''}`}
              onClick={() => setActivePage(p.id)}>
              <div className="nav-icon">{p.icon}</div>
              <span style={{ flex: 1 }}>{p.label}</span>
              <span className="nav-badge">{p.badge}</span>
            </div>
          ))}

          <div className="nav-section-label" style={{ marginTop: 10 }}>AI Tools</div>
          {PAGES.filter(p => p.id === 'chat').map(p => (
            <div key={p.id} className={`nav-item ${activePage === p.id ? 'active' : ''}`}
              onClick={() => setActivePage(p.id)}>
              <div className="nav-icon">{p.icon}</div>
              <span style={{ flex: 1 }}>{p.label}</span>
              <span className="nav-badge" style={{ color: 'rgba(131,153,88,0.9)', borderColor: 'rgba(131,153,88,0.3)' }}>{p.badge}</span>
            </div>
          ))}

          <div className="nav-section-label" style={{ marginTop: 10 }}>Data Sources</div>
          {[
            { name: 'Crime Reports', count: '20,177', color: '#852E47' },
            { name: 'Harassment Reports', count: '11,203', color: '#519CAB' },
          ].map(ds => (
            <div key={ds.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 11.5, color: 'rgba(195,231,241,0.5)' }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: ds.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{ds.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(195,231,241,0.3)' }}>{ds.count}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div><span className="status-dot" />System Active</div>
          <div style={{ marginTop: 3, opacity: 0.6 }}>IT4031 · R26 Group 70</div>
        </div>
      </aside>

      <main className="main-content">
        {activePage !== 'chat' && (
          <div className="page-header">
            <div className="page-header-left">
              <h2>{page.header}</h2>
              <p>{page.sub}</p>
            </div>
            <div className="page-header-right">
              <span className="header-chip live"><span className="status-dot" />Live Data</span>
            </div>
          </div>
        )}
        {activePage === 'analytics' && <AnalyticsInsights />}
        {activePage === 'workflow'  && <WorkflowDecision />}
        {activePage === 'realtime'  && <RealTimeSafety />}
        {activePage === 'map'       && <MapVisualization />}
        {activePage === 'chat'      && <Chatbot />}
      </main>
    </div>
  );
}