const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatController');
const { isAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(isAuth);
router.post('/conversations', ctrl.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', ctrl.getMessages);
router.post('/conversations/:conversationId/messages', ctrl.sendMessage);
router.post('/conversations/:conversationId/messages/audio', upload.single('audio'), ctrl.sendAudioMessage);
router.patch('/conversations/:conversationId/read', ctrl.markAsRead);

module.exports = router;
