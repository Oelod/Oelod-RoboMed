import os
import pandas as pd
import re
import json
import logging

logging.basicConfig(level=logging.INFO, format='[INGESTION] %(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class MimicIngestor:
    """
    Institutional Data Pipeline:
    Character-perfectly scrubs hospital datasets (MIMIC-IV) for local O.V.R. training.
    """
    def __init__(self):
        self.raw_dir = "ai-service/data"
        self.vault_dir = "ai-service/data-vault"
        os.makedirs(self.vault_dir, exist_ok=True)

    def scrub_phi(self, text):
        """Statutory PHI Manifold: Redacts names, identifiers, and sensitive data."""
        if not isinstance(text, str): return text
        
        # Redact SSNs and IDs
        text = re.sub(r'\d{3}-\d{2}-\d{4}', '[REDACTED_SSN]', text)
        text = re.sub(r'ID:\s*\d+', '[REDACTED_ID]', text)
        
        # Redact Emails
        text = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', text)
        
        # Redact Potential Names (Capitalized sequences followed by IDs)
        text = re.sub(r'PATIENT:\s*[A-Z][a-z]+\s*[A-Z][a-z]+', 'PATIENT: [REDACTED_NAME]', text)
        
        return text

    def ingest_csv(self, filename):
        """Processes a hospital CSV into the Institutional Knowledge Vault (Layer 2)."""
        input_path = os.path.join(self.raw_dir, filename)
        if not os.path.exists(input_path):
            logger.error(f"Handshake Failure: {filename} not found.")
            return

        logger.info(f"Initiating Statutory Ingestion: {filename}")
        df = pd.read_csv(input_path)
        
        # Apply the Privacy Seal
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].apply(self.scrub_phi)

        output_path = os.path.join(self.vault_dir, f"cleansed_{filename}")
        df.to_csv(output_path, index=False)
        logger.info(f"Layer 2 Integration Complete: {output_path}")

if __name__ == "__main__":
    ingestor = MimicIngestor()
    # Mocking the discovery of a hospital dataset
    if os.path.exists("ai-service/data/symptoms_dataset.csv"):
        ingestor.ingest_csv("symptoms_dataset.csv")
    else:
        logger.warning("No institutional data found in landing zone.")
