import React, { useState, useRef, useEffect } from 'react';
import DATA from '../data/dataset.json';

const SYSTEM_PROMPT = `You are SafeGuard AI, an intelligent analytics assistant for the ALERT WAY GUARDIAN dashboard — an IoT-based women and children safety system. You have deep knowledge of the following datasets:

1. CRIME REPORTS DATASET (fake_crime_reports.csv):
- 20,177 incidents from April 2022 to April 2023
- Categories: assault (4,065), fraud (4,057), burglary (4,047), vandalism (4,036), theft (3,972)
- Demographics: poor (6,846), middle class (6,663), rich (6,668)
- Weather: cloudy (5,153), sunny (5,101), rainy (5,020), windy (4,903)
- Victim gender: female (10,113 = 50.1%), male (10,064 = 49.9%)
- Locations: primarily Kasarani, Nairobi, Kenya

2. SAFECITY DATASET (safecity_reports_07082019.csv):
- 11,203 women's harassment reports
- Top categories: Touching/Groping (1,692), Commenting (1,281), Others (620), Catcalls/Whistles (565), Ogling (511)
- Countries: India (8,451), Nepal (1,350), Kenya (1,328)
- Peak days: Friday (2,340), Saturday (1,828)
- Peak hours: evening hours (17:00–21:00) and morning commute (8:00–10:00)
- Top cities: Mumbai, Delhi, Patna, Kathmandu, Nairobi

Answer questions concisely (2-4 sentences). Be data-specific, cite numbers when relevant. Suggest which dashboard section to look at when appropriate.`;

const QUICK_PROMPTS = [
  'Which crime type is most common?',
  'When do incidents peak?',
  'What are the top harassment categories?',
  'Which demographics are most vulnerable?',
  'What does the heatmap show?',
  'How does weather affect crime?',
];

export default function Chatbot() {
  const [messages, setMessages] = useState([{
    role: 'bot',
    content: `👋 I'm **SafeGuard AI**, your analytics assistant for the ALERT WAY GUARDIAN dashboard.\n\nI can answer questions about crime trends, harassment patterns, risk factors, and guide you through the dashboard. Try one of the quick prompts below, or ask me anything about the data.`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    const history = messages
      .filter((m, i) => !(m.role === 'bot' && i === 0))
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [...history, { role: 'user', content: userText }],
        }),
      });
      const data = await response.json();
      const reply = data.content?.find(b => b.type === 'text')?.text || 'Sorry, I could not process that.';
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: `⚠️ API unreachable. From the data: **${DATA.kpis.total_incidents.toLocaleString()} total incidents**, ${DATA.kpis.female_pct}% female victims. Top SafeCity category: Touching/Groping (1,692 reports).`
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  function renderContent(content) {
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h2>SafeGuard AI Agent</h2>
          <p>LLM-powered analytics assistant — ask questions about the dashboard data</p>
        </div>
        <div className="page-header-right">
          <span className="header-chip live"><span className="status-dot" />CONNECTED</span>
          <span className="header-chip">Claude Sonnet</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 24, gap: 16 }}>
        <div className="card" style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'bot' && <div className="bot-label">⚡ SafeGuard AI</div>}
                <div dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
              </div>
            ))}
            {loading && (
              <div className="chat-bubble bot">
                <div className="bot-label">⚡ SafeGuard AI</div>
                <div className="chat-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="quick-prompts">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>QUICK:</span>
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="quick-prompt" onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>

          <div className="chat-input-row">
            <input className="chat-input" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} placeholder="Ask about crime trends, risk factors, dashboard features…" disabled={loading} />
            <button className="chat-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>➤</button>
          </div>
        </div>

        {/* Context Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div className="card fade-in">
            <div className="card-header"><div className="card-title">Dataset Summary</div></div>
            <div className="card-body">
              {[
                { label: 'Crime Reports', value: DATA.kpis.total_incidents.toLocaleString(), tag: 'tag-red' },
                { label: 'SafeCity Reports', value: DATA.kpis.safecity_total.toLocaleString(), tag: 'tag-purple' },
                { label: 'Female Victims', value: `${DATA.kpis.female_pct}%`, tag: 'tag-amber' },
                { label: 'Top Category', value: 'Assault', tag: 'tag-red' },
                { label: 'Top Harassment', value: 'Touching/Groping', tag: 'tag-purple' },
              ].map(({ label, value, tag }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  <span className={`card-tag ${tag}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header"><div className="card-title">What I Can Help With</div></div>
            <div className="card-body">
              {[
                { icon: '📊', text: 'Trend analysis & patterns' },
                { icon: '⚠️', text: 'Risk factor identification' },
                { icon: '🗺️', text: 'Geographic insights' },
                { icon: '🔍', text: 'Anomaly explanations' },
                { icon: '💡', text: 'Decision support queries' },
                { icon: '🧭', text: 'Dashboard navigation' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header"><div className="card-title">Dashboard Sections</div></div>
            <div className="card-body">
              {[
                { icon: '📈', name: 'Analytics & Insights', member: 'Tanuri' },
                { icon: '🔄', name: 'Workflow & Decision', member: 'Sudugodage' },
                { icon: '📡', name: 'Real-Time Monitor', member: 'Aarabhi' },
                { icon: '🗺️', name: 'Map & Heatmap', member: 'Danishiya' },
              ].map(({ icon, name, member }) => (
                <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{member}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}