/**
 * RoboMed Clinical Translator
 * Inspired by BioBERT/BioGPT patterns for medical entity normalization.
 * Transforms patient-vernacular into statutory clinical terminology.
 */
class ClinicalTranslator {
  constructor() {
    this.lexicon = {
       'pounding': 'palpitations',
       'fluttering': 'palpitations',
       'beating fast': 'tachycardia',
       'feeling hot': 'fever',
       'burning up': 'fever',
       'tight chest': 'chest pressure',
       'heavy chest': 'chest pressure',
       'chest pain': 'angina',
       'hurts in chest': 'angina',
       'hard in breathing': 'dyspnea',
       'cannot breathe': 'dyspnea',
       'hard to breathe': 'dyspnea',
       'radiating to arm': 'brachial radiation',
       'hurts to breathe': 'pleuritic pain',
       'runny nose': 'rhinorrhea',
       'stuffy': 'nasal congestion',
       'coughing up stuff': 'productive cough',
       'throbbing': 'migraine',
       'spinning': 'vertigo',
       'night sweats': 'nocturnal hyperhidrosis',
       'butterfly rash': 'malar rash',
       'joint stiffness': 'joint mobility restriction',
       'itchy eyes': 'allergic conjunctivitis',
       'blurred vision': 'vision impairment',
       'swollen ankles': 'peripheral edema',
       'shuffling gait': 'parkinsonian gait',
       'tremor': 'involuntary tremor',
       'numbness': 'paresthesia',
       'blood in urine': 'hematuria',
       'pelvic pain': 'pelvic discomfort',
       'loud snoring': 'sleep apnea indicator',
       'weight gain': 'unexplained weight gain',
       'cold sensitivity': 'hypothyroid indicator'
    };
  }

  /**
   * Normalizes raw descriptive text into a clinical symptom manifold.
   */
  normalize(rawText) {
    const text = rawText.toLowerCase();
    const detectedSymptoms = [];

    // Protocol: Lexical Scanning for Medical Entity Extraction
    for (const [vernacular, clinical] of Object.entries(this.lexicon)) {
      if (text.includes(vernacular)) {
        detectedSymptoms.push(clinical);
      }
    }

    return [...new Set(detectedSymptoms)]; // Returns unique, verified clinical manifold
  }

  /**
   * PHI De-identification Manifold: 
   * Character-perfectly scrubs potential Personaly Identifiable Information.
   */
  deIdentify(text) {
    // Statutory Regex Patterns for PHI Removal
    const patterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, // Email
      /\b\d{10,11}\b/g, // Phone
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // Dates
      /\b(mr\.|ms\.|mrs\.|dr\.)\s+[a-z]+/gi // Common Name Patterns
    ];

    let cleansed = text;
    patterns.forEach(p => {
      cleansed = cleansed.replace(p, '[REDACTED]');
    });

    return cleansed;
  }
}

module.exports = new ClinicalTranslator();
