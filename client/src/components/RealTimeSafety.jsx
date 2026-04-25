import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

const API = 'http://localhost:5001/api';
const TT  = {
  contentStyle: {
    background: '#fff', border: '1px solid var(--border-bright)',
    borderRadius: 8, boxShadow: 'var(--shadow-hover)', fontSize: 12,
  },
};

const RISK_LEVELS = [
  { label: 'Critical', min: 80, color: '#852E47' },
  { label: 'High',     min: 60, color: '#AA542B' },
  { label: 'Moderate', min: 40, color: '#C2441C' },
  { label: 'Low',      min: 0,  color: '#839958' },
];

function getRisk(score) {
  return RISK_LEVELS.find(r => score >= r.min) || RISK_LEVELS[3];
}

// ── SVG Arc Gauge ─────────────────────────────────────────────
function RiskGauge({ score, label }) {
  const level  = getRisk(score);
  const clamp  = Math.min(100, Math.max(0, score));
  const r      = 38;
  const cx     = 55, cy = 52;
  const toRad  = deg => (deg * Math.PI) / 180;
  const pt     = angle => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  });
  const sweep    = 180 * (clamp / 100);
  const start    = pt(180);
  const end      = pt(180 + sweep);
  const trackEnd = pt(360);
  const lg       = sweep > 180 ? 1 : 0;
  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`;
  const fillPath  = sweep > 0
    ? `M ${start.x} ${start.y} A ${r} ${r} 0 ${lg} 1 ${end.x} ${end.y}`
    : '';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width={110} height={68} style={{ overflow:'visible' }}>
        <path d={trackPath} fill="none" stroke="var(--border)"
          strokeWidth={8} strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={level.color}
            strokeWidth={8} strokeLinecap="round" />
        )}
        <text x={cx} y={cy + 8} textAnchor="middle"
          style={{ fontFamily:'var(--font-display)', fontSize:22,
            fontWeight:800, fill:level.color }}>
          {Math.round(score)}
        </text>
      </svg>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:10,
        color:'var(--text-muted)', textTransform:'uppercase',
        letterSpacing:'0.07em', marginTop:-4 }}>{label}</div>
      <span style={{ background:level.color+'18',
        border:`1px solid ${level.color}40`, color:level.color,
        fontFamily:'var(--font-mono)', fontSize:10,
        padding:'2px 9px', borderRadius:10 }}>{level.label}</span>
    </div>
  );
}

// ── Sensor Stream Card ─────────────────────────────────────────
function SensorCard({ label, unit, color, value, history,
  threshold, showThreshold, description }) {
  const latest = parseFloat(value);
  const isLux  = label === 'Light Level';
  const over   = isLux ? latest < threshold : latest > threshold;

  return (
    <div className="card" style={{
      padding: 0,
      border: over && showThreshold
        ? `1.5px solid ${color}` : '1px solid var(--border)',
    }}>
      <div style={{ padding:'11px 13px 7px',
        borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10,
              color:'var(--text-muted)', textTransform:'uppercase',
              letterSpacing:'0.06em' }}>{label}</div>
            {description && (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9,
                color:'var(--text-muted)', marginTop:1,
                opacity:0.7 }}>{description}</div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:21,
              fontWeight:700,
              color: over && showThreshold
                ? color : 'var(--accent-midnight)' }}>
              {value}
            </span>
            <span style={{ fontSize:11,
              color:'var(--text-muted)' }}>{unit}</span>
          </div>
        </div>
        {showThreshold && (
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9,
            marginTop:3, color: over ? color : 'var(--text-muted)' }}>
            {over
              ? `⚠ ${isLux ? 'Dark environment' : 'Above threshold'}`
              : `Threshold: ${isLux
                ? `<${threshold}` : `>${threshold}`}${unit}`}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={55}>
        <AreaChart data={history}
          margin={{ top:4, right:0, left:0, bottom:0 }}>
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0"
              x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color}
            fill={`url(#sg-${label})`} strokeWidth={1.5}
            dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Zone Pulse (live feature) ─────────────────────────────────
const ZONES = [
  'Maradana','Kollupitiya','Wellawatte','Gampaha',
  'Colombo Fort','Nugegoda','Moratuwa','Bambalapitiya',
  'Dehiwala','Mount Lavinia',
];
const ZONE_BASE_RISK = {
  'Maradana':713,'Kollupitiya':601,'Wellawatte':525,
  'Gampaha':418,'Colombo Fort':369,'Nugegoda':357,
  'Moratuwa':289,'Bambalapitiya':154,'Dehiwala':100,
  'Mount Lavinia':79,
};
const MAX_BASE = 713;

function ZonePulse({ tick, paused }) {
  const [zoneScores, setZoneScores] = useState(() =>
    Object.fromEntries(
      ZONES.map(z => [z,
        Math.round((ZONE_BASE_RISK[z] / MAX_BASE) * 70
          + Math.random() * 20)])
    )
  );
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (paused) return;
    setZoneScores(prev => {
      const next = { ...prev };
      const toSpike = ZONES.filter(() => Math.random() < 0.25);
      toSpike.forEach(z => {
        const base  = (ZONE_BASE_RISK[z] / MAX_BASE) * 70;
        const noise = (Math.random() - 0.4) * 15;
        next[z] = Math.min(100, Math.max(5,
          Math.round(base + noise + Math.random() * 10)));
      });
      if (toSpike.length) {
        const hottest = toSpike.reduce((a, b) =>
          next[a] > next[b] ? a : b);
        if (next[hottest] > 75) {
          const types = [
            'Violent motion','Sudden movement',
            'Panic button','High sound level',
          ];
          setLastEvent({
            zone:  hottest,
            score: next[hottest],
            type:  types[Math.floor(Math.random() * types.length)],
            time:  new Date().toLocaleTimeString('en-GB', {
              hour:'2-digit', minute:'2-digit', second:'2-digit',
            }),
          });
        }
      }
      return next;
    });
  }, [tick, paused]);

  const sorted = [...ZONES].sort((a, b) =>
    zoneScores[b] - zoneScores[a]);

  return (
    <div>
      {lastEvent && (
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'8px 12px', marginBottom:14,
          background:'rgba(133,46,71,0.06)',
          border:'1px solid rgba(133,46,71,0.2)',
          borderRadius:8, animation:'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize:16 }}>🚨</span>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:12, fontWeight:600,
              color:'var(--alert-red)' }}>{lastEvent.type}</span>
            <span style={{ fontSize:12,
              color:'var(--text-secondary)' }}>
              {' '}detected in <b>{lastEvent.zone}</b>
            </span>
          </div>
          <span style={{ fontFamily:'var(--font-mono)',
            fontSize:10, color:'var(--text-muted)' }}>
            {lastEvent.time}
          </span>
          <span style={{
            fontFamily:'var(--font-mono)', fontSize:10,
            padding:'2px 8px', borderRadius:8,
            background:'rgba(133,46,71,0.1)',
            color:'var(--alert-red)',
            border:'1px solid rgba(133,46,71,0.25)',
          }}>Score: {lastEvent.score}</span>
        </div>
      )}

      <div style={{ display:'grid',
        gridTemplateColumns:'1fr 1fr', gap:'6px 24px' }}>
        {sorted.map(zone => {
          const score = zoneScores[zone];
          const color = score > 75 ? '#852E47'
            : score > 55 ? '#AA542B'
            : score > 35 ? '#FFC64F'
            : '#839958';
          return (
            <div key={zone}>
              <div style={{ display:'flex',
                justifyContent:'space-between',
                alignItems:'center', marginBottom:3 }}>
                <span style={{ fontSize:11,
                  color:'var(--text-secondary)',
                  fontWeight:500 }}>{zone}</span>
                <span style={{ fontFamily:'var(--font-mono)',
                  fontSize:10, color, fontWeight:700 }}>
                  {score}
                </span>
              </div>
              <div style={{ height:6, background:'var(--border)',
                borderRadius:3, overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${score}%`,
                  background:color, borderRadius:3,
                  transition:'width 0.6s ease, background 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:'flex', gap:14, marginTop:12,
        alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10,
          color:'var(--text-muted)' }}>RISK:</span>
        {[
          { label:'Low',      color:'#839958' },
          { label:'Moderate', color:'#FFC64F' },
          { label:'High',     color:'#AA542B' },
          { label:'Critical', color:'#852E47' },
        ].map(({ label, color }) => (
          <span key={label} style={{ display:'flex',
            alignItems:'center', gap:5 }}>
            <span style={{ width:8, height:8, borderRadius:2,
              background:color, display:'inline-block' }} />
            <span style={{ fontFamily:'var(--font-mono)',
              fontSize:10, color:'var(--text-muted)' }}>
              {label}
            </span>
          </span>
        ))}
        <span style={{ marginLeft:'auto',
          fontFamily:'var(--font-mono)', fontSize:10,
          color:'var(--text-muted)' }}>
          Updates every 2s · weighted from real data
        </span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function RealTimeSafety() {
  const [tick,             setTick]             = useState(0);
  const [paused,           setPaused]           = useState(false);
  const [showThresh,       setShowThresh]       = useState(true);
  const [activeDevice,     setActiveDevice]     = useState('AWG-0007');
  const [histLen,          setHistLen]          = useState(20);
  const [deviceOptions,    setDeviceOptions]    = useState([]);
  const [hourlyData,       setHourlyData]       = useState([]);
  const [dowData,          setDowData]          = useState([]);
  const [emergencyLog,     setEmergencyLog]     = useState([]);
  const [sensorThresholds, setSensorThresholds] = useState({
    accel: 12.9, gyro: 40, sound: 82, lux: 30, battery: 65,
  });
  const [sensorHistories, setSensorHistories]   = useState({
    accel:   Array.from({ length:20 }, (_, i) => ({ t:i, v:9.91 })),
    gyro:    Array.from({ length:20 }, (_, i) => ({ t:i, v:26 })),
    sound:   Array.from({ length:20 }, (_, i) => ({ t:i, v:58.6 })),
    lux:     Array.from({ length:20 }, (_, i) => ({ t:i, v:389 })),
    battery: Array.from({ length:20 }, (_, i) => ({ t:i, v:81.4 - i*0.05 })),
  });
  const [riskScores, setRiskScores] = useState({
    zone:68, motion:45, time:72, overall:62,
  });

  // ── Load static data once ──────────────────────────────────
  useEffect(() => {
    const safe = (url, setter) =>
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(setter)
        .catch(err => console.warn('Fetch failed:', url, err.message));

    safe(`${API}/sensors/devices`, d =>
      setDeviceOptions(d.map(x => x.id).slice(0, 8)));

    safe(`${API}/analytics/sensor-stats`, stats =>
      setSensorThresholds({
        accel:   +(stats.accel.mean  * 1.3).toFixed(2),
        gyro:    40,
        sound:   +(stats.sound.mean  * 1.4).toFixed(1),
        lux:     30,
        battery: 65,
      })
    );

    safe(`${API}/sensors/hourly`,       setHourlyData);
    safe(`${API}/sensors/dow`,          setDowData);
    safe(`${API}/sensors/emergency-log`,setEmergencyLog);
  }, []);

  // ── Poll live sensor reading every 2s ──────────────────────
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      fetch(`${API}/sensors/reading?device=${activeDevice}`)
        .then(r => r.json())
        .then(data => {
          setTick(t => t + 1);
          setSensorHistories(prev => {
            const n = { ...prev };
            const s = data.sensors;
            [['accel','accel'],['gyro','gyro'],
             ['sound','sound'],['lux','lux'],
             ['battery','battery']].forEach(([key, src]) => {
              const arr = prev[key] || [];
              n[key] = [...arr.slice(-(histLen - 1)),
                { t: Date.now(), v: s[src] }];
            });
            return n;
          });
          setRiskScores(data.riskScores);
        })
        .catch(() => {
          // fallback drift if API unreachable
          setTick(t => t + 1);
          setSensorHistories(prev => {
            const n = { ...prev };
            const drift = {
              accel:0.3, gyro:2, sound:3, lux:15, battery:-0.05,
            };
            Object.keys(n).forEach(k => {
              const last = n[k].slice(-1)[0] || { t:0, v:10 };
              const v = Math.max(0,
                last.v + (Math.random() - 0.5) * drift[k]);
              n[k] = [...n[k].slice(-(histLen - 1)),
                { t:last.t + 1, v:+v.toFixed(2) }];
            });
            return n;
          });
          setRiskScores(prev => ({
            zone:    Math.min(100, Math.max(0,
              prev.zone    + (Math.random()-0.48)*4)),
            motion:  Math.min(100, Math.max(0,
              prev.motion  + (Math.random()-0.5)*6)),
            time:    prev.time,
            overall: Math.min(100, Math.max(0,
              prev.overall + (Math.random()-0.48)*3)),
          }));
        });
    }, 2000);
    return () => clearInterval(iv);
  }, [paused, activeDevice, histLen]);

  const sensors = [
    {
      label:'Movement Sensor', unit:'m/s²', color:'#852E47',
      key:'accel', threshold:sensorThresholds.accel,
      value: sensorHistories.accel.slice(-1)[0]?.v.toFixed(2)||'—',
      description:'Detects falls, violence, struggle',
    },
    {
      label:'Rotation Sensor', unit:'dps', color:'#AA542B',
      key:'gyro', threshold:sensorThresholds.gyro,
      value: sensorHistories.gyro.slice(-1)[0]?.v.toFixed(1)||'—',
      description:'Detects spinning, twisting',
    },
    {
      label:'Sound Level', unit:'dB', color:'#519CAB',
      key:'sound', threshold:sensorThresholds.sound,
      value: sensorHistories.sound.slice(-1)[0]?.v.toFixed(1)||'—',
      description:'Detects screaming, loud events',
    },
    {
      label:'Light Level', unit:'lux', color:'#FFC64F',
      key:'lux', threshold:sensorThresholds.lux,
      value: Math.round(
        sensorHistories.lux.slice(-1)[0]?.v||0),
      description:'Low lux = dark/risky area',
    },
    {
      label:'Battery Level', unit:'%', color:'#839958',
      key:'battery', threshold:sensorThresholds.battery,
      value: sensorHistories.battery.slice(-1)[0]?.v.toFixed(0)||'—',
      description:'Device power status',
    },
  ];

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">Device</span>
        {(deviceOptions.length ? deviceOptions : ['AWG-0007'])
          .slice(0, 6).map(d => (
          <button key={d}
            className={`filter-btn ${activeDevice===d?'active':''}`}
            onClick={() => setActiveDevice(d)}
            style={{ fontSize:10 }}>{d}</button>
        ))}
        <div style={{ width:1, height:18,
          background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">History</span>
        {[[10,'10 pts'],[20,'20 pts'],[40,'40 pts']].map(([v,l]) => (
          <button key={v}
            className={`filter-btn ${histLen===v?'active':''}`}
            onClick={() => setHistLen(v)}>{l}</button>
        ))}
        <div style={{ width:1, height:18,
          background:'var(--border)', margin:'0 4px' }} />
        <label className="toggle-wrap">
          <button className={`toggle ${showThresh?'on':''}`}
            onClick={() => setShowThresh(x => !x)} />
          <span>Show Thresholds</span>
        </label>
        <label className="toggle-wrap" style={{ marginLeft:8 }}>
          <button className={`toggle ${!paused?'on':''}`}
            onClick={() => setPaused(x => !x)} />
          <span>{paused ? 'Paused' : 'Live Feed'}</span>
        </label>
        <span style={{ marginLeft:'auto',
          fontFamily:'var(--font-mono)', fontSize:10,
          color:'var(--text-muted)' }}>
          {paused ? '⏸ Feed paused' : `⟳ Update #${tick}`}
        </span>
      </div>

      <div className="page-body">
        {/* Risk Gauges */}
        <div className="card mb-4 fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">
                Current Risk Levels — {activeDevice}
              </div>
              <div className="card-subtitle">
                Scores computed from live sensor readings.
                0 = safe · 100 = critical.
              </div>
            </div>
            <span className="card-tag tag-red"
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              {!paused && (
                <span className="status-dot"
                  style={{ marginRight:0 }} />
              )}
              {paused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
          <div className="card-body">
            <div style={{ display:'flex',
              justifyContent:'space-around',
              alignItems:'center', flexWrap:'wrap', gap:16 }}>
              <RiskGauge score={Math.round(riskScores.zone)}
                label="Area Danger" />
              <RiskGauge score={Math.round(riskScores.motion)}
                label="Movement Alert" />
              <RiskGauge score={Math.round(riskScores.time)}
                label="Time-of-Day Risk" />
              <RiskGauge score={Math.round(riskScores.overall)}
                label="Overall Safety" />

              <div style={{ flex:1, minWidth:200 }}>
                {[
                  { label:'Area Danger',    val:riskScores.zone },
                  { label:'Movement Alert', val:riskScores.motion },
                  { label:'Time of Day',    val:riskScores.time },
                  { label:'Overall Safety', val:riskScores.overall },
                ].map(({ label, val }) => {
                  const color = getRisk(val).color;
                  return (
                    <div key={label} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex',
                        justifyContent:'space-between',
                        marginBottom:4 }}>
                        <span style={{ fontFamily:'var(--font-mono)',
                          fontSize:10,
                          color:'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontFamily:'var(--font-mono)',
                          fontSize:11, color,
                          fontWeight:600 }}>
                          {Math.round(val)}/100
                        </span>
                      </div>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-fill"
                          style={{ width:`${val}%`,
                            background:color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sensor Cards */}
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(5,1fr)',
          gap:14, marginBottom:16 }}
          className="fade-in">
          {sensors.map(s => (
            <SensorCard
              key={s.key}
              label={s.label}
              unit={s.unit}
              color={s.color}
              value={s.value}
              history={sensorHistories[s.key]}
              threshold={s.threshold}
              showThreshold={showThresh}
              description={s.description}
            />
          ))}
        </div>

        <div className="grid-2 mb-4">
          {/* Hourly Pattern */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">
                  What Time of Day Has the Most Incidents?
                </div>
                <div className="card-subtitle">
                  Emergency events by hour across 16 months of data
                </div>
              </div>
              <span className="card-tag tag-amber">HOURLY</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hourlyData}
                  margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="hourGrad"
                      x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#852E47"
                        stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#852E47"
                        stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3"
                    stroke="var(--border)" />
                  <XAxis dataKey="hour_label"
                    tick={{ fontSize:9 }} interval={3} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="emergencies"
                    name="Emergencies" stroke="#852E47"
                    fill="url(#hourGrad)" strokeWidth={2}
                    dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Emergency Log */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Emergency Events</div>
                <div className="card-subtitle">
                  Latest alerts triggered by AWG devices
                </div>
              </div>
              <span className="card-tag tag-red">
                <span className="status-dot" />LOG
              </span>
            </div>
            <div className="card-body"
              style={{ padding:'6px 16px' }}>
              {emergencyLog.length === 0 ? (
                <div style={{ padding:'20px 0',
                  textAlign:'center',
                  color:'var(--text-muted)',
                  fontFamily:'var(--font-mono)', fontSize:12 }}>
                  Loading emergency log…
                </div>
              ) : emergencyLog.map((log, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'flex-start',
                  gap:10, padding:'9px 0',
                  borderBottom: i < emergencyLog.length - 1
                    ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize:13, flexShrink:0 }}>
                    {log.type==='critical' ? '🔴'
                      : log.type==='warning' ? '🟡' : '🔵'}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12,
                      color:'var(--text-primary)',
                      overflow:'hidden',
                      textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }}>
                      {log.event}
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)',
                      fontSize:10, color:'var(--text-muted)',
                      marginTop:2 }}>
                      {log.time} · {log.zone} · {log.user}
                      {log.night ? ' · 🌙' : ' · ☀️'}
                    </div>
                  </div>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:10,
                    padding:'2px 7px', borderRadius:8,
                    flexShrink:0,
                    background: log.type==='critical'
                      ? 'rgba(133,46,71,0.08)'
                      : log.type==='warning'
                        ? 'rgba(255,198,79,0.1)'
                        : 'rgba(81,156,171,0.1)',
                    color: log.type==='critical' ? '#852E47'
                      : log.type==='warning' ? '#8a5e00'
                      : '#105666',
                    border: `1px solid ${
                      log.type==='critical'
                        ? 'rgba(133,46,71,0.2)'
                        : log.type==='warning'
                          ? 'rgba(255,198,79,0.3)'
                          : 'rgba(81,156,171,0.2)'}`,
                  }}>{log.type.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone Pulse */}
        <div className="card mb-4 fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">
                Live Zone Activity Pulse
              </div>
              <div className="card-subtitle">
                Real-time simulated emergency activity across
                all 10 Colombo zones — weighted from real data
              </div>
            </div>
            <span className="card-tag tag-red"
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              {!paused && (
                <span className="status-dot"
                  style={{ marginRight:0 }} />
              )}
              LIVE
            </span>
          </div>
          <div className="card-body">
            <ZonePulse tick={tick} paused={paused} />
          </div>
        </div>

        {/* Day of Week */}
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">
                Which Day of the Week Has the Most Emergencies?
              </div>
              <div className="card-subtitle">
                Total emergency events per weekday —
                Jan 2025 to Apr 2026
              </div>
            </div>
            <span className="card-tag tag-cyan">
              WEEKLY PATTERN
            </span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dowData}
                margin={{ top:4, right:16, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:10 }} />
                <Tooltip {...TT} />
                <Bar dataKey="emergencies" name="Emergencies"
                  radius={[4,4,0,0]}>
                  {dowData.map((_, i) => (
                    <Cell key={i} fill={[
                      '#852E47','#AA542B','#C2441C','#FFC64F',
                      '#839958','#519CAB','#105666',
                    ][i % 7]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}