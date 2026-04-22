const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

class IntelligenceService {
  constructor() {
    this.dataVaultPath = path.join(__dirname, 'data-vault');
    this.knowledgeLayers = {
      layer0: [], // Synthetic / Development Data
      layer1: [], // Open Datasets (UCI/Kaggle)
      layer2: []  // Institutional (MIMIC/Real Hospital) - Future
    };
    this.isInitialized = false;
  }

  /**
   * Initializes the Intelligence Hub by loading all active layers.
   */
  async initialize() {
    console.log('📡 Initializing RoboMed Intelligence Hub...');
    
    try {
      // Load Layer 0: Synthetic & Master Specialists
      this.knowledgeLayers.layer0 = [
        ...this._loadLayerFile('layer0_synthetic.json', 'json'),
        ...this._loadLayerFile('layer0_specialists.json', 'json')
      ];

      // Load Layer 1: Open Clinical Data
      this.knowledgeLayers.layer1 = [
        ...this._loadLayerFile('layer1_kaggle_symptoms.csv', 'csv'),
        ...this._loadLayerFile('layer1_uci_heart.csv', 'csv'),
        ...this._loadLayerFile('layer1_uci_diabetes.csv', 'csv'),
        // High-Fidelity Synthetic Dataset Inclusion (Statutory Root Junction)
        ...this._loadLayerFile(path.resolve(__dirname, '../../../ai-service/data/symptoms_dataset.csv'), 'csv-synthetic', true)
      ];

      this.isInitialized = true;
      console.log(`✅ Intelligence Hub Ready. Records Loaded: 
        L0 (Synthetic): ${this.knowledgeLayers.layer0.length}
        L1 (Open Data): ${this.knowledgeLayers.layer1.length}
        L2 (Hospital):  ${this.knowledgeLayers.layer2.length}`);
    } catch (err) {
      console.error('❌ Intelligence Hub Initialization Failed:', err.message);
    }
  }

  _loadLayerFile(filename, type, isAbsolute = false) {
    const filePath = isAbsolute ? filename : path.join(this.dataVaultPath, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: Knowledge file ${filename} not found. Skipping.`);
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (type === 'json') {
      return JSON.parse(content);
    } else if (type === 'csv') {
      try {
        return parse(content, {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true
        });
      } catch (err) {
        console.error(`❌ CSV Parse Error (${filename}):`, err.message);
        return [];
      }
    } else if (type === 'csv-synthetic') {
      try {
        const records = parse(content, {
          columns: true,
          skip_empty_lines: true
        });
        // Transform the semicolon symptoms into a standard clinical array
        return records.map(r => ({
          ...r,
          symptoms: r.symptoms.split(';').map(s => s.trim().toLowerCase()),
          disease: r.possible_conditions
        }));
      } catch (err) {
        console.error(`❌ Synthetic CSV Rupture (${filename}):`, err.message);
        return [];
      }
    }
    return [];
  }

  /**
   * Core Prediction Logic: Searches across all layers with prioritized weighting.
   * @param {Array} symptoms - User provided symptoms
   */
  predict(symptoms) {
    if (!this.isInitialized) throw new Error('Intelligence Hub not initialized.');

    // In a real implementation, this would be a weighted search or an LLM RAG prompt.
    // For this standalone prototype, we match against the knowledge manifold.
    const results = [];

    // Prioritize Layer 1 (Real Data) over Layer 0 (Synthetic)
    const activeKnowledge = [
      ...this.knowledgeLayers.layer2,
      ...this.knowledgeLayers.layer1,
      ...this.knowledgeLayers.layer0
    ];

    const query = symptoms.map(s => s.toLowerCase());

    const matches = activeKnowledge.map(record => {
      // Check if record has a structured symptoms array
      const recordSymptoms = Array.isArray(record.symptoms) 
        ? record.symptoms 
        : JSON.stringify(record).toLowerCase().split(/\W+/);
        
      const matchCount = query.filter(s => 
        s.length > 2 && // Noise Filter: Ignore tokens like 'i', 'a', 'to'
        recordSymptoms.some(rs => {
          const rsLower = rs.toLowerCase();
          const match = rsLower.length < 3 ? rsLower === s : (rsLower.includes(s) || s.includes(rsLower));
          return match;
        })
      ).length;
      
      // Calculate Layer Weighting (L2 > L0 > L1)
      let weight = 0;
      if (this.knowledgeLayers.layer2.includes(record)) weight = 2000; // Real Hospital Data
      else if (this.knowledgeLayers.layer0.includes(record)) weight = 1000; // Master Specialist Registry
      else weight = 100; // Open Data
      
      return { record, matchCount, score: (matchCount * 10) + weight };
    }).filter(m => m.matchCount > 0)
      .sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
      console.log(`🎯 [Intelligence] Top Match: ${matches[0].record.specialty || matches[0].record.label} (${matches[0].matchCount} hits, Layer Weight: ${matches[0].score - matches[0].matchCount})`);
    }

    return matches.slice(0, 5).map(m => m.record);
  }

  /**
   * Returns metadata about the currently empowered knowledge base.
   */
  getRegistryStats() {
    return {
      sources: [
        { id: 'L0', type: 'Synthetic', count: this.knowledgeLayers.layer0.length, status: 'Active' },
        { id: 'L1', type: 'Open (UCI/Kaggle)', count: this.knowledgeLayers.layer1.length, status: 'Active' },
        { id: 'L2', type: 'Hospital (Institutional)', count: this.knowledgeLayers.layer2.length, status: 'Dormant' }
      ],
      totalRecords: this.knowledgeLayers.layer0.length + this.knowledgeLayers.layer1.length + this.knowledgeLayers.layer2.length
    };
  }
}

module.exports = new IntelligenceService();
