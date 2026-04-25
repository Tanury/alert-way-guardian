const D = require('../data/dataset.json');

const getKpis         = (_, res) => res.json(D.kpis);
const getMonthly      = (_, res) => res.json(D.monthly_trend);
const getMotionMonthly= (_, res) => res.json(D.motion_monthly);
const getDow          = (_, res) => res.json(D.dow_pattern);
const getHourly       = (_, res) => res.json(D.hourly_pattern);
const getHeatmap      = (_, res) => res.json(D.heatmap);
const getNightDay     = (_, res) => res.json(D.night_day);
const getZones        = (_, res) => res.json(D.zones);
const getUserType     = (_, res) => res.json(D.user_type);
const getMotionDist   = (_, res) => res.json(D.motion_dist);
const getDeviceState  = (_, res) => res.json(D.device_state);
const getDevices      = (_, res) => res.json(D.device_summary);
const getSensorStats  = (_, res) => res.json(D.sensor_stats);

module.exports = {
  getKpis, getMonthly, getMotionMonthly, getDow, getHourly,
  getHeatmap, getNightDay, getZones, getUserType, getMotionDist,
  getDeviceState, getDevices, getSensorStats,
};