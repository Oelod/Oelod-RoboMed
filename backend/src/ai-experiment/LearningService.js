const fs = require('fs');
const path = require('path');

/**
 * RoboMed Learning Service
 * Implements the "Daily Intelligence Growth" manifold.
 * Analyzes de-identified interactions to discover new clinical vernacular and patterns.
 */
class LearningService {
  constructor() {
    this.memoryPath = path.join(__dirname, 'data-vault', 'clerkship-memory.json');
    this.ensureMemoryVault();
  }

  ensureMemoryVault() {
    const dir = path.dirname(this.memoryPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.memoryPath)) fs.writeFileSync(this.memoryPath, JSON.stringify([]));
  }

  /**
   * Logs a successful final clerkship for "Daily Intellectual Self-Training".
   */
  async logInteraction(state) {
    try {
      const memory = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
      
      const interactionRecord = {
        timestamp: new Date().toISOString(),
        userName: '[DE-IDENTIFIED]',
        symptoms: state.symptoms,
        focus: state.currentFocus,
        specialty: state.suggestedSpecialty,
        // Statutory Scrub: Raw conversation history is removed to ensure PHI absolute zero.
        clerkshipData: state.clarifiedData 
      };

      memory.push(interactionRecord);
      
      // Maintain a maximum manifold size of 10,000 recent clinical observations
      if (memory.length > 10000) memory.shift();

      fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2));
      console.log(`📡 [LEARNING] O.V.R. Intelligent Growth: New clinical pattern recorded (${state.caseId})`);
      
      return true;
    } catch (err) {
      console.error('❌ Intellectual Logging Failure:', err.message);
      return false;
    }
  }

  /**
   * Mock of an "Evolution Cycle" where the AI analyzes frequency of terms. 
   * In a real LLM setup, this triggers a "LoRA" fine-tuning or RAG update.
   */
  getFrequentTerms() {
    // This logic would scan the memory for high-frequency vernacular
    // to suggest new mappings for the ClinicalTranslator.
    return ["fire in chest", "shooting pain", "lump in throat"]; 
  }
}

module.exports = new LearningService();
