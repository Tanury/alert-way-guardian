import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

const API = 'http://localhost:5001/api';
const TT  = { contentStyle:{ background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, boxShadow:'var(--shadow-hover)', fontSize:12 } };

const STATUS_META = {
  'Dispatched': { color:'#852E47', bg:'rgba(133,46,71,0.08)',  border:'rgba(133,46,71,0.22)' },
  'En Route':   { color:'#8a5e00', bg:'rgba(255,198,79,0.1)',  border:'rgba(255,198,79,0.32)' },
  'Alert Sent': { color:'#105666', bg:'rgba(81,156,171,0.1)',  border:'rgba(81,156,171,0.25)' },
  'Resolved':   { color:'#4a6830', bg:'rgba(131,153,88,0.1)', border:'rgba(131,153,88,0.28)' },
  'On Scene':   { color:'#7a3535', bg:'rgba(211,150,140,0.1)',border:'rgba(211,150,140,0.28)' },
};

const SEVERITY_DOT = { Critical:'severity-critical', High:'severity-high', Medium:'severity-medium' };

// ── Dynamic timeline based on Dispatch_Status ─────────────────
const STAGE_DEFINITIONS = [
  {
    label:      'Emergency Detected',
    desc:       'Sensor threshold crossed or panic button pressed',
    reachedBy:  ['Alert Sent', 'Dispatched', 'En Route', 'On Scene', 'Resolved'],
    activeFor:  [],
    time:       'T+0:00',
  },
  {
    label:      'Data Verified',
    desc:       'GPS, accelerometer and sound cross-validated',
    reachedBy:  ['Dispatched', 'En Route', 'On Scene', 'Resolved'],
    activeFor:  ['Alert Sent'],
    time:       'T+0:12',
  },
  {
    label:      'Alert Sent to Contacts',
    desc:       'SMS dispatched to registered guardian',
    reachedBy:  ['En Route', 'On Scene', 'Resolved'],
    activeFor:  ['Dispatched'],
    time:       'T+0:28',
  },
  {
    label:      'Response Unit Dispatched',
    desc:       'Nearest unit en route to GPS location',
    reachedBy:  ['On Scene', 'Resolved'],
    activeFor:  ['En Route'],
    time:       'T+1:00',
  },
  {
    label:      'Incident Resolved',
    desc:       'Unit on scene, case logged and closed',
    reachedBy:  ['Resolved'],
    activeFor:  ['On Scene'],
    time:       'T+varies',
  },
];

function getStages(dispatchStatus) {
  return STAGE_DEFINITIONS.map(stage => {
    const done   = stage.reachedBy.includes(dispatchStatus)
                   && !stage.activeFor.includes(dispatchStatus);
    const active = stage.activeFor.includes(dispatchStatus);
    return {
      ...stage,
      status: done ? 'done' : active ? 'active' : 'pending',
    };
  });
}

// ── Component ─────────────────────────────────────────────────
export default function WorkflowDecision() {
  const [alerts,       setAlerts]       = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [respStats,    setRespStats]    = useState([]);
  const [monthly,      setMonthly]      = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [sevFilter,    setSevFilter]    = useState('ALL');
  const [statFilter,   setStatFilter]   = useState('ALL');
  const [sort,         setSort]         = useState('date');
  const [showResolved, setShowResolved] = useState(true);
  const [tick,         setTick]         = useState(0);

  // ── Load alert queue (re-runs on filter change) ───────────────
  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams({ severity: sevFilter, status: statFilter, sort });
      fetch(`${API}/alerts?${params}`)
        .then(r => r.json())
        .then(d => {
          setAlerts(d);
          // only set selected on first load, not on every refresh
          setSelected(prev => prev ?? (d.length ? d[0] : null));
        })
        .catch(err => console.warn('Alerts fetch failed:', err.message));
    };
    load();
    const iv = setInterval(() => { setTick(t => t + 1); load(); }, 10000);
    return () => clearInterval(iv);
  }, [sevFilter, statFilter, sort]);

  // ── Load summary, response stats, monthly trend ───────────────
  useEffect(() => {
    const safe = (url, setter) =>
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(setter)
        .catch(err => console.warn(`Failed ${url}:`, err.message));

    safe(`${API}/alerts/summary`,      setSummary);
    safe(`${API}/alerts/response-stats`, setRespStats);
    safe(`${API}/analytics/monthly`,   d =>
      setMonthly(d.map(m => ({
        month:        m.Month,
        label:        m.Month.replace('-', '\''),
        emergencies:  m.emergencies,
        avg_response: m.avg_response,
      })))
    );
  }, []);

  const dispatchPie = summary?.dispatch || [];
  const PIE_COLORS  = ['#852E47', '#AA542B', '#519CAB', '#839958', '#D3968C'];

  const visible = alerts
    .filter(a => showResolved   || a.Dispatch_Status !== 'Resolved')
    .filter(a => sevFilter  === 'ALL' || a.Severity_Level  === sevFilter)
    .filter(a => statFilter === 'ALL' || a.Dispatch_Status === statFilter);

  // ── Stages for the currently selected incident ────────────────
  const stages = selected ? getStages(selected.Dispatch_Status) : [];

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">Severity</span>
        {['ALL', 'Critical', 'High', 'Medium'].map(s => (
          <button key={s} className={`filter-btn ${sevFilter === s ? 'active' : ''}`}
            onClick={() => setSevFilter(s)}>{s}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Status</span>
        {['ALL', 'Dispatched', 'En Route', 'On Scene', 'Alert Sent', 'Resolved'].map(s => (
          <button key={s} className={`filter-btn ${statFilter === s ? 'active' : ''}`}
            onClick={() => setStatFilter(s)} style={{ fontSize:10 }}>{s}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <select className="ctrl-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="date">Most Recent</option>
          <option value="severity">Most Critical</option>
        </select>
        <label className="toggle-wrap" style={{ marginLeft:8 }}>
          <button className={`toggle ${showResolved ? 'on' : ''}`}
            onClick={() => setShowResolved(x => !x)} />
          <span>Show Resolved</span>
        </label>
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>
          Auto-refresh in {10 - (tick % 10) || 10}s
        </span>
      </div>

      <div className="page-body">
        {/* KPI Cards */}
        <div className="grid-4 mb-6">
          {[
            { label:'Critical Alerts',   value: summary?.critical   ?? '—', color:'red',   icon:'🔴' },
            { label:'High Priority',     value: summary?.high       ?? '—', color:'amber', icon:'🟠' },
            { label:'Total Emergencies', value: summary?.total      ?? '—', color:'cyan',  icon:'🚨' },
            { label:'Avg Response Time', value: summary?.avgResponse ? `${summary.avgResponse}s` : '—', color:'green', icon:'⏱️' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`kpi-card ${color} fade-in`}>
              <div className="kpi-icon">{icon}</div>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid-asymm mb-4">
          {/* ── Incident Queue ─────────────────────────────────── */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Emergency Incident Queue</div>
                <div className="card-subtitle">
                  Click a row to view the response timeline · {visible.length} showing
                </div>
              </div>
              <span className="card-tag tag-red">{visible.length} RECORDS</span>
            </div>
            <div className="card-body" style={{ padding:'4px 14px', maxHeight:400, overflowY:'auto' }}>
              {visible.length === 0 ? (
                <div style={{ padding:'24px 0', textAlign:'center',
                  color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12 }}>
                  No incidents match the current filters.
                </div>
              ) : visible.map((a, i) => {
                const isSelected = selected === a
                  || (selected?.Device_ID === a.Device_ID && selected?.Date === a.Date && selected?.Hour === a.Hour);
                return (
                  <div key={i} className="alert-item"
                    style={{
                      cursor: 'pointer', borderRadius: 6, padding: '9px 6px',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setSelected(a)}>
                    <div className={`alert-severity ${SEVERITY_DOT[a.Severity_Level] || 'severity-low'}`} />
                    <div className="alert-content">
                      <div className="alert-title">
                        {a.Motion_Type === 'Violent' ? '🚨'
                          : a.Motion_Type === 'Sudden' ? '⚡' : '⚠️'} {a.Motion_Type} — {a.Zone} · {a.User_Type}
                      </div>
                      <div className="alert-meta">
                        {a.Device_ID} · {a.Date} {String(a.Hour).padStart(2, '0')}:00
                        · {a.Is_Night ? '🌙 Night' : '☀️ Day'}
                      </div>
                    </div>
                    <span className="alert-status" style={{
                      background: STATUS_META[a.Dispatch_Status]?.bg,
                      border: `1px solid ${STATUS_META[a.Dispatch_Status]?.border}`,
                      color: STATUS_META[a.Dispatch_Status]?.color,
                    }}>{a.Dispatch_Status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Response Timeline ──────────────────────────────── */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Response Timeline</div>
                <div className="card-subtitle">
                  {selected
                    ? `${selected.Device_ID} · ${selected.Zone}`
                    : 'Select an incident from the queue'}
                </div>
              </div>
              {selected && (
                <span style={{
                  background: STATUS_META[selected.Dispatch_Status]?.bg,
                  border: `1px solid ${STATUS_META[selected.Dispatch_Status]?.border}`,
                  color: STATUS_META[selected.Dispatch_Status]?.color,
                  fontFamily:'var(--font-mono)', fontSize:10,
                  padding:'3px 8px', borderRadius:10,
                }}>{selected.Dispatch_Status}</span>
              )}
            </div>

            <div className="card-body">
              {selected ? (
                <>
                  {/* Quick-fact grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
                    {[
                      { label:'User Type',   value: selected.User_Type },
                      { label:'Severity',    value: selected.Severity_Level },
                      { label:'Motion',      value: selected.Motion_Type },
                      { label:'Response',    value: `${selected.Response_Time_Sec}s` },
                      { label:'Time of Day', value: selected.Is_Night ? '🌙 Night' : '☀️ Day' },
                      { label:'Day',         value: selected.Day_of_Week },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        background:'var(--bg-hover)', borderRadius:6, padding:'6px 10px',
                      }}>
                        <div style={{
                          fontFamily:'var(--font-mono)', fontSize:9,
                          color:'var(--text-muted)', textTransform:'uppercase',
                          letterSpacing:'0.06em',
                        }}>{label}</div>
                        <div style={{
                          fontSize:12, fontWeight:600,
                          color:'var(--text-primary)', marginTop:2,
                        }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Dynamic timeline */}
                  {stages.map(step => (
                    <div key={step.label} className="workflow-step">
                      <div className={`step-circle ${step.status}`}>
                        {step.status === 'done'   ? '✓'
                          : step.status === 'active' ? '◉'
                          : '○'}
                      </div>
                      <div className="step-info">
                        <div className="step-label">{step.label}</div>
                        <div className="step-time">{step.desc}</div>
                      </div>
                      <div style={{
                        fontFamily:'var(--font-mono)', fontSize:10,
                        color: step.status === 'pending'
                          ? 'var(--text-muted)'
                          : step.status === 'active'
                            ? STATUS_META[selected.Dispatch_Status]?.color || 'var(--accent-saffron)'
                            : 'var(--accent-moss)',
                        flexShrink:0, fontWeight: step.status !== 'pending' ? 600 : 400,
                      }}>
                        {step.status === 'pending' ? '—' : step.time}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{
                  padding:'40px 0', textAlign:'center',
                  color:'var(--text-muted)', fontSize:12,
                  fontFamily:'var(--font-mono)', lineHeight:1.8,
                }}>
                  Select an incident<br/>from the queue on the left
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Response Time by Severity */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Response Time by Severity Level</div>
                <div className="card-subtitle">Do critical incidents get faster responses?</div>
              </div>
              <span className="card-tag tag-amber">PERFORMANCE</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={respStats} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="severity" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:10 }} unit="s" />
                  <Tooltip {...TT} />
                  <Bar dataKey="avg_response_sec" name="Avg Response (sec)" radius={[4,4,0,0]}>
                    {respStats.map((_, i) => (
                      <Cell key={i} fill={['#852E47','#AA542B','#FFC64F'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dispatch Status Pie */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Emergency Dispatch Status Breakdown</div>
                <div className="card-subtitle">Current status of all logged emergency events</div>
              </div>
              <span className="card-tag tag-cyan">DISPATCH</span>
            </div>
            <div className="card-body" style={{ display:'flex', alignItems:'center', gap:16 }}>
              <ResponsiveContainer width="50%" height={190}>
                <PieChart>
                  <Pie data={dispatchPie} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={76}
                    dataKey="count" nameKey="status" paddingAngle={3}>
                    {dispatchPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {dispatchPie.map((d, i) => (
                  <div key={d.status}
                    style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{
                      width:9, height:9, borderRadius:2,
                      background: PIE_COLORS[i % PIE_COLORS.length], flexShrink:0,
                    }} />
                    <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }}>
                      {d.status}
                    </span>
                    <span style={{
                      fontFamily:'var(--font-mono)', fontSize:11,
                      color:'var(--text-muted)', fontWeight:600,
                    }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Response Time Improvement */}
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">Response Time Improvement Over 16 Months</div>
              <div className="card-subtitle">
                Avg response time per month — downward trend shows system maturation
              </div>
            </div>
            <span className="card-tag tag-green">IMPROVING</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={monthly} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize:9 }} interval={1} />
                <YAxis tick={{ fontSize:10 }} unit="s" domain={[200, 380]} />
                <Tooltip {...TT} />
                <Line type="monotone" dataKey="avg_response" name="Avg Response (sec)"
                  stroke="#519CAB" strokeWidth={2.5} dot={{ r:3, fill:'#519CAB' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}