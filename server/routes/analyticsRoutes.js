const express = require('express');
const router  = express.Router();
const c       = require('../controllers/analyticsController');

router.get('/kpis',           c.getKpis);
router.get('/monthly',        c.getMonthly);
router.get('/motion-monthly', c.getMotionMonthly);
router.get('/dow',            c.getDow);
router.get('/hourly',         c.getHourly);
router.get('/heatmap',        c.getHeatmap);
router.get('/night-day',      c.getNightDay);
router.get('/zones',          c.getZones);
router.get('/user-type',      c.getUserType);
router.get('/motion',         c.getMotionDist);
router.get('/device-state',   c.getDeviceState);
router.get('/devices',        c.getDevices);
router.get('/sensor-stats',   c.getSensorStats);

module.exports = router;