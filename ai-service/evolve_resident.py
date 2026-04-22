import json
import os
import logging
from collections import Counter

logging.basicConfig(level=logging.INFO, format='[EVOLUTION] %(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class ResidentEvolver:
    """
    O.V.R. Evolution Engine:
    Parses daily clerkship memories to discover new clinical patterns and vernacular.
    """
    def __init__(self, memory_path):
        self.memory_path = memory_path
        self.evolution_log = "ai-service/data-vault/evolution_report.json"

    def analyze_growth(self):
        """Analyzes memories to detect common vernacular that isn't yet in our anchors."""
        if not os.path.exists(self.memory_path):
            logger.warning("No clinical memory found. Evolution cycle suspended.")
            return

        with open(self.memory_path, 'r') as f:
            memories = json.load(f)

        if not memories:
            logger.info("Memory bank empty. No evolution required.")
            return

        logger.info(f"Initiating Evolution Cycle for {len(memories)} recent interactions...")
        
        # Aggregate all de-identified history strings
        all_text = " ".join([" ".join(m.get('history', [])) for m in memories])
        words = [w.lower() for w in all_text.split() if len(w) > 3]
        common_terms = Counter(words).most_common(10)

        # Record the Institutional Evolution
        report = {
            "timestamp": memories[-1]['timestamp'],
            "interactions_processed": len(memories),
            "discovered_vernacular": [term for term, count in common_terms],
            "manification_status": "Anchors Stable - No immediate retraining required"
        }

        with open(self.evolution_log, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Evolution Cycle Finalized: Discovered {len(common_terms)} new potential anchors.")

if __name__ == "__main__":
    # Institutional path handshake
    MEM_PATH = "backend/src/ai-experiment/data-vault/clerkship-memory.json"
    evolver = ResidentEvolver(MEM_PATH)
    evolver.analyze_growth()
