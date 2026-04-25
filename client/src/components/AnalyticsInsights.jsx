import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const API = 'http://localhost:5001/api';
const COLORS = {
  Normal:'#839958', Abnormal:'#FFC64F', Violent:'#852E47', Sudden:'#AA542B',
};
const ZONE_COLORS = ['#852E47','#519CAB','#AA542B','#FFC64F','#839958','#D3968C','#105666','#C2441C','#9b6dff','#2de08a'];
const TT = { contentStyle:{ background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, boxShadow:'var(--shadow-hover)', fontSize:12 } };

function fmt(m) {
  const [y, mo] = m.split('-');
  return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo]}'${y.slice(2)}`;
}

export default function AnalyticsInsights() {
  const [kpis,        setKpis]       = useState(null);
  const [monthly,     setMonthly]    = useState([]);
  const [zones,       setZones]      = useState([]);
  const [motionDist,  setMotionDist] = useState([]);
  const [userType,    setUserType]   = useState([]);
  const [deviceState, setDeviceState]= useState([]);
  const [nightDay,    setNightDay]   = useState(null);
  const [hourly,      setHourly]     = useState([]);
  const [timeRange,   setTimeRange]  = useState('all');
  const [customFrom,  setCustomFrom] = useState('');
  const [customTo,    setCustomTo]   = useState('');
  const [metric,      setMetric]     = useState('emergencies');
/*
  useEffect(() => {
    fetch(`${API}/analytics/kpis`).then(r=>r.json()).then(setKpis);
    fetch(`${API}/analytics/monthly`).then(r=>r.json()).then(setMonthly);
    fetch(`${API}/analytics/zones`).then(r=>r.json()).then(setZones);
    fetch(`${API}/analytics/motion`).then(r=>r.json()).then(setMotionDist);
    fetch(`${API}/analytics/user-type`).then(r=>r.json()).then(setUserType);
    fetch(`${API}/analytics/device-state`).then(r=>r.json()).then(setDeviceState);
    fetch(`${API}/analytics/night-day`).then(r=>r.json()).then(setNightDay);
    fetch(`${API}/analytics/hourly`).then(r=>r.json()).then(setHourly);
  }, []);
*/

  useEffect(() => {
  const safeFetch = (url, setter) =>
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} from ${url}`);
        return r.json();
      })
      .then(setter)
      .catch(err => console.warn('Fetch failed:', err.message));

  safeFetch(`${API}/analytics/kpis`,         setKpis);
  safeFetch(`${API}/analytics/monthly`,      setMonthly);
  safeFetch(`${API}/analytics/zones`,        setZones);
  safeFetch(`${API}/analytics/motion`,       setMotionDist);
  safeFetch(`${API}/analytics/user-type`,    setUserType);
  safeFetch(`${API}/analytics/device-state`, setDeviceState);
  safeFetch(`${API}/analytics/night-day`,    setNightDay);
  safeFetch(`${API}/analytics/hourly`,       setHourly);
}, []);

  const filteredMonthly = useMemo(() => {
    if (!monthly.length) return [];
    if (timeRange === 'custom' && customFrom && customTo) {
      return monthly.filter(m => m.Month >= customFrom.slice(0,7) && m.Month <= customTo.slice(0,7));
    }
    if (timeRange === '6m')  return monthly.slice(-6);
    if (timeRange === '3m')  return monthly.slice(-3);
    if (timeRange === 'yr1') return monthly.slice(0, 12);
    if (timeRange === 'yr2') return monthly.slice(12);
    return monthly;
  }, [monthly, timeRange, customFrom, customTo]);

  const chartMonthly = filteredMonthly.map(m => ({ ...m, label: fmt(m.Month) }));

  // recompute KPI numbers from filtered months
  const filteredKpis = useMemo(() => {
    if (!filteredMonthly.length || !kpis) return kpis;
    const total       = filteredMonthly.reduce((s,m) => s + m.total, 0);
    const emergencies = filteredMonthly.reduce((s,m) => s + m.emergencies, 0);
    const avgResp     = filteredMonthly.reduce((s,m) => s + (m.avg_response||0), 0) / filteredMonthly.length;
    return { ...kpis, total_records: total, total_emergencies: emergencies,
             avg_response_sec: Math.round(avgResp) };
  }, [filteredMonthly, kpis]);

  const nightDayPie = nightDay ? [
    { name:'Night Emergencies', value: nightDay.night_emergencies },
    { name:'Day Emergencies',   value: nightDay.day_emergencies   },
  ] : [];

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">Time Period</span>
        {[['all','All 16 Months'],['yr1','2025'],['yr2','2026'],['6m','Last 6 Mo'],['3m','Last 3 Mo'],['custom','Custom']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${timeRange===v?'active':''}`} onClick={()=>setTimeRange(v)}>{l}</button>
        ))}
        {timeRange === 'custom' && (
          <>
            <input type="month" className="filter-date" value={customFrom} min="2025-01" max="2026-04" onChange={e=>setCustomFrom(e.target.value)} />
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)'}}>to</span>
            <input type="month" className="filter-date" value={customTo}   min="2025-01" max="2026-04" onChange={e=>setCustomTo(e.target.value)} />
          </>
        )}
        <div style={{width:1,height:18,background:'var(--border)',margin:'0 4px'}} />
        <span className="filter-label">Trend Metric</span>
        {[['emergencies','Emergencies'],['total','All Records'],['avg_response','Avg Response (s)']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${metric===v?'active':''}`} onClick={()=>setMetric(v)}>{l}</button>
        ))}
      </div>

      <div className="page-body">
        {/* KPI Cards */}
        <div className="grid-kpi mb-6">
          {[
            { label:'Total Records',      value: filteredKpis?.total_records?.toLocaleString()    || '—', sub:`In selected period`,                          color:'cyan',   icon:'📋' },
            { label:'Emergency Events',   value: filteredKpis?.total_emergencies?.toLocaleString()|| '—', sub:`${kpis ? ((filteredKpis.total_emergencies/filteredKpis.total_records)*100).toFixed(1) : 0}% of records`, color:'red',    icon:'🚨' },
            { label:'Avg Response Time',  value: `${filteredKpis?.avg_response_sec || '—'}s`,          sub:'Improving month-on-month',                      color:'amber',  icon:'⏱️' },
            { label:'Night Emergencies',  value: `${kpis?.night_emergency_pct || '—'}%`,               sub:'Occur during night hours',                      color:'purple', icon:'🌙' },
            { label:'Violent Events',     value: kpis?.violent_events?.toLocaleString() || '—',         sub:'Detected via accelerometer',                    color:'green',  icon:'⚡' },
          ].map(({label,value,sub,color,icon},i) => (
            <div key={label} className={`kpi-card ${color} fade-in fade-in-delay-${i+1}`}>
              <div className="kpi-icon">{icon}</div>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
              <div className="kpi-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Monthly Trend */}
        <div className="card mb-4 fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Trend — {metric === 'emergencies' ? 'Emergency Events' : metric === 'total' ? 'All Records' : 'Avg Response Time (sec)'}</div>
              <div className="card-subtitle">Jan 2025 – Apr 2026 · seasonal peak visible May–Aug 2025</div>
            </div>
            <span className="card-tag tag-red">16 MONTHS</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartMonthly} margin={{top:4,right:8,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#852E47" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#852E47" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{fontSize:10}} />
                <YAxis tick={{fontSize:10}} />
                <Tooltip {...TT} />
                <Area type="monotone" dataKey={metric} name={metric === 'avg_response' ? 'Avg Response (s)' : metric}
                  stroke="#852E47" fill="url(#areaGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Zone Emergency Breakdown */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Which Areas Have the Most Emergencies?</div>
                <div className="card-subtitle">Emergency event count by Colombo zone</div>
              </div>
              <span className="card-tag tag-red">HOTSPOTS</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={zones.sort((a,b)=>b.emergencies-a.emergencies).slice(0,8)}
                  layout="vertical" margin={{top:4,right:20,left:70,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{fontSize:10}} />
                  <YAxis dataKey="Zone" type="category" tick={{fontSize:11}} width={80} />
                  <Tooltip {...TT} />
                  <Bar dataKey="emergencies" name="Emergencies" radius={[0,3,3,0]}>
                    {zones.sort((a,b)=>b.emergencies-a.emergencies).slice(0,8).map((_,i) => (
                      <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Motion Type Donut */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">What Types of Motion Are Detected?</div>
                <div className="card-subtitle">Breakdown across all 15,000 sensor readings</div>
              </div>
              <span className="card-tag tag-amber">MOTION</span>
            </div>
            <div className="card-body" style={{display:'flex',alignItems:'center',gap:16}}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={motionDist} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                    dataKey="count" paddingAngle={3} nameKey="name">
                    {motionDist.map((d,i) => <Cell key={i} fill={COLORS[d.name] || '#ccc'} />)}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1}}>
                {motionDist.map((d,i) => (
                  <div key={d.name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                    <div style={{width:9,height:9,borderRadius:2,background:COLORS[d.name]||'#ccc',flexShrink:0}} />
                    <span style={{fontSize:12,color:'var(--text-secondary)',flex:1}}>{d.name}</span>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)'}}>{d.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Who is Being Protected */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Who Is the System Protecting?</div>
                <div className="card-subtitle">User type distribution across all devices</div>
              </div>
              <span className="card-tag tag-purple">USERS</span>
            </div>
            <div className="card-body">
              {userType.map((u,i) => {
                const total = userType.reduce((s,x)=>s+x.count,0);
                const colors = ['#852E47','#519CAB','#FFC64F'];
                return (
                  <div key={u.name} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:13,color:'var(--text-primary)',fontWeight:500}}>{u.name}</span>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:colors[i]}}>
                        {u.count.toLocaleString()} · {((u.count/total)*100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress-track" style={{height:8}}>
                      <div className="progress-fill" style={{width:`${(u.count/total)*100}%`,background:colors[i]}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Night vs Day */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Day vs Night Emergency Split</div>
                <div className="card-subtitle">Are incidents more common at night?</div>
              </div>
              <span className="card-tag tag-cyan">DAY / NIGHT</span>
            </div>
            <div className="card-body" style={{display:'flex',alignItems:'center',gap:16}}>
              <ResponsiveContainer width="50%" height={190}>
                <PieChart>
                  <Pie data={nightDayPie} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                    dataKey="value" paddingAngle={4}>
                    <Cell fill="#105666" />
                    <Cell fill="#FFC64F" />
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1}}>
                {nightDay && [
                  {label:'🌙 Night',value:nightDay.night_emergencies,color:'#105666'},
                  {label:'☀️ Day',  value:nightDay.day_emergencies,  color:'#FFC64F'},
                ].map(d => (
                  <div key={d.label} style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,color:'var(--text-primary)'}}>{d.label}</span>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:d.color,fontWeight:600}}>{d.value.toLocaleString()}</span>
                    </div>
                    <div className="progress-track" style={{height:7}}>
                      <div className="progress-fill" style={{
                        width:`${(d.value/(nightDay.night_emergencies+nightDay.day_emergencies))*100}%`,
                        background:d.color
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{marginTop:12,padding:'8px 12px',background:'var(--bg-hover)',borderRadius:8}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-muted)',marginBottom:3}}>NIGHT EMERGENCY RATE</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,color:'#105666'}}>
                    {kpis?.night_emergency_pct}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone Sensor Heatmap Table */}
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">Zone-Level Sensor Averages</div>
              <div className="card-subtitle">Average sensor readings per Colombo zone — higher sound/accel = higher risk</div>
            </div>
            <span className="card-tag tag-green">ZONE ANALYSIS</span>
          </div>
          <div className="card-body" style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{borderBottom:'2px solid var(--border)'}}>
                  {['Zone','Total','Emergencies','Avg Response','Avg Sound (dB)','Avg Light (lux)','Violent Events'].map(h => (
                    <th key={h} style={{padding:'6px 10px',textAlign:'left',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-muted)',fontWeight:500,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zones.sort((a,b)=>b.emergencies-a.emergencies).map((z,i) => (
                  <tr key={z.Zone} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'#F8FCFD'}}>
                    <td style={{padding:'7px 10px',fontWeight:600,color:'var(--accent-midnight)'}}>{z.Zone}</td>
                    <td style={{padding:'7px 10px',fontFamily:'var(--font-mono)',color:'var(--text-secondary)'}}>{z.total?.toLocaleString()}</td>
                    <td style={{padding:'7px 10px'}}>
                      <span style={{fontFamily:'var(--font-mono)',fontWeight:600,
                        color: z.emergencies > 500 ? '#852E47' : z.emergencies > 200 ? '#AA542B' : '#839958'}}>
                        {z.emergencies?.toLocaleString()}
                      </span>
                    </td>
                    <td style={{padding:'7px 10px',fontFamily:'var(--font-mono)',color:'var(--text-secondary)'}}>{z.avg_response}s</td>
                    <td style={{padding:'7px 10px',fontFamily:'var(--font-mono)',color:'var(--text-secondary)'}}>{z.avg_sound?.toFixed(1)}</td>
                    <td style={{padding:'7px 10px',fontFamily:'var(--font-mono)',color:'var(--text-secondary)'}}>{z.avg_lux?.toFixed(0)}</td>
                    <td style={{padding:'7px 10px'}}>
                      <span style={{fontFamily:'var(--font-mono)',color: z.violent > 200 ? '#852E47' : '#AA542B',fontWeight:600}}>
                        {z.violent?.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}