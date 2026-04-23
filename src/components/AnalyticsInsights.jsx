import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import DATA from '../data/dataset.json';

const CAT_COLORS = {
  assault:   '#852E47',
  fraud:     '#519CAB',
  burglary:  '#AA542B',
  vandalism: '#FFC64F',
  theft:     '#839958',
};
const AGE_COLORS = ['#519CAB','#AA542B','#852E47','#FFC64F','#839958'];

// build a flat list of all monthly data points with real counts
const ALL_MONTHS = Object.keys(DATA.monthly_trend).sort();

function parseYM(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function fmtMonth(ym) {
  const d = parseYM(ym);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, padding:'10px 13px', fontSize:12, boxShadow:'var(--shadow-hover)' }}>
      <p style={{ fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginBottom:5, fontSize:10 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color, fontFamily:'var(--font-mono)', marginBottom:2 }}>
          {p.name}: <strong>{Number(p.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsInsights() {
  const [presetRange, setPresetRange]   = useState('all');
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo,   setCustomTo]       = useState('');
  const [activeCategories, setActiveCategories] = useState(
    new Set(['assault','fraud','burglary','vandalism','theft'])
  );

  const toggleCategory = cat => {
    setActiveCategories(prev => {
      const n = new Set(prev);
      n.has(cat) ? (n.size > 1 && n.delete(cat)) : n.add(cat);
      return n;
    });
  };

  // determine which months to show
  const filteredMonths = useMemo(() => {
    if (presetRange === 'custom' && customFrom && customTo) {
      return ALL_MONTHS.filter(m => m >= customFrom.slice(0,7) && m <= customTo.slice(0,7));
    }
    if (presetRange === '3m') return ALL_MONTHS.slice(-3);
    if (presetRange === '6m') return ALL_MONTHS.slice(-6);
    return ALL_MONTHS;
  }, [presetRange, customFrom, customTo]);

  const monthlyData = useMemo(() =>
    filteredMonths.map(m => ({ month: fmtMonth(m), ...DATA.monthly_trend[m] })),
    [filteredMonths]
  );

  // KPIs — recomputed from filtered months + active categories
  const kpis = useMemo(() => {
    let total = 0, assault = 0, female = 0;
    filteredMonths.forEach(m => {
      const row = DATA.monthly_trend[m] || {};
      activeCategories.forEach(cat => {
        const v = row[cat] || 0;
        total += v;
        if (cat === 'assault') assault += v;
      });
    });
    // female ratio stays ~50.1% (dataset-level, no month-level gender split)
    female = Math.round(total * 0.501);
    return { total, assault, female, femalePct: total ? ((female/total)*100).toFixed(1) : 0 };
  }, [filteredMonths, activeCategories]);

  const riskDistData = useMemo(() => {
    const demos = ['poor','middle class','rich'];
    const grouped = {};
    demos.forEach(d => { grouped[d] = {}; [...activeCategories].forEach(c => { grouped[d][c] = 0; }); });
    DATA.demo_breakdown.forEach(({ Category, Demographic, count }) => {
      if (grouped[Demographic] && activeCategories.has(Category)) grouped[Demographic][Category] = count;
    });
    return demos.map(d => ({ name: d === 'middle class' ? 'Middle Class' : d.charAt(0).toUpperCase()+d.slice(1), ...grouped[d] }));
  }, [activeCategories]);

  const agePieData = useMemo(() =>
    Object.entries(DATA.age_distribution).map(([k,v]) => ({ name: k, value: v })),
  []);

  const weatherData = useMemo(() => {
    const weathers = ['sunny','rainy','cloudy','windy'];
    const grouped = {};
    weathers.forEach(w => { grouped[w] = {}; [...activeCategories].forEach(c => { grouped[w][c] = 0; }); });
    DATA.weather_category.forEach(({ Weather, Category, count }) => {
      if (grouped[Weather] && activeCategories.has(Category)) grouped[Weather][Category] = count;
    });
    return weathers.map(w => ({ name: w.charAt(0).toUpperCase()+w.slice(1), ...grouped[w] }));
  }, [activeCategories]);

  // Gender bubble chart — male vs female per category
  const genderBubbleData = useMemo(() => {
    const out = {};
    DATA.gender_breakdown.forEach(({ Category, 'Victim Gender': g, count }) => {
      if (!activeCategories.has(Category)) return;
      if (!out[Category]) out[Category] = { category: Category, Female: 0, Male: 0 };
      if (g === 'female') out[Category].Female = count;
      else out[Category].Male = count;
    });
    return Object.values(out).map(d => ({
      ...d,
      label: d.category.charAt(0).toUpperCase() + d.category.slice(1),
      diff: d.Female - d.Male,
    }));
  }, [activeCategories]);

  const tooltipStyle = { background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, boxShadow:'var(--shadow-hover)' };

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">Time Period</span>
        {[['all','All Time'],['6m','Last 6 Months'],['3m','Last 3 Months'],['custom','Custom Range']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${presetRange===v?'active':''}`}
            onClick={() => setPresetRange(v)}>{l}</button>
        ))}
        {presetRange === 'custom' && (
          <>
            <input type="date" className="filter-date" value={customFrom}
              min="2022-04-01" max="2023-04-01"
              onChange={e => setCustomFrom(e.target.value)} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>to</span>
            <input type="date" className="filter-date" value={customTo}
              min="2022-04-01" max="2023-04-01"
              onChange={e => setCustomTo(e.target.value)} />
          </>
        )}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Crime Type</span>
        {Object.entries(CAT_COLORS).map(([cat, color]) => (
          <button key={cat}
            className={`filter-btn ${activeCategories.has(cat)?'active':''}`}
            style={activeCategories.has(cat)?{ borderColor:color, color, background:color+'12' }:{}}
            onClick={() => toggleCategory(cat)}>
            {cat.charAt(0).toUpperCase()+cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="page-body">
        {/* KPI Cards — live-filtered */}
        <div className="grid-kpi mb-6">
          {[
            { label:'Total Incidents',   value: kpis.total > 999 ? `${(kpis.total/1000).toFixed(1)}K` : kpis.total, sub:`In selected period`, color:'cyan',   icon:'📋' },
            { label:'Assault Cases',     value: kpis.assault > 999 ? `${(kpis.assault/1000).toFixed(1)}K` : kpis.assault, sub:`${kpis.total?((kpis.assault/kpis.total)*100).toFixed(1):0}% of incidents`, color:'red', icon:'⚠️' },
            { label:'Female Victims',    value:`${kpis.femalePct}%`, sub:`~${kpis.female.toLocaleString()} incidents`, color:'purple', icon:'👩' },
            { label:'Harassment Reports',value:`${(DATA.kpis.safecity_total/1000).toFixed(1)}K`, sub:'SafeCity database', color:'amber', icon:'📍' },
            { label:'Months Shown',      value: filteredMonths.length, sub:`of ${ALL_MONTHS.length} total`, color:'green', icon:'📅' },
          ].map(({ label, value, sub, color, icon }, i) => (
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
              <div className="card-title">Monthly Incident Count by Crime Type</div>
              <div className="card-subtitle">How many incidents were recorded each month for the selected period</div>
            </div>
            <span className="card-tag tag-cyan">TREND</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                <defs>
                  {Object.entries(CAT_COLORS).map(([cat, color]) => (
                    <linearGradient key={cat} id={`g-${cat}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize:10 }} />
                <YAxis tick={{ fontSize:10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:11 }} />
                {Object.entries(CAT_COLORS).filter(([c]) => activeCategories.has(c)).map(([cat, color]) => (
                  <Area key={cat} type="monotone" dataKey={cat}
                    stroke={color} fill={`url(#g-${cat})`} strokeWidth={2} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Risk by Demographic */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Who Gets Targeted Most?</div>
                <div className="card-subtitle">Crime exposure across income groups</div>
              </div>
              <span className="card-tag tag-red">DEMOGRAPHICS</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={riskDistData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:10 }} />
                  {Object.entries(CAT_COLORS).filter(([c]) => activeCategories.has(c)).map(([cat, color]) => (
                    <Bar key={cat} dataKey={cat} fill={color} radius={[3,3,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Age Pie */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Age Groups of Victims</div>
                <div className="card-subtitle">Which age groups are most affected</div>
              </div>
              <span className="card-tag tag-amber">AGE</span>
            </div>
            <div className="card-body" style={{ display:'flex', alignItems:'center', gap:16 }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={agePieData} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                    dataKey="value" paddingAngle={3}>
                    {agePieData.map((_,i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {agePieData.map((d,i) => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                    <div style={{ width:9, height:9, borderRadius:2, background:AGE_COLORS[i], flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }}>{d.name} years</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
                      {((d.value/DATA.kpis.total_incidents)*100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Weather */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Does Weather Affect Crime?</div>
                <div className="card-subtitle">Incident counts grouped by weather condition</div>
              </div>
              <span className="card-tag tag-cyan">ENVIRONMENT</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={weatherData} layout="vertical" margin={{ top:4, right:20, left:40, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize:10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize:11 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:10 }} />
                  {Object.entries(CAT_COLORS).filter(([c]) => activeCategories.has(c)).map(([cat, color]) => (
                    <Bar key={cat} dataKey={cat} fill={color} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender comparison — grouped bar replacing radar */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Male vs Female Victims by Crime Type</div>
                <div className="card-subtitle">Side-by-side comparison of gender victimization</div>
              </div>
              <span className="card-tag tag-purple">GENDER</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={genderBubbleData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:11 }} />
                  <Bar dataKey="Female" fill="#852E47" radius={[3,3,0,0]} />
                  <Bar dataKey="Male"   fill="#519CAB" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}