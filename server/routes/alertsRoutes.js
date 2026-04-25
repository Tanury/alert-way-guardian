const express = require('express');
const router  = express.Router();
const c       = require('../controllers/alertsController');

router.get('/',               c.getAlerts);
router.get('/summary',        c.getSummary);
router.get('/response-stats', c.getResponseStats);
router.get('/abnormal',       c.getAbnormal);

module.exports = router;