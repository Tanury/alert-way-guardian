import React, { useState, useRef, useEffect } from 'react';

const API = 'http://localhost:5001/api';

const QUICK_PROMPTS = [
  'Which zone has the most emergencies?',
  'What time of day is most dangerous?',
  'How has response time improved?',
  'What percentage of emergencies happen at night?',
  'Which user group is most at risk?',
  'What does a Critical severity mean?',
  'Which day of the week has most incidents?',
  'How many devices are in the system?',
];

function renderContent(text) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: `👋 I'm **SafeGuard AI**, your analytics assistant for the ALERT WAY GUARDIAN system.\n\nI can answer questions about the 15,000 sensor readings collected across 10 zones in Colombo from January 2025 to April 2026. Ask me about emergency patterns, danger zones, sensor behaviour, response times, or anything else you see on the dashboard.`,
    },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState('idle');
  const [apiOk,    setApiOk]    = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    setStatus('thinking');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    // Build history — skip the first bot greeting
    const history = messages
      .filter((_, i) => i > 0)
      .map(m => ({
        role:    m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));

    try {
      const response = await fetch(`${API}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...history,
            { role: 'user', content: userText },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server responded with ${response.status}`);
      }

      const data  = await response.json();
      const reply = data.reply || 'No response received.';

      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
      setStatus('idle');
      setApiOk(true);

    } catch (err) {
      console.error('Chat error:', err.message);

      let errMsg = `⚠️ ${err.message}`;

      if (err.message.includes('Failed to fetch')
        || err.message.includes('NetworkError')
        || err.message.includes('ECONNREFUSED')) {
        errMsg = `⚠️ Cannot reach the backend server. Make sure **npm run dev** is running.`;
      } else if (err.message.includes('API key')
        || err.message.includes('API_KEY')) {
        errMsg = `⚠️ Invalid Google API key. Check **GOOGLE_API_KEY** in server/.env and restart the server.`;
      } else if (err.message.includes('quota')
        || err.message.includes('QUOTA')) {
        errMsg = `⚠️ Google AI quota exceeded. Try again in a minute.`;
      }

      setMessages(prev => [...prev, { role: 'bot', content: errMsg }]);
      setStatus('error');
      setApiOk(false);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'bot',
      content: `👋 I'm **SafeGuard AI**, your analytics assistant for the ALERT WAY GUARDIAN system.\n\nI can answer questions about the 15,000 sensor readings collected across 10 zones in Colombo from January 2025 to April 2026. Ask me about emergency patterns, danger zones, sensor behaviour, response times, or anything else you see on the dashboard.`,
    }]);
    setStatus('idle');
  };

  // ── Status bar ────────────────────────────────────────────────
  const StatusBar = () => {
    const dot = apiOk === null
      ? { color: '#FFC64F', label: 'Checking connection…' }
      : apiOk
        ? { color: '#839958', label: 'Google Gemini connected · gemini-2.5-flash' }
        : { color: '#852E47', label: 'Cannot reach server — check npm run dev' };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 16px',
        background: '#F2F8FA',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dot.color, flexShrink: 0,
          animation: apiOk ? 'pulse-dot 2s infinite' : 'none',
        }} />
        <span>{dot.label}</span>
        <span style={{
          marginLeft: 'auto', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 10,
          textDecoration: 'underline',
        }}
          onClick={clearChat}>Clear chat</span>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Ask the AI Assistant</h2>
          <p>
            Powered by Google Gemini 1.5 Flash —
            responses generated via Google AI Studio
          </p>
        </div>
        <div className="page-header-right">
          <span className="header-chip" style={{
            borderColor: apiOk
              ? 'rgba(131,153,88,0.45)'
              : 'rgba(133,46,71,0.35)',
            color: apiOk
              ? 'var(--accent-moss)'
              : 'var(--alert-red)',
            background: apiOk
              ? 'rgba(131,153,88,0.08)'
              : 'rgba(133,46,71,0.06)',
          }}>
            {apiOk === null ? '⏳ Connecting'
              : apiOk ? '✓ Online' : '✗ Offline'}
          </span>
          <span className="header-chip live">
            <span className="status-dot" />Gemini AI
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        padding: 22, gap: 16,
      }}>

        {/* Chat panel */}
        <div className="card" style={{
          flex: 2, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minHeight: 0,
        }}>
          <StatusBar />

          {/* Messages */}
          <div className="chat-messages"
            style={{ flex: 1, overflowY: 'auto' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="bot-label">⚡ SafeGuard AI</div>
                )}
                <div dangerouslySetInnerHTML={{
                  __html: renderContent(msg.content),
                }} />
              </div>
            ))}

            {loading && (
              <div className="chat-bubble bot">
                <div className="bot-label">⚡ SafeGuard AI</div>
                <div className="chat-typing">
                  <span /><span /><span />
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--text-muted)', marginTop: 4,
                }}>
                  Thinking…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="quick-prompts">
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-muted)', alignSelf: 'center',
              marginRight: 4, flexShrink: 0,
            }}>Try:</span>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                className="quick-prompt"
                onClick={() => sendMessage(p)}
                disabled={loading}
              >{p}</button>
            ))}
          </div>

          {/* Input row */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about emergencies, zones, sensors, response times…"
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              title="Send (Enter)"
            >➤</button>
          </div>
        </div>

        {/* Right info panel */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          gap: 14, overflowY: 'auto',
        }}>

          {/* Dataset snapshot */}
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">Dataset at a Glance</div>
              <div className="card-subtitle">What the AI knows about</div>
            </div>
            <div className="card-body">
              {[
                { label:'Total Records',   value:'15,000',            tag:'tag-cyan'   },
                { label:'Time Span',       value:'Jan 2025–Apr 2026', tag:'tag-green'  },
                { label:'Devices',         value:'30 AWG devices',    tag:'tag-cyan'   },
                { label:'Zones',           value:'10 in Colombo',     tag:'tag-amber'  },
                { label:'Emergencies',     value:'3,605 events',      tag:'tag-red'    },
                { label:'Avg Response',    value:'285 seconds',       tag:'tag-amber'  },
                { label:'Women',           value:'6,505',             tag:'tag-purple' },
                { label:'Children',        value:'5,495',             tag:'tag-purple' },
                { label:'Elderly Women',   value:'3,000',             tag:'tag-purple' },
              ].map(({ label, value, tag }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 9,
                }}>
                  <span style={{ fontSize:12,
                    color:'var(--text-secondary)' }}>{label}</span>
                  <span className={`card-tag ${tag}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard sections */}
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">Dashboard Sections</div>
              <div className="card-subtitle">
                The AI can guide you to any of these
              </div>
            </div>
            <div className="card-body">
              {[
                { icon:'📊', name:'Crime Statistics',   desc:'Trends, zones, motion types' },
                { icon:'🚨', name:'Emergency Response', desc:'Incident queue, timelines' },
                { icon:'📡', name:'Live Safety Feed',   desc:'Real-time sensors, risk scores' },
                { icon:'🗺️', name:'Danger Zone Map',    desc:'GPS map, heatmap, hotspots' },
              ].map(({ icon, name, desc }) => (
                <div key={name} style={{
                  display: 'flex', gap: 10,
                  alignItems: 'flex-start', marginBottom: 12,
                }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>
                    {icon}
                  </span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600,
                      color:'var(--text-primary)' }}>{name}</div>
                    <div style={{ fontSize:11,
                      color:'var(--text-muted)',
                      fontFamily:'var(--font-mono)',
                      marginTop:1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">Tips for Better Answers</div>
            </div>
            <div className="card-body">
              {[
                'Be specific — ask about a particular zone or time period',
                'Ask for comparisons — e.g. "night vs day" or "critical vs high"',
                'Ask what a chart means if something looks unusual',
                'Ask for recommendations — e.g. "which zone needs the most resources?"',
              ].map((tip, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, marginBottom: 9,
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontFamily:'var(--font-mono)',
                    fontSize:10, color:'var(--accent-moonstone)',
                    flexShrink:0, marginTop:1 }}>→</span>
                  <span style={{ fontSize:12,
                    color:'var(--text-secondary)',
                    lineHeight:1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error card — shown when API is unreachable */}
          {apiOk === false && (
            <div className="card fade-in" style={{
              border: '1px solid rgba(133,46,71,0.25)',
              background: 'rgba(133,46,71,0.04)',
            }}>
              <div className="card-header"
                style={{ background:'rgba(133,46,71,0.04)' }}>
                <div className="card-title"
                  style={{ color:'var(--alert-red)' }}>
                  Cannot Reach Server
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontSize:12,
                  color:'var(--text-secondary)',
                  marginBottom:10, lineHeight:1.6 }}>
                  Make sure the backend is running and your
                  Google API key is set:
                </p>
                {[
                  '# In server/.env:',
                  'GOOGLE_API_KEY=AIzaSy...',
                  '# Then restart:',
                  'npm run dev',
                ].map((cmd, i) => (
                  <div key={i} style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    padding: '5px 10px', marginBottom: 5,
                    borderRadius: 5,
                    background: cmd.startsWith('#')
                      ? 'transparent' : 'var(--bg-hover)',
                    color: cmd.startsWith('#')
                      ? 'var(--text-muted)' : 'var(--accent-midnight)',
                    border: cmd.startsWith('#')
                      ? 'none' : '1px solid var(--border)',
                  }}>{cmd}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}