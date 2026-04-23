import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import DATA from '../data/dataset.json';

const RISK_LEVELS = [
  { label:'Critical', min:80, color:'#852E47' },
  { label:'High',     min:60, color:'#AA542B' },
  { label:'Moderate', min:40, color:'#C2441C' },
  { label:'Low',      min:0,  color:'#839958' },
];

function getRisk(score) { return RISK_LEVELS.find(r => score >= r.min) || RISK_LEVELS[3]; }

function SensorCard({ label, unit, color, value, history, threshold, showThreshold }) {
  const over = parseFloat(value) > threshold;
  return (
    <div className="card" style={{ padding:0, border: over && showThreshold ? `1.5px solid ${color}` : '1px solid var(--border)' }}>
      <div style={{ padding:'11px 13px 7px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: over && showThreshold ? color : 'var(--accent-midnight)' }}>{value}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{unit}</span>
          </div>
        </div>
        {showThreshold && (
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color: over ? color : 'var(--text-muted)', marginTop:2 }}>
            {over ? '⚠ Above threshold' : `Threshold: ${threshold}${unit}`}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={55}>
        <AreaChart data={history} margin={{ top:4, right:0, left:0, bottom:0 }}>
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} fill={`url(#sg-${label})`} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RiskGauge({ score, label }) {
  const level = getRisk(score);
  const data = [{ value:score, fill:level.color },{ value:100-score, fill:'var(--border)' }];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ position:'relative', width:110, height:65 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="80%" innerRadius="68%" outerRadius="100%" startAngle={180} endAngle={0} data={data}>
            <RadialBar dataKey="value" cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)', fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:level.color }}>{score}</div>
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</div>
      <span style={{ background:level.color+'18', border:`1px solid ${level.color}40`, color:level.color, fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 8px', borderRadius:10 }}>{level.label}</span>
    </div>
  );
}

export default function RealTimeSafety() {
  const [tick,       setTick]       = useState(0);
  const [paused,     setPaused]     = useState(false);
  const [showThresh, setShowThresh] = useState(true);
  const [activeDevice,setActiveDevice] = useState('AWG-0891');
  const [histLen,    setHistLen]    = useState(20);

  const [sensorHistories, setSensorHistories] = useState({
    accel:   Array.from({ length:20 }, (_,i) => ({ t:i, v: +(Math.random()*0.3+0.1).toFixed(2) })),
    light:   Array.from({ length:20 }, (_,i) => ({ t:i, v: Math.round(Math.random()*200+400) })),
    motion:  Array.from({ length:20 }, (_,i) => ({ t:i, v: +(Math.random()*5+1).toFixed(1) })),
    battery: Array.from({ length:20 }, (_,i) => ({ t:i, v: +(78 - i*0.3).toFixed(1) })),
  });

  const [riskScores, setRiskScores] = useState({ zone:68, motion:45, time:72, overall:62 });

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      setTick(t => t+1);
      setSensorHistories(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(k => {
          const last = n[k][n[k].length-1];
          let v;
          if (k==='accel')   v = Math.max(0,   last.v + (Math.random()-0.5)*0.15);
          else if (k==='light')  v = Math.max(0,   last.v + (Math.random()-0.5)*40);
          else if (k==='motion') v = Math.max(0,   last.v + (Math.random()-0.5)*2);
          else                   v = Math.max(10,  last.v - 0.1);
          n[k] = [...n[k].slice(-(histLen-1)), { t:last.t+1, v:Math.round(v*100)/100 }];
        });
        return n;
      });
      setRiskScores(prev => ({
        zone:    Math.min(100, Math.max(0, prev.zone    + (Math.random()-0.48)*4)),
        motion:  Math.min(100, Math.max(0, prev.motion  + (Math.random()-0.5)*6)),
        time:    prev.time,
        overall: Math.min(100, Math.max(0, prev.overall + (Math.random()-0.48)*3)),
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, [paused, histLen]);

  const DEVICES = ['AWG-0891','AWG-0890','AWG-0889','AWG-0888'];
  const THRESHOLDS = { accel:0.5, light:200, motion:6, battery:20 };

  const sensors = [
    { label:'Movement Sensor', unit:'g',   color:'#852E47', key:'accel',   threshold:THRESHOLDS.accel,   value: sensorHistories.accel.slice(-1)[0]?.v.toFixed(2) },
    { label:'Light Level',     unit:'lux', color:'#C2441C', key:'light',   threshold:THRESHOLDS.light,   value: Math.round(sensorHistories.light.slice(-1)[0]?.v) },
    { label:'Motion Index',    unit:'',    color:'#519CAB', key:'motion',  threshold:THRESHOLDS.motion,  value: sensorHistories.motion.slice(-1)[0]?.v.toFixed(1) },
    { label:'Battery Level',   unit:'%',   color:'#839958', key:'battery', threshold:THRESHOLDS.battery, value: sensorHistories.battery.slice(-1)[0]?.v.toFixed(0) },
  ];

  const hourlyData = DATA.sc_hourly.map(({ HOUR, count }) => ({ hour:`${String(HOUR).padStart(2,'0')}:00`, incidents:count }));
  const dowData    = DATA.sc_dow.map(({ DAYOFWEEK, count }) => ({ day: DAYOFWEEK?.slice(0,3)||'?', count:Math.round(count) }));

  const tooltipStyle = { background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, boxShadow:'var(--shadow-hover)', fontSize:12 };

  const emergencyLog = [
    { time:'14:23', event:'Panic button pressed — device AWG-0891', type:'critical' },
    { time:'14:17', event:'Unusual movement detected — AWG-0890',   type:'warning' },
    { time:'14:09', event:'Device entered unsafe zone — AWG-0889',  type:'info' },
    { time:'13:55', event:'Very low light detected — AWG-0888',     type:'warning' },
    { time:'13:42', event:'Route changed unexpectedly — AWG-0887',  type:'info' },
  ];

  return (
    <div>
      <div className="filter-bar">
        <span className="filter-label">Device</span>
        {DEVICES.map(d => (
          <button key={d} className={`filter-btn ${activeDevice===d?'active':''}`}
            onClick={() => setActiveDevice(d)}>{d}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">History Window</span>
        {[[10,'10 pts'],[20,'20 pts'],[40,'40 pts']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${histLen===v?'active':''}`}
            onClick={() => setHistLen(v)}>{l}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <label className="toggle-wrap">
          <button className={`toggle ${showThresh?'on':''}`} onClick={() => setShowThresh(x=>!x)} />
          <span>Show Thresholds</span>
        </label>
        <label className="toggle-wrap" style={{ marginLeft:8 }}>
          <button className={`toggle ${!paused?'on':''}`} onClick={() => setPaused(x=>!x)} />
          <span>{paused ? 'Feed Paused' : 'Feed Live'}</span>
        </label>
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>
          {paused ? '⏸ Paused' : `⟳ Tick #${tick}`}
        </span>
      </div>

      <div className="page-body">
        {/* Risk Gauges */}
        <div className="card mb-4 fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">Current Risk Levels — {activeDevice}</div>
              <div className="card-subtitle">Scores calculated from live sensor readings. Higher = more danger.</div>
            </div>
            <span className="card-tag tag-red" style={{ display:'flex', alignItems:'center', gap:5 }}>
              {!paused && <span className="status-dot" style={{ marginRight:0 }} />}LIVE
            </span>
          </div>
          <div className="card-body">
            <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', flexWrap:'wrap', gap:16 }}>
              <RiskGauge score={Math.round(riskScores.zone)}    label="Area Danger" />
              <RiskGauge score={Math.round(riskScores.motion)}  label="Unusual Movement" />
              <RiskGauge score={Math.round(riskScores.time)}    label="Time of Day Risk" />
              <RiskGauge score={Math.round(riskScores.overall)} label="Overall Safety" />
              <div style={{ flex:1, minWidth:200 }}>
                {[
                  { label:'Area Danger',       val:riskScores.zone },
                  { label:'Unusual Movement',  val:riskScores.motion },
                  { label:'Time of Day',        val:riskScores.time },
                  { label:'Overall Safety',     val:riskScores.overall },
                ].map(({ label, val }) => {
                  const color = getRisk(val).color;
                  return (
                    <div key={label} style={{ marginBottom:11 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color, fontWeight:600 }}>{Math.round(val)}/100</span>
                      </div>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-fill" style={{ width:`${val}%`, background:color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sensor Streams */}
        <div className="grid-4 mb-4 fade-in">
          {sensors.map(s => (
            <SensorCard key={s.key} label={s.label} unit={s.unit} color={s.color}
              value={s.value} history={sensorHistories[s.key]}
              threshold={s.threshold} showThreshold={showThresh} />
          ))}
        </div>

        <div className="grid-2 mb-4">
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">What Time of Day Is Most Dangerous?</div>
                <div className="card-subtitle">Number of harassment reports by hour (SafeCity data)</div>
              </div>
              <span className="card-tag tag-amber">HOURLY PATTERN</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hourlyData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#AA542B" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#AA542B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="hour" tick={{ fontSize:9 }} interval={3} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="incidents" name="Reports" stroke="#AA542B" fill="url(#hourGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Alerts & Events</div>
                <div className="card-subtitle">Automatic alerts triggered by device sensors</div>
              </div>
              <span className="card-tag tag-red">LIVE</span>
            </div>
            <div className="card-body" style={{ padding:'6px 16px' }}>
              {emergencyLog.map((log,i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 0', borderBottom: i < emergencyLog.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:13 }}>{log.type==='critical'?'🔴':log.type==='warning'?'🟡':'🔵'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'var(--text-primary)' }}>{log.event}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{log.time} today</div>
                  </div>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 7px', borderRadius:8, flexShrink:0,
                    background: log.type==='critical'?'rgba(133,46,71,0.08)':log.type==='warning'?'rgba(255,198,79,0.1)':'rgba(81,156,171,0.1)',
                    color: log.type==='critical'?'#852E47':log.type==='warning'?'#8a5e00':'#105666',
                    border: `1px solid ${log.type==='critical'?'rgba(133,46,71,0.2)':log.type==='warning'?'rgba(255,198,79,0.3)':'rgba(81,156,171,0.2)'}`,
                  }}>{log.type.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card fade-in">
          <div className="card-header">
            <div>
              <div className="card-title">Which Day of the Week Has the Most Incidents?</div>
              <div className="card-subtitle">Harassment reports from SafeCity, grouped by day</div>
            </div>
            <span className="card-tag tag-cyan">WEEKLY PATTERN</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={dowData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="dowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#519CAB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#519CAB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" name="Reports" stroke="#519CAB" fill="url(#dowGrad)" strokeWidth={2} dot={{ r:4, fill:'#519CAB' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}