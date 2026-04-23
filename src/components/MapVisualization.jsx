import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DATA from '../data/dataset.json';

const L = window.L;
const HEATMAP_DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HEATMAP_HOURS = ['00','03','06','09','12','15','18','21'];

const CRIME_COLORS = { assault:'#852E47', fraud:'#519CAB', burglary:'#AA542B', vandalism:'#FFC64F', theft:'#839958' };

function getHeatColor(score) {
  if (score > 75) return { bg:'rgba(133,46,71,0.78)',  text:'#fff' };
  if (score > 50) return { bg:'rgba(170,84,43,0.65)',  text:'#fff' };
  if (score > 25) return { bg:'rgba(255,198,79,0.55)', text:'#105666' };
  return           { bg:'rgba(81,156,171,0.18)',        text:'#4a7080' };
}

function buildHeatmatrix() {
  const dow = DATA.sc_dow, hourly = DATA.sc_hourly;
  const maxH = Math.max(...hourly.map(h=>h.count));
  const maxD = Math.max(...dow.map(d=>d.count));
  const matrix = [];
  HEATMAP_DAYS.forEach(day => {
    const shortMap = { Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday' };
    const dayRow = dow.find(d => d.DAYOFWEEK === shortMap[day]) || { count:1000 };
    HEATMAP_HOURS.forEach(hr => {
      const hourData = hourly.find(h => h.HOUR === parseInt(hr)) || { count:100 };
      matrix.push({ day, hour:hr, score: Math.round((dayRow.count/maxD)*(hourData.count/maxH)*100) });
    });
  });
  return matrix;
}

export default function MapVisualization() {
  const mapRef        = useRef(null);
  const mapInstance   = useRef(null);
  const layersRef     = useRef({});

  const [activeLayer,    setActiveLayer]    = useState('crime');
  const [drillInfo,      setDrillInfo]      = useState(null);
  const [mapStyle,       setMapStyle]       = useState('dark');
  const [minIncidents,   setMinIncidents]   = useState(1);
  const [showLabels,     setShowLabels]     = useState(true);
  const [heatHighlight,  setHeatHighlight]  = useState(null);

  const heatMatrix = useMemo(() => buildHeatmatrix(), []);
  const cityData   = DATA.sc_cities.filter(c=>c.CITY).slice(0,8).map(c=>({ city:c.CITY, count:c.count }));

  const TILE_URLS = {
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    color: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  const tileRef = useRef(null);

  useEffect(() => {
    if (!L || mapInstance.current) return;
    const map = L.map(mapRef.current, { center:[0,20], zoom:2, zoomControl:true });
    tileRef.current = L.tileLayer(TILE_URLS[mapStyle], { attribution:'© OpenStreetMap © CARTO', maxZoom:18 }).addTo(map);
    mapInstance.current = map;

    const crimeLayer = L.layerGroup();
    DATA.map_crime
      .filter(pt => pt.Latitude && pt.Longitude)
      .forEach(pt => {
        L.circleMarker([pt.Latitude, pt.Longitude], {
          radius: Math.min(20, Math.max(6, Math.log(pt.count+1)*3)),
          fillColor:'#852E47', color:'#852E47', fillOpacity:0.55, weight:1,
        })
        .bindPopup(`<div style="font-family:monospace;font-size:12px;padding:6px 10px;border-radius:6px"><b>${pt['Location Name']}</b><br/>Incidents: ${pt.count}</div>`)
        .on('click', () => setDrillInfo({ type:'crime', name:pt['Location Name'], count:pt.count }))
        .addTo(crimeLayer);
      });

    const safecityLayer = L.layerGroup();
    DATA.map_safecity.forEach(pt => {
      if (!pt.LATITUDE || !pt.LONGITUDE) return;
      L.circleMarker([pt.LATITUDE, pt.LONGITUDE], {
        radius:5, fillColor:'#519CAB', color:'#519CAB', fillOpacity:0.5, weight:1,
      })
      .bindPopup(`<div style="font-family:monospace;font-size:12px;padding:6px 10px;border-radius:6px"><b>${pt.CITY||'Unknown'}</b><br/>${pt.COUNTRY}<br/>${(pt.CATEGORY||'').split(',')[0]}</div>`)
      .on('click', () => setDrillInfo({ type:'safecity', name:pt.CITY, country:pt.COUNTRY, cat:pt.CATEGORY }))
      .addTo(safecityLayer);
    });

    layersRef.current = { crime:crimeLayer, safecity:safecityLayer };
    crimeLayer.addTo(map);
  }, []);

  // swap tile layer on style change
  useEffect(() => {
    if (!mapInstance.current || !tileRef.current) return;
    mapInstance.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(TILE_URLS[mapStyle], { attribution:'© OpenStreetMap © CARTO', maxZoom:18 }).addTo(mapInstance.current);
  }, [mapStyle]);

  // swap data layer
  useEffect(() => {
    if (!mapInstance.current) return;
    Object.entries(layersRef.current).forEach(([key, layer]) => {
      if (key === activeLayer) layer.addTo(mapInstance.current);
      else mapInstance.current.removeLayer(layer);
    });
    if (activeLayer==='crime')     mapInstance.current.setView([0,36], 3);
    else                           mapInstance.current.setView([20,78], 4);
  }, [activeLayer]);

  const tooltipStyle = { background:'#fff', border:'1px solid var(--border-bright)', borderRadius:8, boxShadow:'var(--shadow-hover)', fontSize:12 };

  return (
    <div>
      <div className="filter-bar">
        <span className="filter-label">Data Layer</span>
        <button className={`filter-btn ${activeLayer==='crime'?'active':''}`}     onClick={()=>setActiveLayer('crime')}>🔴 Crime Incidents</button>
        <button className={`filter-btn ${activeLayer==='safecity'?'active':''}`}  onClick={()=>setActiveLayer('safecity')}>🔵 Harassment Reports</button>
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Map Style</span>
        {[['dark','Dark'],['light','Light'],['color','Street']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${mapStyle===v?'active':''}`} onClick={()=>setMapStyle(v)}>{l}</button>
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />
        <span className="filter-label">Min Incidents</span>
        <input type="range" min={1} max={50} value={minIncidents}
          onChange={e=>setMinIncidents(Number(e.target.value))}
          style={{ width:80 }} />
        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', minWidth:20 }}>{minIncidents}+</span>
        <label className="toggle-wrap" style={{ marginLeft:8 }}>
          <button className={`toggle ${showLabels?'on':''}`} onClick={()=>setShowLabels(x=>!x)} />
          <span>Popup Labels</span>
        </label>
      </div>

      <div className="page-body">
        <div className="grid-asymm mb-4">
          <div>
            {/* Map */}
            <div className="card fade-in" style={{ overflow:'hidden', marginBottom:16 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{activeLayer==='crime' ? 'Where Do Crimes Happen?' : 'Where Are Harassment Reports Coming From?'}</div>
                  <div className="card-subtitle">{activeLayer==='crime' ? 'Each bubble = a location. Bigger bubble = more incidents.' : 'Each dot = one reported harassment incident.'}</div>
                </div>
                <span className={`card-tag ${activeLayer==='crime'?'tag-red':'tag-cyan'}`}>
                  {activeLayer==='crime' ? `${DATA.map_crime.length} locations` : `${DATA.map_safecity.length} reports`}
                </span>
              </div>
              <div ref={mapRef} style={{ height:370, zIndex:0 }} />
            </div>

            {/* Day × Hour heatmap */}
            <div className="card fade-in">
              <div className="card-header">
                <div>
                  <div className="card-title">When Are Incidents Most Likely to Happen?</div>
                  <div className="card-subtitle">Darker = higher risk. Hover a cell for the exact score.</div>
                </div>
                <span className="card-tag tag-amber">RISK HEATMAP</span>
              </div>
              <div className="card-body" style={{ overflowX:'auto' }}>
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th></th>
                      {HEATMAP_HOURS.map(h => <th key={h}>{h}:00</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {HEATMAP_DAYS.map(day => (
                      <tr key={day}>
                        <th style={{ textAlign:'left', paddingRight:8, fontSize:10, color:'var(--text-muted)' }}>{day}</th>
                        {HEATMAP_HOURS.map(hr => {
                          const cell = heatMatrix.find(m => m.day===day && m.hour===hr);
                          const { bg, text } = getHeatColor(cell?.score||0);
                          const isHl = heatHighlight && heatHighlight.day===day && heatHighlight.hour===hr;
                          return (
                            <td key={hr}>
                              <div className="heatmap-cell"
                                style={{ background:bg, color:text, outline: isHl?'2px solid var(--accent-midnight)':'' }}
                                title={`${day} ${hr}:00 — Risk score: ${cell?.score}`}
                                onMouseEnter={() => setHeatHighlight({ day, hour:hr })}
                                onMouseLeave={() => setHeatHighlight(null)}>
                                {cell?.score > 55 ? cell.score : ''}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display:'flex', gap:10, marginTop:10, alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>RISK:</span>
                  {[
                    { label:'Low',      bg:'rgba(81,156,171,0.18)' },
                    { label:'Moderate', bg:'rgba(255,198,79,0.55)' },
                    { label:'High',     bg:'rgba(170,84,43,0.65)' },
                    { label:'Critical', bg:'rgba(133,46,71,0.78)' },
                  ].map(({ label, bg }) => (
                    <span key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ width:12, height:12, background:bg, borderRadius:2, display:'inline-block' }} />
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>{label}</span>
                    </span>
                  ))}
                  {heatHighlight && (
                    <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent-midnight)', fontWeight:600 }}>
                      {heatHighlight.day} {heatHighlight.hour}:00 — Score: {heatMatrix.find(m=>m.day===heatHighlight.day&&m.hour===heatHighlight.hour)?.score}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Drill-down */}
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">Location Details</div>
                <div className="card-subtitle">Click a dot on the map</div>
              </div>
              <div className="card-body">
                {drillInfo ? (
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--accent-midnight)', marginBottom:10 }}>
                      📍 {drillInfo.name || 'Unknown Location'}
                    </div>
                    {drillInfo.type === 'crime' ? (
                      <>
                        <div style={{ marginBottom:10 }}><span className="card-tag tag-red">CRIME HOTSPOT</span></div>
                        <div className="progress-row">
                          <span className="progress-name">Incident Count</span>
                          <div className="progress-track"><div className="progress-fill" style={{ width:`${Math.min(100, drillInfo.count/50*100)}%`, background:'#852E47' }} /></div>
                          <span className="progress-val">{drillInfo.count}</span>
                        </div>
                        <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:8 }}>This location has recorded {drillInfo.count} crime incidents in the dataset period.</p>
                      </>
                    ) : (
                      <>
                        <div style={{ marginBottom:10 }}><span className="card-tag tag-cyan">HARASSMENT REPORT</span></div>
                        <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:5 }}><strong>Country:</strong> {drillInfo.country}</p>
                        <p style={{ fontSize:12, color:'var(--text-secondary)' }}><strong>Type:</strong> {(drillInfo.cat||'').split(',')[0]}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ color:'var(--text-muted)', fontSize:12, fontFamily:'var(--font-mono)', textAlign:'center', padding:'22px 0', lineHeight:1.8 }}>
                    Click any marker<br/>on the map above<br/>to see details here
                  </div>
                )}
              </div>
            </div>

            {/* Harassment types */}
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">Most Common Harassment Types</div>
                <div className="card-subtitle">From SafeCity reports</div>
              </div>
              <div className="card-body">
                {DATA.sc_categories.slice(0,7).map((cat,i) => {
                  const max = DATA.sc_categories[0].count;
                  const colors = ['#852E47','#AA542B','#C2441C','#519CAB','#839958','#FFC64F','#D3968C'];
                  return (
                    <div key={cat.name} className="progress-row">
                      <span className="progress-name" title={cat.name}>{cat.name.replace(' /Groping','').replace('Catcalls/','').replace(' Expressions/Staring','')}</span>
                      <div className="progress-track"><div className="progress-fill" style={{ width:`${(cat.count/max)*100}%`, background:colors[i] }} /></div>
                      <span className="progress-val">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top cities */}
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">Cities With the Most Reports</div>
                <div className="card-subtitle">SafeCity incident concentration</div>
              </div>
              <div className="card-body" style={{ padding:'8px' }}>
                <ResponsiveContainer width="100%" height={165}>
                  <BarChart data={cityData} layout="vertical" margin={{ top:0, right:18, left:8, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize:9 }} />
                    <YAxis dataKey="city" type="category" tick={{ fontSize:10 }} width={72} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Reports" fill="#519CAB" radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}