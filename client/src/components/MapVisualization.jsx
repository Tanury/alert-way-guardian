import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

const API = 'http://localhost:5001/api';
const TT  = {
  contentStyle: {
    background:'#fff', border:'1px solid var(--border-bright)',
    borderRadius:8, boxShadow:'var(--shadow-hover)', fontSize:12,
  },
};

const HEATMAP_DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HEATMAP_HOURS = ['00','03','06','09','12','15','18','21'];
const DOW_FULL = {
  Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday',
  Thu:'Thursday', Fri:'Friday',
  Sat:'Saturday', Sun:'Sunday',
};

const TILE_URLS = {
  dark:   'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light:  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

function getSeverityColor(pt) {
  if (pt.Emergency_Flag === 1) {
    if (pt.Severity_Level === 'Critical') return '#852E47';
    if (pt.Severity_Level === 'High')     return '#AA542B';
    return '#C2441C';
  }
  if (pt.Motion_Type === 'Violent')  return '#FFC64F';
  if (pt.Motion_Type === 'Abnormal') return '#839958';
  return '#519CAB';
}

function getHeatColor(score) {
  if (score > 75) return { bg:'rgba(133,46,71,0.82)',  text:'#fff' };
  if (score > 50) return { bg:'rgba(170,84,43,0.68)',  text:'#fff' };
  if (score > 25) return { bg:'rgba(255,198,79,0.55)', text:'#105666' };
  return           { bg:'rgba(81,156,171,0.15)',        text:'#4a7080' };
}

const ZONE_COLORS = [
  '#852E47','#AA542B','#C2441C','#FFC64F',
  '#839958','#519CAB','#105666','#D3968C',
];

export default function MapVisualization() {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const tileRef     = useRef(null);
  const dataLayer   = useRef(null);

  const [mapStyle,      setMapStyle]      = useState('light');
  const [activeLayer,   setActiveLayer]   = useState('all');
  const [drillInfo,     setDrillInfo]     = useState(null);
  const [heatHighlight, setHeatHighlight] = useState(null);
  const [showLabels,    setShowLabels]    = useState(true);
  const [minSeverity,   setMinSeverity]   = useState('all');
  const [mapPoints,     setMapPoints]     = useState([]);
  const [heatmapData,   setHeatmapData]   = useState([]);
  const [zoneData,      setZoneData]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [mapReady,      setMapReady]      = useState(false);

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    const safe = (url, setter) =>
      fetch(url)
        .then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        })
        .then(setter)
        .catch(err =>
          console.warn('Map fetch failed:', url, err.message));

    Promise.all([
      safe(`${API}/sensors/map-points`, setMapPoints),
      safe(`${API}/analytics/heatmap`,  setHeatmapData),
      safe(`${API}/analytics/zones`,    setZoneData),
    ]).finally(() => setLoading(false));
  }, []);

  // ── Build heatmap matrix ─────────────────────────────────────
  const heatMatrix = useMemo(() => {
    if (!heatmapData.length) return [];
    const maxVal = Math.max(...heatmapData.map(h => h.count));
    return HEATMAP_DAYS.flatMap(day =>
      HEATMAP_HOURS.map(hr => {
        const match = heatmapData.find(
          h => h.Day_of_Week === DOW_FULL[day]
            && h.Hour === parseInt(hr)
        );
        return {
          day, hour: hr,
          score: match
            ? Math.round((match.count / maxVal) * 100) : 0,
          count: match?.count || 0,
        };
      })
    );
  }, [heatmapData]);

  // ── Inject Leaflet CSS + JS, then init map ───────────────────
  useEffect(() => {
    // Inject CSS if not already present
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      const L = window.L;
      if (!L || mapInstance.current) return;

      // Wait until the container actually has dimensions
      if (!mapRef.current
        || mapRef.current.offsetWidth === 0
        || mapRef.current.offsetHeight === 0) {
        setTimeout(initMap, 200);
        return;
      }

      const map = L.map(mapRef.current, {
        center:        [6.93, 79.87],
        zoom:          12,
        minZoom:       10,
        maxZoom:       18,
        zoomControl:   true,
        worldCopyJump: false,
      });

      tileRef.current = L.tileLayer(TILE_URLS.light, {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 18,
      }).addTo(map);

      mapInstance.current = map;

      // Multiple invalidateSize calls to guarantee correct rendering
      setTimeout(() => { map.invalidateSize(); }, 100);
      setTimeout(() => { map.invalidateSize(); setMapReady(true); }, 600);
      setTimeout(() => { map.invalidateSize(); }, 1200);
    };

    if (window.L) {
      // Leaflet already loaded — small delay so React finishes painting
      setTimeout(initMap, 100);
    } else {
      // Load Leaflet JS dynamically
      if (!document.getElementById('leaflet-js')) {
        const script  = document.createElement('script');
        script.id     = 'leaflet-js';
        script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async  = true;
        script.onload = () => setTimeout(initMap, 100);
        document.head.appendChild(script);
      }
    }

    // Cleanup on unmount
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        dataLayer.current   = null;
        tileRef.current     = null;
        setMapReady(false);
      }
    };
  }, []);

  // ── Swap tile layer on style change ─────────────────────────
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current || !tileRef.current) return;
    mapInstance.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(TILE_URLS[mapStyle], {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 18,
    }).addTo(mapInstance.current);
  }, [mapStyle]);

  // ── Render markers — only after map is ready ─────────────────
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current || !mapPoints.length || !mapReady)
      return;

    // Remove previous layer safely
    if (dataLayer.current) {
      try {
        mapInstance.current.removeLayer(dataLayer.current);
      } catch (e) {}
      dataLayer.current = null;
    }

    // Force size recalculation before adding markers
    mapInstance.current.invalidateSize();

    // Delay marker rendering so the container paint is complete
    const timer = setTimeout(() => {
      const L = window.L;
      if (!L || !mapInstance.current) return;

      const filtered = mapPoints.filter(pt => {
        // Validate GPS coordinates are within Sri Lanka bounds
        if (!pt.GPS_Lat || !pt.GPS_Long)          return false;
        if (pt.GPS_Lat  < 5.9  || pt.GPS_Lat  > 9.9)  return false;
        if (pt.GPS_Long < 79.5 || pt.GPS_Long > 81.9)  return false;

        if (activeLayer === 'emergency'
          && pt.Emergency_Flag !== 1)              return false;
        if (activeLayer === 'normal'
          && pt.Emergency_Flag === 1)              return false;
        if (minSeverity === 'critical'
          && pt.Severity_Level !== 'Critical')     return false;
        if (minSeverity === 'high'
          && !['Critical','High']
            .includes(pt.Severity_Level))          return false;

        return true;
      });

      const layer = L.layerGroup();

      filtered.forEach(pt => {
        try {
          const isEmg  = pt.Emergency_Flag === 1;
          const color  = getSeverityColor(pt);
          const radius = isEmg
            ? (pt.Severity_Level === 'Critical' ? 11
              : pt.Severity_Level === 'High' ? 9 : 7)
            : 5;

          const marker = L.circleMarker(
            [pt.GPS_Lat, pt.GPS_Long],
            {
              radius,
              fillColor:   color,
              color:       color,
              fillOpacity: isEmg ? 0.78 : 0.45,
              weight:      isEmg ? 1.5  : 0.8,
            }
          );

          if (showLabels) {
            marker.bindPopup(`
              <div style="font-family:monospace;font-size:12px;
                padding:10px 13px;line-height:1.75;min-width:160px">
                <b style="font-size:13px">${pt.Zone}</b><br/>
                <span style="color:#4a7080">User:</span>
                  ${pt.User_Type}<br/>
                <span style="color:#4a7080">Motion:</span>
                  ${pt.Motion_Type}<br/>
                <span style="color:#4a7080">Time:</span>
                  ${pt.Is_Night ? '🌙 Night' : '☀️ Day'}<br/>
                ${isEmg
                  ? `<b style="color:#852E47;margin-top:4px;
                      display:block">
                      ⚠ ${pt.Severity_Level} Emergency
                    </b>`
                  : ''}
              </div>
            `);
          }

          marker.on('click', () => setDrillInfo({
            zone:     pt.Zone,
            user:     pt.User_Type,
            motion:   pt.Motion_Type,
            night:    pt.Is_Night,
            isEmg,
            severity: pt.Severity_Level,
            device:   pt.Device_ID,
            lat:      pt.GPS_Lat?.toFixed(4),
            lng:      pt.GPS_Long?.toFixed(4),
          }));

          marker.addTo(layer);

        } catch (e) {
          // Skip any individual marker that fails — don't crash the whole map
          console.warn('Skipped bad marker:', e.message);
        }
      });

      layer.addTo(mapInstance.current);
      dataLayer.current = layer;
      mapInstance.current.invalidateSize();

    }, 300);

    return () => clearTimeout(timer);

  }, [mapPoints, activeLayer, minSeverity, showLabels, mapReady]);

  const zoneBarData = [...zoneData]
    .sort((a, b) => b.emergencies - a.emergencies)
    .slice(0, 8)
    .map(z => ({ zone: z.Zone, emergencies: z.emergencies }));

  const emgCount  = mapPoints.filter(p => p.Emergency_Flag === 1).length;
  const normCount = mapPoints.filter(p => p.Emergency_Flag === 0).length;

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">Show</span>
        {[
          ['all',       'All Points'],
          ['emergency', 'Emergencies Only'],
          ['normal',    'Normal Activity'],
        ].map(([v, l]) => (
          <button key={v}
            className={`filter-btn ${activeLayer===v?'active':''}`}
            onClick={() => setActiveLayer(v)}>{l}</button>
        ))}
        <div style={{ width:1, height:18,
          background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Severity</span>
        {[
          ['all',      'All'],
          ['high',     'High+'],
          ['critical', 'Critical Only'],
        ].map(([v, l]) => (
          <button key={v}
            className={`filter-btn ${minSeverity===v?'active':''}`}
            onClick={() => setMinSeverity(v)}>{l}</button>
        ))}
        <div style={{ width:1, height:18,
          background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Map Style</span>
        {[['light','Light'],['dark','Dark'],['street','Street']]
          .map(([v, l]) => (
          <button key={v}
            className={`filter-btn ${mapStyle===v?'active':''}`}
            onClick={() => setMapStyle(v)}>{l}</button>
        ))}
        <div style={{ width:1, height:18,
          background:'var(--border)', margin:'0 4px' }} />
        <label className="toggle-wrap">
          <button className={`toggle ${showLabels?'on':''}`}
            onClick={() => setShowLabels(x => !x)} />
          <span>Popups on Click</span>
        </label>
        <span style={{ marginLeft:'auto',
          fontFamily:'var(--font-mono)', fontSize:10,
          color:'var(--text-muted)' }}>
          {loading ? 'Loading…'
            : `${mapPoints.length.toLocaleString()} points`}
        </span>
      </div>

      <div className="page-body">
        <div className="grid-asymm mb-4">

          {/* Left — Map + Heatmap */}
          <div>
            {/* Map Card */}
            <div className="card fade-in"
              style={{ overflow:'visible', marginBottom:16 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">
                    Where Are Incidents Happening in Colombo?
                  </div>
                  <div className="card-subtitle">
                    Each dot = one device reading ·
                    Red = critical emergency ·
                    Zoom and click to explore
                  </div>
                </div>
                <div style={{ display:'flex', gap:6,
                  alignItems:'center' }}>
                  <span className="card-tag tag-red">
                    {emgCount.toLocaleString()} emergency
                  </span>
                  <span className="card-tag tag-green">
                    {normCount.toLocaleString()} normal
                  </span>
                </div>
              </div>

              {/* Leaflet map container */}
              <div ref={mapRef} style={{
                height: 420,
                width: '100%',
                zIndex: 0,
                position: 'relative',
                background: '#e4eef2',  // placeholder while tiles load
              }} />

              {/* Loading overlay */}
              {!mapReady && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 420,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(238,244,247,0.7)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}>
                  Loading map…
                </div>
              )}

              {/* Legend */}
              <div style={{
                padding:'10px 16px',
                borderTop:'1px solid var(--border)',
                display:'flex', gap:14,
                alignItems:'center', flexWrap:'wrap',
                background:'#F8FCFD',
              }}>
                <span style={{ fontFamily:'var(--font-mono)',
                  fontSize:10, color:'var(--text-muted)',
                  marginRight:4 }}>LEGEND:</span>
                {[
                  { label:'Critical',       color:'#852E47', r:11 },
                  { label:'High Emergency', color:'#AA542B', r:9  },
                  { label:'Medium',         color:'#C2441C', r:7  },
                  { label:'Violent Motion', color:'#FFC64F', r:5  },
                  { label:'Normal',         color:'#519CAB', r:5  },
                ].map(({ label, color, r }) => (
                  <span key={label}
                    style={{ display:'flex',
                      alignItems:'center', gap:5 }}>
                    <span style={{
                      width: r*2, height: r*2,
                      borderRadius: '50%',
                      background: color,
                      display: 'inline-block',
                      opacity: 0.85, flexShrink: 0,
                    }} />
                    <span style={{ fontFamily:'var(--font-mono)',
                      fontSize:10,
                      color:'var(--text-muted)' }}>{label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Heatmap */}
            <div className="card fade-in">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    When Do Emergencies Happen Most?
                  </div>
                  <div className="card-subtitle">
                    Day of week × hour · darker = more emergencies ·
                    hover for exact count
                  </div>
                </div>
                <span className="card-tag tag-amber">
                  RISK HEATMAP
                </span>
              </div>
              <div className="card-body" style={{ overflowX:'auto' }}>
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th style={{ width:36 }}></th>
                      {HEATMAP_HOURS.map(h => (
                        <th key={h}>{h}:00</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HEATMAP_DAYS.map(day => (
                      <tr key={day}>
                        <th style={{ textAlign:'left',
                          paddingRight:8, fontSize:10,
                          color:'var(--text-muted)',
                          fontWeight:500 }}>{day}</th>
                        {HEATMAP_HOURS.map(hr => {
                          const cell = heatMatrix.find(
                            m => m.day===day && m.hour===hr);
                          const { bg, text } =
                            getHeatColor(cell?.score || 0);
                          const isHl =
                            heatHighlight?.day === day
                            && heatHighlight?.hour === hr;
                          return (
                            <td key={hr}>
                              <div className="heatmap-cell"
                                style={{
                                  background: bg, color: text,
                                  outline: isHl
                                    ? '2px solid var(--accent-midnight)'
                                    : 'none',
                                  cursor: 'default',
                                }}
                                title={`${day} ${hr}:00 — ${cell?.count||0} emergencies`}
                                onMouseEnter={() =>
                                  setHeatHighlight({ day, hour:hr })}
                                onMouseLeave={() =>
                                  setHeatHighlight(null)}>
                                {cell?.score > 55 ? cell.score : ''}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Heatmap legend */}
                <div style={{ display:'flex', gap:10, marginTop:10,
                  alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'var(--font-mono)',
                    fontSize:10,
                    color:'var(--text-muted)' }}>RISK:</span>
                  {[
                    { label:'Low',
                      bg:'rgba(81,156,171,0.15)' },
                    { label:'Moderate',
                      bg:'rgba(255,198,79,0.55)' },
                    { label:'High',
                      bg:'rgba(170,84,43,0.68)' },
                    { label:'Critical',
                      bg:'rgba(133,46,71,0.82)' },
                  ].map(({ label, bg }) => (
                    <span key={label}
                      style={{ display:'flex',
                        alignItems:'center', gap:4 }}>
                      <span style={{ width:12, height:12,
                        background:bg, borderRadius:2,
                        display:'inline-block' }} />
                      <span style={{ fontFamily:'var(--font-mono)',
                        fontSize:10,
                        color:'var(--text-muted)' }}>{label}</span>
                    </span>
                  ))}
                  {heatHighlight && (() => {
                    const cell = heatMatrix.find(
                      m => m.day === heatHighlight.day
                        && m.hour === heatHighlight.hour);
                    return (
                      <span style={{ marginLeft:'auto',
                        fontFamily:'var(--font-mono)', fontSize:11,
                        color:'var(--accent-midnight)',
                        fontWeight:600 }}>
                        {heatHighlight.day} {heatHighlight.hour}:00
                        — {cell?.count||0} emergencies
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Right — drill-down + zone charts */}
          <div style={{ display:'flex', flexDirection:'column',
            gap:14 }}>

            {/* Drill-down */}
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">Location Details</div>
                <div className="card-subtitle">
                  Click any dot on the map
                </div>
              </div>
              <div className="card-body">
                {drillInfo ? (
                  <div>
                    <div style={{ fontFamily:'var(--font-display)',
                      fontSize:15, fontWeight:700,
                      color:'var(--accent-midnight)',
                      marginBottom:12 }}>
                      📍 {drillInfo.zone}
                    </div>
                    <div style={{ display:'grid',
                      gridTemplateColumns:'1fr 1fr',
                      gap:8, marginBottom:12 }}>
                      {[
                        { label:'User Type',
                          value: drillInfo.user },
                        { label:'Motion',
                          value: drillInfo.motion },
                        { label:'Time',
                          value: drillInfo.night
                            ? '🌙 Night' : '☀️ Day' },
                        { label:'Device',
                          value: drillInfo.device },
                        { label:'Latitude',
                          value: drillInfo.lat },
                        { label:'Longitude',
                          value: drillInfo.lng },
                      ].map(({ label, value }) => (
                        <div key={label} style={{
                          background:'var(--bg-hover)',
                          borderRadius:6, padding:'6px 9px',
                        }}>
                          <div style={{
                            fontFamily:'var(--font-mono)',
                            fontSize:9, color:'var(--text-muted)',
                            textTransform:'uppercase',
                            letterSpacing:'0.06em',
                          }}>{label}</div>
                          <div style={{ fontSize:12, fontWeight:600,
                            color:'var(--text-primary)',
                            marginTop:2 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {drillInfo.isEmg ? (
                      <div style={{ padding:'8px 12px',
                        borderRadius:8,
                        background:'rgba(133,46,71,0.06)',
                        border:'1px solid rgba(133,46,71,0.18)' }}>
                        <div style={{
                          fontFamily:'var(--font-mono)',
                          fontSize:10, color:'var(--text-muted)',
                          marginBottom:3 }}>SEVERITY</div>
                        <div style={{
                          fontFamily:'var(--font-display)',
                          fontSize:18, fontWeight:700,
                          color:'#852E47' }}>
                          ⚠ {drillInfo.severity} Emergency
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding:'8px 12px',
                        borderRadius:8,
                        background:'rgba(131,153,88,0.08)',
                        border:'1px solid rgba(131,153,88,0.2)' }}>
                        <div style={{
                          fontFamily:'var(--font-display)',
                          fontSize:14, fontWeight:600,
                          color:'#4a6830' }}>
                          ✓ Normal Activity
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color:'var(--text-muted)',
                    fontSize:12, fontFamily:'var(--font-mono)',
                    textAlign:'center', padding:'28px 0',
                    lineHeight:1.8 }}>
                    Click any marker<br/>on the map above<br/>
                    to see details here
                  </div>
                )}
              </div>
            </div>

            {/* Zone bar chart */}
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">
                  Emergencies by Zone
                </div>
                <div className="card-subtitle">
                  Which Colombo areas need the most attention
                </div>
              </div>
              <div className="card-body" style={{ padding:'12px 8px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={zoneBarData} layout="vertical"
                    margin={{ top:0, right:20, left:10, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3"
                      stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize:9 }} />
                    <YAxis dataKey="zone" type="category"
                      tick={{ fontSize:10 }} width={80} />
                    <Tooltip {...TT} />
                    <Bar dataKey="emergencies" name="Emergencies"
                      radius={[0,3,3,0]}>
                      {zoneBarData.map((_, i) => (
                        <Cell key={i}
                          fill={ZONE_COLORS[i%ZONE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone risk % */}
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">Top Risk Zones</div>
                <div className="card-subtitle">
                  Emergency rate as % of all records per zone
                </div>
              </div>
              <div className="card-body">
                {[...zoneData]
                  .sort((a, b) => b.emergencies - a.emergencies)
                  .slice(0, 5)
                  .map((z, i) => {
                    const rate = z.total
                      ? ((z.emergencies / z.total) * 100).toFixed(1)
                      : 0;
                    return (
                      <div key={z.Zone} className="progress-row">
                        <span className="progress-name"
                          title={z.Zone}>{z.Zone}</span>
                        <div className="progress-track">
                          <div className="progress-fill" style={{
                            width: `${rate}%`,
                            background:
                              ZONE_COLORS[i % ZONE_COLORS.length],
                          }} />
                        </div>
                        <span className="progress-val">
                          {rate}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}