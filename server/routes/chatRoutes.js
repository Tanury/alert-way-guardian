const express = require('express');
const router  = express.Router();
const { chat } = require('../controllers/chatController');

// POST /api/chat
// Body: { messages: [ { role: 'user' | 'assistant', content: string }, ... ] }
// Returns: { reply: string }
router.post('/', chat);

module.exports = router;