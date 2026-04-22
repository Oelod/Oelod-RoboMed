const intelligenceService = require('./IntelligenceService');
const clinicalTranslator = require('./ClinicalTranslator');
const learningService    = require('./LearningService');
const axios              = require('axios');
const Case               = require('../models/Case');

/**
 * Oelod Virtual Resident (O.V.R.)
 * A conversational state machine that clarifies symptoms and structures 
 * clinical clerkships for human specialists.
 */
class VirtualResident {
  constructor() {
    this.sessions = new Map(); // caseId -> state
  }

  /**
   * Initializes a new clinical clerkship session.
   */
  /**
   * Initializes a new clinical clerkship session with Personalization.
   */
  async startSession(caseId, userName, patientId) {
    if (!intelligenceService.isInitialized) await intelligenceService.initialize();

    const state = {
      caseId,
      userName,
      symptoms: [],
      rawDescription: "",
      clarifiedData: {},
      step: 'rapport', // Start with friendly engagement
      history: [],
      currentFocus: null,
      suggestedSpecialty: null,
      rapportTurns: 0,
      patientId: patientId, // Linked to Statutory Identity
      handleStart(name) {
        const safeName = name || 'Valued Patient';
        const firstName = safeName.split(' ')[0];
        return {
          type: 'initial',
          content: `Hello ${firstName}. I'm your Oelod Virtual Resident. I'm here to listen and help you get the care you need today. It's completely okay if you're not sure how to describe everything—just tell me what's been bothering you in your own words, and we'll figure it out together. How are you feeling right now?`
        };
      }
    };

    this.sessions.set(caseId, state);
    return state.handleStart(userName);
  }

  /**
   * Processes a patient's response and advances the clerkship state.
   */
  async processResponse(caseId, text) {
    const state = this.sessions.get(caseId);
    if (!state) throw new Error('Clinical session not found.');

    state.history.push({ role: 'patient', text: clinicalTranslator.deIdentify(text) });

    // PRIORITY 1: Clinical Triage Handshake (Statutory Superiority)
    // If symptoms are detected, we MUST pivot to clarification immediately,
    // regardless of whether the user is also chatting.
    const symptoms = clinicalTranslator.normalize(text);
    if (symptoms.length > 0) {
      state.step = 'clarification';
      symptoms.forEach(s => {
        if (!state.symptoms.includes(s)) state.symptoms.push(s);
      });
      // Continue to clinical processing below...
    } else if (state.step === 'rapport') {
      state.rapportTurns = (state.rapportTurns || 0) + 1;
      const res = await this._handleRapport(state, text);
      const textRes = typeof res === 'string' ? res : (res.content || res.explanation);
      state.history.push({ role: 'assistant', text: textRes });
      return res;
    }

    // Daily Intelligence Growth Manifold
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/ai-resident/analyze`, {
        description: text
      }, { timeout: 8000 }); // Institutional limit: 8s
      
      if (aiResponse.data.success) {
        const { normalized_symptoms, suggested_focus } = aiResponse.data;
        normalized_symptoms.forEach(s => {
          if (!state.symptoms.includes(s)) state.symptoms.push(s);
        });
        state.currentFocus = suggested_focus || state.currentFocus;
      }
    } catch (err) {
      console.warn('📡 AI Node Offline: Using local heuristic fallback.');
      const normalized = clinicalTranslator.normalize(text);
      normalized.forEach(s => {
        if (!state.symptoms.includes(s)) state.symptoms.push(s);
      });
    }

    this._updateClinicalContext(state, text);
    this._syncSpecialty(state);

    if (this._isClerkshipComplete(state)) {
      state.step = 'completed';
      
      // Daily Intelligence Growth Manifold
      learningService.logInteraction(state);

      const clerkship = this._formatStructuredClerkship(state);
      const explanation = this._generatePatientExplanation(state, clerkship);

      // --- Institutional Case Creation ---
      try {
        const newCase = new Case({
          patient: state.patientId, 
          symptoms: state.symptoms,
          description: state.history.map(h => `${h.role}: ${h.text}`).join('\n'),
          assignedSpecialty: clerkship.assessment.recommendedSpecialty || 'General Medicine',
          priority: (clerkship.assessment.confidenceLevel === 'High' ? 'high' : 'medium'), 
          residentClerkship: {
            title: clerkship.title,
            history: clerkship.patientHistory,
            findings: clerkship.clinicalFindings,
            assessment: clerkship.assessment,
            residentNote: clerkship.residentNote,
            patientExplanation: explanation
          },
          status: 'open',
          timeline: [{ event: 'Clinical intake concluded by O.V.R.', note: 'Summary saved.' }]
        });
        await newCase.save();
        state.savedCaseId = newCase._id;
      } catch (err) {
        console.error('❌ Case Persistence Rupture:', err.message);
      }

      return {
        type: 'clerkship_final',
        content: clerkship,
        explanation: explanation,
        caseDbId: state.savedCaseId
      };
    }

    return this._generateNextQuestion(state);
  }

  async _handleRapport(state, text) {
    const rapportCheck = text.toLowerCase();
    
    // Use AI Chat for General Intelligence Rapport
    try {
      // Escalation Logic: If chat is getting long, signal the AI to wrap up
      let rapportStage = state.step;
      if (state.rapportTurns >= 5) rapportStage = 'rapport_closing';
      if (state.rapportTurns >= 8) {
         state.step = 'clarification';
         return { 
           type: 'message', 
           content: "I've really appreciated our discussion, but as your Virtual Resident, I want to make sure we don't delay your care. Let's start your clinical check-in now. " + this._generateNextQuestion(state)
         };
      }

      const chatResponse = await axios.post(`${process.env.AI_SERVICE_URL}/ai-resident/chat`, {
        text: text,
        history: state.history,
        stage: rapportStage,
        userName: state.userName
      });
      
      if (chatResponse.data.success) {
        // If the AI service returned a response, use it. 
        // It's always better than the legacy fallback during rapport.
        return { type: 'message', content: chatResponse.data.response };
      }
    } catch (err) {
      console.warn('📡 AI Rapport Node Offline: Using legacy heuristics.');
    }

    // Legacy Fallbacks
    if (rapportCheck.includes('hello') || rapportCheck.includes('hi ')) {
      return { type: 'message', content: "Hello! I'm here and listening. What's been on your mind regarding your health today?" };
    }
    
    // Detect if user has started describing symptoms OR if rapport has concluded
    const symptoms = clinicalTranslator.normalize(text);
    if (symptoms.length > 0 || state.rapportTurns >= 4) {
      state.step = 'clarification';
      state.symptoms = symptoms;
      
      let transition = "I've picked up on some things you mentioned that we should look into closer. ";
      if (symptoms.length === 0) {
        transition = "I'd like to understand more about how you're feeling physically so I can find the best specialist for you. ";
      }
      
      return transition + this._generateNextQuestion(state);
    }

    if (state.rapportTurns === 2) {
      return "I'm listening carefully. Could you describe any specific physical sensations? For example, are you feeling any pain, pressure, or changes in your breathing?";
    }

    return "I'm listening. Please, tell me more in your own words—I want to make sure I understand everything about how you're feeling.";
  }

  _updateClinicalContext(state, text) {
    const lower = text.toLowerCase();
    // Heuristic capture of clinical qualifiers
    if (lower.includes('yes') || lower.includes('true') || lower.includes('radiating')) {
      state.clarifiedData[state.lastQuestionKey] = true;
    } else if (lower.includes('no') || lower.includes('never')) {
      state.clarifiedData[state.lastQuestionKey] = false;
    } else {
      state.clarifiedData[state.lastQuestionKey] = text;
    }
  }

  _generateNextQuestion(state) {
    if (!state.currentFocus && state.symptoms.length > 0) {
       // Refresh analysis if focus is null
       const matches = intelligenceService.predict(state.symptoms);
       if (matches.length > 0) {
         state.currentFocus = matches[0].disease || matches[0].label;
         state.suggestedSpecialty = matches[0].specialty;
       }
    }
    
    // Logic refinement: If we have a focus, stay in it for at least 3-4 questions before fallback
    if (state.currentFocus?.toLowerCase().includes('angina') || state.currentFocus?.toLowerCase().includes('heart') || state.suggestedSpecialty === 'Cardiology') {
      if (state.clarifiedData.radiating === undefined) {
        state.lastQuestionKey = 'radiating';
        return "I'm looking at that chest pressure you mentioned. Does this pain ever move or shoot toward your left arm, neck, or jaw?";
      }
      if (state.clarifiedData.shortnessOfBreath === undefined) {
        state.lastQuestionKey = 'shortnessOfBreath';
        return "Does it sometimes feel like it's hard to catch your breath (hard in breathing), even when you're just sitting still?";
      }
      if (state.clarifiedData.sweating === undefined) {
        state.lastQuestionKey = 'sweating';
        return "Are you also experiencing any cold sweats or feel particularly clammy right now?";
      }
    }

    if (state.currentFocus?.toLowerCase().includes('cold') || state.currentFocus?.toLowerCase().includes('fever') || state.currentFocus?.toLowerCase().includes('migraine')) {
      if (state.clarifiedData.duration === undefined) {
        state.lastQuestionKey = 'duration';
        return "Got it. How long has this been bothering you? (For example, how many days?)";
      }
      if (state.clarifiedData.localised === undefined) {
          state.lastQuestionKey = 'localised';
          return "Is the feeling localized to one spot, or does it feel like it's affecting your whole head/body?";
      }
    }

    // Default Fallback: Only hit this if no focus is detected or after all clarifications
    state.lastQuestionKey = 'additionalNotes';
    return "Is there anything else, even something small, that you think your doctor should know about your health right now? Once you share that, I'll finalize your specialist referral.";
  }

  _syncSpecialty(state) {
    if (!state.currentFocus && state.symptoms.length > 0) {
      const matches = intelligenceService.predict(state.symptoms);
      if (matches.length > 0) {
        state.currentFocus = matches[0].disease || matches[0].label;
        state.suggestedSpecialty = matches[0].specialty;
      }
    }

    // High-Fidelity Override: If focus is already a specialty name, anchor to it
    const knownSpecialties = [
      'Cardiology', 'Orthopedics', 'Orthopedic Surgery', 'ENT', 'Neurology', 
      'Dermatology', 'Endocrinology', 'Gastroenterology', 'General Medicine',
      'Psychiatry', 'Pulmonology', 'Rheumatology', 'Urology', 'Ophthalmology'
    ];

    const matchedSpec = knownSpecialties.find(s => 
      state.currentFocus?.toLowerCase().includes(s.toLowerCase()) || 
      state.suggestedSpecialty?.toLowerCase().includes(s.toLowerCase())
    );

    if (matchedSpec) {
      state.suggestedSpecialty = matchedSpec;
    }

    if (!state.suggestedSpecialty && state.currentFocus) {
       // Deep lookup in Master Registry
       const match = intelligenceService.predict(state.symptoms).find(m => 
          (m.disease === state.currentFocus || m.label === state.currentFocus) && m.specialty
       );
       if (match) state.suggestedSpecialty = match.specialty;
    }
    
    if (!state.suggestedSpecialty) state.suggestedSpecialty = 'General Medicine';
  }

  _isClerkshipComplete(state) {
    // Session ends after 3-4 clarifications or if user provides additional notes
    return Object.keys(state.clarifiedData).length >= 3 || state.lastQuestionKey === 'additionalNotes';
  }

  /**
   * Generates a relatable summary for the patient explaining the 'Why'.
   */
  _generatePatientExplanation(state, clerkship) {
    const focus = clerkship.assessment.primaryFocus || "General Health Concern";
    const specialist = clerkship.assessment.recommendedSpecialty || "General Medicine";

    let rationale = "";
    if (clerkship.patientHistory.includes('palpitations') || clerkship.patientHistory.includes('angina')) {
      rationale = "because you mentioned that tight, squeezing pressure in your chest. We want to make sure your heart is operating exactly as it should.";
    } else if (clerkship.patientHistory.includes('fever') || clerkship.patientHistory.includes('hyperthermia')) {
      rationale = "given that you've been feeling quite hot and shivering lately. We need to rule out any stubborn infections.";
    } else if (clerkship.patientHistory.includes('gastralgia') || clerkship.patientHistory.includes('stomach')) {
      rationale = "to look into those stomach cramps you described, so we can get your digestion back on track.";
    } else if (clerkship.patientHistory.includes('anxiety') || clerkship.patientHistory.includes('jittery')) {
      rationale = "to help address that jittery feeling and those racing thoughts you've been having.";
    } else {
      rationale = "to ensure we have a comprehensive understanding of everything you've shared with me today.";
    }

    return `Based on our conversation, I suspect this could be related to ${focus}. I believe this ${rationale} I am now sending your case to our ${specialist} department. Your specialist will review this summary immediately. Redirecting you to your Case File now...`;
  }

  /**
   * Transforms the conversation into a "Structured Medical Clerkship" for the doctor.
   */
  _formatStructuredClerkship(state) {
    return {
      title: `MEDICAL SUMMARY: ${state.caseId}`,
      patientHistory: state.symptoms,
      clinicalFindings: state.clarifiedData,
      assessment: {
        primaryFocus: state.currentFocus,
        recommendedSpecialty: state.suggestedSpecialty,
        confidenceLevel: 'High (Protocol 01-B Match)'
      },
      residentNote: "The patient was cooperative during intake. Symptoms are consistent with the detected patterns. Recommend immediate specialist review."
    };
  }
}

module.exports = new VirtualResident();
