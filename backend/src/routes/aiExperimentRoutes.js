const express = require('express');
const router = express.Router();
const virtualResident = require('../ai-experiment/VirtualResident');
const { isAuth } = require('../middlewares/auth');
const userRepo = require('../repositories/userRepository');

/**
 * @route   POST /api/ai-experiment/start
 * @desc    Initialize a clinical session with O.V.R.
 */
router.post('/start', isAuth, async (req, res) => {
  try {
    const { caseId } = req.body;
    
    // Industrial Identity Extraction: Fetch the full participant record
    const user = await userRepo.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Statutory Identity not found.' });

    const userName = user.fullName || 'Valued Patient';
    const patientId = user._id;
    
    // Using a random case ID if not provided for sandbox purposes
    const cid = caseId || `OVR-${Date.now()}`;
    const greeting = await virtualResident.startSession(cid, userName, patientId);
    
    res.json({ success: true, caseId: cid, text: greeting });
  } catch (err) {
    console.error('❌ AI Handshake Failure:', err.message);
    res.status(500).json({ error: "Institutional Handshake Failure: Identity Synchronization Error." });
  }
});

/**
 * @route   POST /api/ai-experiment/interact
 * @desc    Process response and get next O.V.R. question/clerkship
 */
router.post('/interact', isAuth, async (req, res) => {
  try {
    const { caseId, text } = req.body;
    if (!caseId || !text) return res.status(400).json({ error: 'caseId and text required' });
    
    const response = await virtualResident.processResponse(caseId, text);
    
    // --- Safe Live Specialist Notification ---
    if (response && response.type === 'clerkship_final') {
      try {
        const io = req.app.get('io');
        if (io) {
          const specialty = response.content?.assessment?.recommendedSpecialty || 'General Medicine';
          io.to(`specialty_${specialty}`).emit('case_update', {
            caseId: response.caseDbId,
            type: 'RESIDENT_CLERKSHIP_SEALED',
            message: `O.V.R. has finalized a new high-fidelity clerkship for ${specialty}.`
          });
        }
      } catch (ioErr) {
        console.warn('⚠️ Clinical Pulse Notification Delayed:', ioErr.message);
      }
    }
    
    res.json({ success: true, response });
  } catch (err) {
    console.error('❌ O.V.R. Interaction Rupture:', err.message);
    res.status(500).json({ 
      success: false, 
      error: "Institutional Handshake Delay",
      message: "O.V.R. is experiencing high cognitive load. Please try re-sending your last response." 
    });
  }
});

module.exports = router;
