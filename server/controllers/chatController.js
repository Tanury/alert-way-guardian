const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const SYSTEM_PROMPT = `You are SafeGuard AI, the intelligent analytics assistant for the ALERT WAY GUARDIAN dashboard — a real IoT-based personal safety system deployed across Colombo, Sri Lanka.

Your role is to help users understand the data shown on the dashboard, explain trends, identify patterns, and support decision-making for emergency response and safety planning.

=== DATASET OVERVIEW ===
- 15,000 sensor readings from 30 AWG (Alert Way Guardian) IoT devices
- Time period: January 1, 2025 to April 24, 2026 (16 months)
- Location: 10 zones across Colombo, Sri Lanka

=== ZONES COVERED ===
Maradana, Wellawatte, Nugegoda, Kelaniya, Mount Lavinia, Kollupitiya, Dehiwala, Gampaha, Moratuwa, Bambalapitiya, Colombo Fort

=== PEOPLE PROTECTED ===
- Women: 6,505 individuals
- Children: 5,495 individuals
- Elderly Women: 3,000 individuals

=== EMERGENCY STATISTICS ===
- Total emergency events: 3,605 (24% of all records)
- Critical severity: 1,504 | High: 1,684 | Medium: 417
- Night emergencies: 1,522 (42%) | Day emergencies: 2,083 (58%)
- Violent motion events: 1,504

=== ZONE HOTSPOTS ===
1. Maradana — 713 emergencies
2. Kollupitiya — 601
3. Wellawatte — 525
4. Gampaha — 418
5. Colombo Fort — 369
6. Nugegoda — 357
7. Moratuwa — 289
8. Bambalapitiya — 154
9. Dehiwala — 100
10. Mount Lavinia — 79

=== RESPONSE TIME ===
- Overall average: 285 seconds
- Jan 2025: ~322s → Apr 2026: ~260s (consistent improvement)

=== SEASONAL PATTERNS ===
- Peak months: May–August 2025
- Peak hours: 21:00 and 00:00–04:00
- Night hours account for 42% of emergencies

=== SENSORS ===
- Accelerometer: mean 9.91 m/s² — detects falls, violence
- Gyroscope: mean 26 dps — detects struggle, rotation
- Ambient light: mean 389 lux — low = dark/unsafe
- Sound: mean 58.6 dB, max 110 dB — screaming, loud events
- GPS: Colombo area (lat 6.82–7.09, long 79.85–80.00)
- Battery: mean 81.4%

=== MOTION TYPES ===
Normal (9,656), Abnormal (2,422), Violent (1,504), Sudden (1,418)

=== DEVICE STATES ===
Active (9,644), Emergency (3,605), Standby (1,751)

=== DASHBOARD SECTIONS ===
- Crime Statistics & Trends: monthly trends, zones, motion, night/day, users
- Emergency Response Tracker: incident queue, timelines, dispatch, response times
- Live Safety Feed: real-time sensors, risk gauges, zone pulse, hourly/weekly patterns
- Danger Zone Map: GPS map of Colombo, day x hour heatmap, zone rankings

Answer in 2–5 sentences. Be specific with numbers. Suggest which dashboard section to check. Speak professionally but clearly — the audience includes university students and evaluators.`;

const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required and cannot be empty' });
    }

    // Gemini uses a different conversation format
    // We need to separate the last user message from the history
    const history = messages.slice(0, -1).map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 600,
        temperature:     0.7,
        topP:            0.9,
      },
    });

    const result = await chat.sendMessage(lastMessage.content);
    const reply  = result.response.text();

    if (!reply) {
      return res.status(500).json({ error: 'Gemini returned an empty response' });
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chat controller error:', err.message);

    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key')) {
      return res.status(401).json({
        error: 'Invalid Google API key. Check GOOGLE_API_KEY in server/.env',
      });
    }

    if (err.message?.includes('QUOTA') || err.message?.includes('quota')) {
      return res.status(429).json({
        error: 'Google AI quota exceeded. Try again in a minute.',
      });
    }

    res.status(500).json({ error: err.message });
  }
};

module.exports = { chat };