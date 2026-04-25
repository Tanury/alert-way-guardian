const express = require('express');
const router  = express.Router();
const c       = require('../controllers/sensorController');

router.get('/reading',       c.getSensorReading);
router.get('/devices',       c.getDeviceList);
router.get('/emergency-log', c.getEmergencyLog);
router.get('/map-points',    c.getMapPoints);
router.get('/hourly',        c.getHourly);
router.get('/dow',           c.getDow);

module.exports = router;