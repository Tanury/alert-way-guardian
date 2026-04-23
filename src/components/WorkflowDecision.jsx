import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const ALL_ALERTS = [
  { id:'AWG-0891', type:'Assault',         location:'Kasarani, Nairobi',  severity:'critical', status:'DISPATCHED', time:'2 min ago',  icon:'🚨', unit:'Unit 3', eta:'4 min' },
  { id:'AWG-0890', type:'Stalking',         location:'Westlands, Nairobi', severity:'high',     status:'VERIFIED',   time:'7 min ago',  icon:'👁',  unit:'Unit 7', eta:'9 min' },
  { id:'AWG-0889', type:'Touching/Groping', location:'CBD, Nairobi',       severity:'high',     status:'REPORTED',   time:'12 min ago', icon:'⚠️', unit:'—',       eta:'—' },
  { id:'AWG-0888', type:'Chain Snatching',  location:'Parklands',          severity:'medium',   status:'RESOLVED',   time:'34 min ago', icon:'🔗', unit:'Unit 2', eta:'Done' },
  { id:'AWG-0887', type:'Vandalism',        location:'Embakasi',           severity:'low',      status:'RESOLVED',   time:'51 min ago', icon:'📋', unit:'Unit 5', eta:'Done' },
  { id:'AWG-0886', type:'Fraud',            location:'Kilimani',           severity:'medium',   status:'VERIFIED',   time:'1 hr ago',   icon:'💳', unit:'Unit 1', eta:'15 min' },
];

const WORKFLOW_STAGES = [
  { id:1, label:'Incident Reported',      desc:'Panic trigger or manual report received', status:'done',    time:'00:00' },
  { id:2, label:'Sensor Data Verified',   desc:'GPS and motion data cross-checked',        status:'done',    time:'00:12' },
  { id:3, label:'Alert Sent Out',         desc:'Guardian and nearest unit notified',       status:'active',  time:'00:28' },
  { id:4, label:'Help On The Way',        desc:'Response unit dispatched to location',     status:'pending', time:'--:--' },
  { id:5, label:'Incident Closed',        desc:'Case resolved and evidence logged',        status:'pending', time:'--:--' },
];

const STATUS_META = {
  DISPATCHED: { color:'#852E47', bg:'rgba(133,46,71,0.08)',  border:'rgba(133,46,71,0.22)' },
  VERIFIED:   { color:'#8a5e00', bg:'rgba(255,198,79,0.1)',  border:'rgba(255,198,79,0.32)' },
  REPORTED:   { color:'#105666', bg:'rgba(81,156,171,0.1)',  border:'rgba(81,156,171,0.25)' },
  RESOLVED:   { color:'#4a6830', bg:'rgba(131,153,88,0.1)', border:'rgba(131,153,88,0.28)' },
};

const SEVERITY_CLASS = { critical:'severity-critical', high:'severity-high', medium:'severity-medium', low:'severity-low' };

const tooltipStyle = { background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, boxShadow:'var(--shadow-hover)' };

export default function WorkflowDecision() {
  const [selectedAlert, setSelectedAlert]   = useState(ALL_ALERTS[0]);
  const [statusFilter,  setStatusFilter]    = useState('ALL');
  const [severityFilter,setSeverityFilter]  = useState('ALL');
  const [sortBy,        setSortBy]          = useState('time');
  const [showResolved,  setShowResolved]    = useState(true);
  const [tick,          setTick]            = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x+1), 3000);
    return () => clearInterval(t);
  }, []);

  const filtered = ALL_ALERTS
    .filter(a => statusFilter   === 'ALL' || a.status   === statusFilter)
    .filter(a => severityFilter === 'ALL' || a.severity === severityFilter)
    .filter(a => showResolved || a.status !== 'RESOLVED')
    .sort((a,b) => {
      if (sortBy === 'severity') {
        const order = { critical:0, high:1, medium:2, low:3 };
        return order[a.severity] - order[b.severity];
      }
      return 0;
    });

  const counts = {
    critical:   ALL_ALERTS.filter(a => a.severity === 'critical').length,
    dispatched: ALL_ALERTS.filter(a => a.status === 'DISPATCHED').length,
    pending:    ALL_ALERTS.filter(a => a.status !== 'RESOLVED').length,
    resolved:   ALL_ALERTS.filter(a => a.status === 'RESOLVED').length,
  };

  const responseData = [
    { type:'Assault',   avg:4.2, target:5 },
    { type:'Burglary',  avg:6.8, target:7 },
    { type:'Fraud',     avg:12.1,target:15 },
    { type:'Vandalism', avg:9.3, target:10 },
    { type:'Theft',     avg:7.5, target:8 },
  ];

  const weeklyData = [
    { week:'Week 1', resolved:82, dispatched:91 },
    { week:'Week 2', resolved:78, dispatched:85 },
    { week:'Week 3', resolved:89, dispatched:94 },
    { week:'Week 4', resolved:91, dispatched:97 },
    { week:'Week 5', resolved:86, dispatched:90 },
    { week:'Week 6', resolved:93, dispatched:98 },
  ];

  return (
    <div>
      <div className="filter-bar">
        <span className="filter-label">Filter by Status</span>
        {['ALL','REPORTED','VERIFIED','DISPATCHED','RESOLVED'].map(s => (
          <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`}
            onClick={() => setStatusFilter(s)}>{s === 'ALL' ? 'All Statuses' : s}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Severity</span>
        {['ALL','critical','high','medium','low'].map(s => (
          <button key={s} className={`filter-btn ${severityFilter===s?'active':''}`}
            onClick={() => setSeverityFilter(s)}>{s === 'ALL' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Sort</span>
        <select className="ctrl-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="time">Most Recent First</option>
          <option value="severity">Most Severe First</option>
        </select>
        <label className="toggle-wrap" style={{ marginLeft:8 }}>
          <button className={`toggle ${showResolved?'on':''}`} onClick={() => setShowResolved(x => !x)} />
          <span>Show Resolved</span>
        </label>
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>
          Updated {tick * 3}s ago
        </span>
      </div>

      <div className="page-body">
        {/* Summary KPIs */}
        <div className="grid-4 mb-6">
          {[
            { label:'Critical Alerts',   value:counts.critical,   color:'red',   icon:'🔴' },
            { label:'Being Responded To',value:counts.dispatched,  color:'amber', icon:'🚓' },
            { label:'Awaiting Response', value:counts.pending,     color:'cyan',  icon:'⏳' },
            { label:'Resolved Today',    value:counts.resolved,    color:'green', icon:'✅' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`kpi-card ${color} fade-in`}>
              <div className="kpi-icon">{icon}</div>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid-asymm mb-4">
          {/* Incident Queue */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Active Incident Queue</div>
                <div className="card-subtitle">Click any row to see the full response timeline</div>
              </div>
              <span className="card-tag tag-red">{filtered.length} SHOWING</span>
            </div>
            <div className="card-body" style={{ padding:'6px 16px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12 }}>
                  No incidents match the current filters.
                </div>
              ) : filtered.map(alert => (
                <div key={alert.id} className="alert-item" style={{ cursor:'pointer', borderRadius:6, padding:'10px 6px', background: selectedAlert.id === alert.id ? 'var(--bg-hover)' : 'transparent' }}
                  onClick={() => setSelectedAlert(alert)}>
                  <div className={`alert-severity ${SEVERITY_CLASS[alert.severity]}`} />
                  <div className="alert-content">
                    <div className="alert-title">{alert.icon} {alert.type} — {alert.location}</div>
                    <div className="alert-meta">{alert.id} · {alert.time} · Unit: {alert.unit} · ETA: {alert.eta}</div>
                  </div>
                  <span className="alert-status" style={{
                    background: STATUS_META[alert.status]?.bg,
                    border:`1px solid ${STATUS_META[alert.status]?.border}`,
                    color: STATUS_META[alert.status]?.color,
                  }}>{alert.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Response Timeline */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Response Timeline</div>
                <div className="card-subtitle">{selectedAlert.id} — {selectedAlert.type}</div>
              </div>
              <span className="card-tag" style={{
                background: STATUS_META[selectedAlert.status]?.bg,
                border:`1px solid ${STATUS_META[selectedAlert.status]?.border}`,
                color: STATUS_META[selectedAlert.status]?.color,
                fontFamily:'var(--font-mono)', fontSize:10, padding:'3px 8px', borderRadius:10,
              }}>{selectedAlert.status}</span>
            </div>
            <div className="card-body">
              {WORKFLOW_STAGES.map(step => (
                <div key={step.id} className="workflow-step">
                  <div className={`step-circle ${step.status}`}>
                    {step.status==='done' ? '✓' : step.status==='active' ? '◉' : step.id}
                  </div>
                  <div className="step-info">
                    <div className="step-label">{step.label}</div>
                    <div className="step-time">{step.desc}</div>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>{step.time}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', alignSelf:'center', marginRight:4 }}>TAGS:</span>
              <span className="card-tag tag-red">HIGH PRIORITY</span>
              <span className="card-tag tag-amber">NIGHT INCIDENT</span>
              <span className="card-tag tag-cyan">GPS CONFIRMED</span>
            </div>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Response Time */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">How Fast Do We Respond?</div>
                <div className="card-subtitle">Average response time vs target, in minutes</div>
              </div>
              <span className="card-tag tag-amber">PERFORMANCE</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={responseData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="type" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} unit="m" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:10 }} />
                  <Bar dataKey="avg"    name="Actual (min)"  fill="#852E47" radius={[3,3,0,0]} />
                  <Bar dataKey="target" name="Target (min)"  fill="#C3E7F1" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resolution Rate */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Weekly Resolution Rate</div>
                <div className="card-subtitle">What percentage of cases are being closed each week</div>
              </div>
              <span className="card-tag tag-green">TREND</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={weeklyData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} unit="%" domain={[70,100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:10 }} />
                  <Line type="monotone" dataKey="resolved"   name="Cases Closed" stroke="#839958" strokeWidth={2} dot={{ r:3 }} />
                  <Line type="monotone" dataKey="dispatched" name="Units Sent"    stroke="#519CAB" strokeWidth={2} dot={{ r:3 }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:12, marginTop:12 }}>
                {[{ label:'Avg Close Rate', value:'86.5%', color:'#839958' },{ label:'Avg Dispatch', value:'92.5%', color:'#519CAB' },{ label:'SLA Met', value:'91.2%', color:'#FFC64F' }].map(({ label, value, color }) => (
                  <div key={label} style={{ flex:1, background:'var(--bg-hover)', borderRadius:7, padding:'8px 10px' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}