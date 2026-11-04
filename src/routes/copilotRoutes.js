const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const tenantGuard = require('../middlewares/tenantGuard');
const { 
  handleCopilotChat,
  getConversationHistory,
  getCopilotSuggestions 
} = require('../controllers/copilotController');

// Main Copilot chat assistant (accessible to all authenticated users with tenant isolation)
router.post('/chat', protect, tenantGuard, handleCopilotChat);
router.get('/history/:conversationId', protect, tenantGuard, getConversationHistory);
router.get('/suggestions', protect, tenantGuard, getCopilotSuggestions);

module.exports = router;
