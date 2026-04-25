const D = require('../data/dataset.json');
const deviceState = {};

function generateReading(deviceId) {
  const s    = D.sensor_stats;
  const prev = deviceState[deviceId] || {
    accel: s.accel.mean, gyro: s.gyro.mean,
    sound: s.sound.mean, lux:  s.lux.mean,
    battery: s.battery.mean,
    zone: 68, motion: 45, time: 72, overall: 62,
  };
  const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));

  const accel   = clamp(prev.accel   + (Math.random()-0.5)*0.4,  s.accel.min,   s.accel.max);
  const gyro    = clamp(prev.gyro    + (Math.random()-0.5)*3,    s.gyro.min,    40);
  const sound   = clamp(prev.sound   + (Math.random()-0.5)*4,    s.sound.min,   s.sound.max);
  const lux     = clamp(prev.lux     + (Math.random()-0.5)*20,   s.lux.min,     s.lux.max);
  const battery = clamp(prev.battery - 0.02,                      s.battery.min, s.battery.max);

  const zoneRisk    = clamp(prev.zone    + (Math.random()-0.48)*4, 0, 100);
  const motionRisk  = clamp(prev.motion  + (Math.random()-0.5)*6,  0, 100);
  const overallRisk = clamp(prev.overall + (Math.random()-0.48)*3, 0, 100);

  const reading = {
    deviceId,
    timestamp: new Date().toISOString(),
    sensors: {
      accel:   +accel.toFixed(2),
      gyro:    +gyro.toFixed(2),
      sound:   +sound.toFixed(1),
      lux:     +lux.toFixed(1),
      battery: +battery.toFixed(1),
    },
    riskScores: {
      zone:    Math.round(zoneRisk),
      motion:  Math.round(motionRisk),
      time:    72,
      overall: Math.round(overallRisk),
    },
  };

  deviceState[deviceId] = { ...reading.sensors, ...reading.riskScores };
  return reading;
}

const getSensorReading = (req, res) => {
  const { device = 'AWG-0007' } = req.query;
  res.json(generateReading(device));
};

const getDeviceList = (_, res) => res.json(
  D.device_summary.map(d => ({
    id:          d.Device_ID,
    zone:        d.zone,
    userType:    d.user_type,
    battery:     d.avg_battery,
    emergencies: d.emergencies,
  }))
);

const getEmergencyLog = (_, res) => res.json(
  D.emg_log.slice(0, 10).map(e => ({
    time:   `${String(e.Hour).padStart(2,'0')}:00`,
    event:  `${e.Motion_Type} detected — ${e.Device_ID} (${e.Zone})`,
    type:   e.Severity_Level === 'Critical' ? 'critical'
          : e.Severity_Level === 'High'     ? 'warning' : 'info',
    zone:   e.Zone,
    user:   e.User_Type,
    device: e.Device_ID,
    night:  e.Is_Night === 1,
  }))
);

const getMapPoints = (_, res) => res.json(D.map_points);
const getHourly    = (_, res) => res.json(D.hourly_pattern);
const getDow       = (_, res) => res.json(D.dow_pattern);

module.exports = { getSensorReading, getDeviceList, getEmergencyLog, getMapPoints, getHourly, getDow };