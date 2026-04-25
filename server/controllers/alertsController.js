const D = require('../data/dataset.json');

// GET /api/alerts?severity=ALL&status=ALL&sort=date
const getAlerts = (req, res) => {
  const { severity = 'ALL', status = 'ALL', sort = 'date' } = req.query;
  let result = [...D.emg_log];

  if (severity !== 'ALL') result = result.filter(a => a.Severity_Level === severity);
  if (status   !== 'ALL') result = result.filter(a => a.Dispatch_Status === status);

  if (sort === 'severity') {
    const order = { Critical:0, High:1, Medium:2 };
    result.sort((a,b) => (order[a.Severity_Level]||9) - (order[b.Severity_Level]||9));
  }

  res.json(result);
};

const getSummary      = (_, res) => res.json({
  total:       D.kpis.total_emergencies,
  critical:    D.severity_counts['Critical'] || 0,
  high:        D.severity_counts['High']     || 0,
  medium:      D.severity_counts['Medium']   || 0,
  avgResponse: D.kpis.avg_response_sec,
  dispatch:    D.dispatch,
});

const getResponseStats  = (_, res) => res.json(D.resp_severity);
const getAbnormal       = (_, res) => res.json(D.abnormal_events);

module.exports = { getAlerts, getSummary, getResponseStats, getAbnormal };