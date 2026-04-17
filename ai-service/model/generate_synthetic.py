import random
import csv
import os

# ─── Reproducibility ──────────────────────────────────────────────────────────
random.seed(42)

# ─── Master disease dictionary ────────────────────────────────────────────────
# Structure: specialty → [ (disease_name, [core_symptoms], priority_weight) ]
# priority_weight: 'high' | 'medium' | 'low'

DISEASE_MAP = {
    "Infectious Disease": [
        ("Malaria",           ["fever", "chills", "sweating", "headache", "joint pain", "fatigue"],        "high"),
        ("Typhoid Fever",     ["sustained fever", "abdominal pain", "diarrhea", "rose spots", "fatigue"],  "high"),
        ("Meningitis",        ["severe headache", "stiff neck", "fever", "sensitivity to light", "vomiting"], "high"),
        ("Dengue Fever",      ["high fever", "severe joint pain", "rash", "eye pain", "fatigue"],           "high"),
        ("Tuberculosis",      ["persistent cough", "blood in sputum", "night sweats", "weight loss", "fatigue"], "medium"),
        ("HIV/AIDS",          ["weight loss", "night sweats", "fatigue", "recurrent fever", "swollen lymph nodes"], "high"),
        ("Hepatitis B",       ["jaundice", "fatigue", "abdominal pain", "nausea", "dark urine"],            "medium"),
        ("Cholera",           ["watery diarrhea", "vomiting", "dehydration", "muscle cramps"],              "high"),
    ],
    "Cardiology": [
        ("Heart Attack",      ["chest pain", "shortness of breath", "arm pain", "sweating", "nausea"],     "high"),
        ("Heart Failure",     ["shortness of breath", "leg swelling", "fatigue", "rapid heartbeat"],        "high"),
        ("Arrhythmia",        ["irregular heartbeat", "palpitations", "dizziness", "shortness of breath"],  "medium"),
        ("Hypertension",      ["headache", "dizziness", "blurred vision", "chest pain", "nosebleed"],       "medium"),
        ("Angina",            ["chest tightness", "chest pain", "shortness of breath", "fatigue"],          "medium"),
        ("Pericarditis",      ["sharp chest pain", "fever", "shortness of breath", "dry cough"],            "medium"),
    ],
    "Neurology": [
        ("Stroke",            ["sudden numbness", "confusion", "speech difficulty", "vision loss", "severe headache"], "high"),
        ("Migraine",          ["severe headache", "nausea", "sensitivity to light", "visual aura", "vomiting"], "medium"),
        ("Epilepsy",          ["seizures", "loss of consciousness", "confusion", "muscle stiffness"],       "high"),
        ("Parkinson's",       ["tremors", "muscle rigidity", "slow movement", "balance problems"],          "medium"),
        ("Multiple Sclerosis",["numbness", "weakness", "vision problems", "fatigue", "coordination issues"], "medium"),
        ("Vertigo",           ["dizziness", "spinning sensation", "nausea", "balance problems"],            "low"),
    ],
    "Orthopedics": [
        ("Arthritis",         ["joint pain", "joint swelling", "stiffness", "reduced range of motion"],    "medium"),
        ("Fracture",          ["severe pain", "swelling", "bruising", "inability to move limb"],            "high"),
        ("Osteoporosis",      ["back pain", "loss of height", "stooped posture", "bone fracture"],          "medium"),
        ("Gout",              ["sudden severe joint pain", "redness", "swelling", "warmth in joint"],       "medium"),
        ("Slipped Disc",      ["back pain", "leg pain", "numbness", "muscle weakness"],                     "medium"),
        ("Tendinitis",        ["joint pain", "tenderness", "mild swelling", "pain on movement"],            "low"),
    ],
    "Dermatology": [
        ("Eczema",            ["itchy skin", "red rash", "dry skin", "skin inflammation", "blisters"],      "low"),
        ("Psoriasis",         ["scaly skin patches", "itching", "dry skin", "red patches", "nail changes"], "low"),
        ("Acne",              ["pimples", "blackheads", "oily skin", "skin redness"],                       "low"),
        ("Ringworm",          ["circular rash", "itching", "scaly skin", "redness"],                        "low"),
        ("Chickenpox",        ["widespread rash", "fever", "itching", "blisters", "fatigue"],               "medium"),
        ("Skin Cancer",       ["unusual mole", "changing skin lesion", "non-healing sore", "discoloration"], "high"),
    ],
    "General Medicine": [
        ("Common Cold",       ["runny nose", "sore throat", "cough", "sneezing", "mild fever"],             "low"),
        ("Influenza",         ["high fever", "body aches", "fatigue", "cough", "headache"],                 "medium"),
        ("Anemia",            ["fatigue", "pale skin", "shortness of breath", "dizziness", "cold extremities"], "medium"),
        ("Diabetes (Type 2)", ["increased thirst", "frequent urination", "fatigue", "blurred vision", "slow healing"], "medium"),
        ("Obesity",           ["excess weight", "fatigue", "shortness of breath", "joint pain"],            "medium"),
        ("Vitamin D Deficiency", ["bone pain", "muscle weakness", "fatigue", "low mood"],                   "low"),
    ],
    "ENT": [
        ("Sinusitis",         ["facial pain", "nasal congestion", "headache", "loss of smell", "runny nose"], "low"),
        ("Tonsillitis",       ["sore throat", "difficulty swallowing", "swollen tonsils", "fever"],         "medium"),
        ("Otitis Media",      ["ear pain", "hearing loss", "fever", "ear discharge"],                       "medium"),
        ("Laryngitis",        ["hoarse voice", "sore throat", "dry cough", "loss of voice"],                "low"),
        ("Hearing Loss",      ["difficulty hearing", "ringing in ears", "muffled sounds"],                  "medium"),
    ],
    "Gastroenterology": [
        ("GERD",              ["heartburn", "chest discomfort", "regurgitation", "difficulty swallowing"],  "low"),
        ("Peptic Ulcer",      ["burning stomach pain", "nausea", "bloating", "heartburn", "dark stools"],   "medium"),
        ("Crohn's Disease",   ["abdominal pain", "diarrhea", "weight loss", "fatigue", "blood in stool"],   "medium"),
        ("Liver Cirrhosis",   ["jaundice", "abdominal swelling", "easy bruising", "fatigue", "portal hypertension"], "high"),
        ("Appendicitis",      ["right lower abdominal pain", "fever", "nausea", "vomiting", "loss of appetite"], "high"),
        ("Irritable Bowel Syndrome", ["abdominal cramps", "bloating", "diarrhea", "constipation", "gas"], "low"),
    ],
    "Pulmonology": [
        ("Asthma",            ["wheezing", "shortness of breath", "chest tightness", "cough at night"],     "medium"),
        ("COPD",              ["chronic cough", "shortness of breath", "mucus production", "wheezing"],     "high"),
        ("Pneumonia",         ["cough with phlegm", "fever", "shortness of breath", "chest pain", "chills"], "high"),
        ("Pulmonary Embolism",["sudden shortness of breath", "chest pain", "coughing blood", "rapid heartbeat"], "high"),
        ("Lung Cancer",       ["persistent cough", "blood in sputum", "chest pain", "weight loss", "fatigue"], "high"),
        ("Pleural Effusion",  ["shortness of breath", "chest pain", "cough", "fever"],                     "medium"),
    ],
    "Urology": [
        ("Urinary Tract Infection", ["burning urination", "frequent urination", "cloudy urine", "pelvic pain"], "medium"),
        ("Kidney Stones",     ["severe flank pain", "blood in urine", "nausea", "vomiting", "frequent urination"], "high"),
        ("Prostate Cancer",   ["difficulty urinating", "blood in urine", "pelvic pain", "bone pain"],       "high"),
        ("Bladder Infection", ["painful urination", "frequent urination", "lower abdominal pain", "cloudy urine"], "medium"),
        ("Kidney Failure",    ["decreased urination", "swelling", "fatigue", "nausea", "confusion"],        "high"),
    ],
}

# ─── Noise symptom pool (added/removed to simulate real-world ambiguity) ───────
NOISE_SYMPTOMS = [
    "mild fever", "low appetite", "back pain", "general weakness",
    "dry mouth", "insomnia", "anxiety", "restlessness", "pallor",
    "mild nausea", "loss of taste", "weight loss", "night sweats",
]

# ─── Priority to numeric label ────────────────────────────────────────────────
PRIORITY_MAP = {"high": "HIGH", "medium": "MEDIUM", "low": "LOW"}


def generate_record(specialty, disease_name, core_symptoms, priority):
    symptoms = list(core_symptoms)
    # Inject 0-2 noise symptoms
    n_noise = random.randint(0, 2)
    symptoms += random.sample(NOISE_SYMPTOMS, n_noise)
    # Randomly drop 0-1 core symptom
    if len(symptoms) > 2 and random.random() < 0.3:
        symptoms.pop(random.randint(0, len(core_symptoms) - 1))
    random.shuffle(symptoms)
    return {
        "symptoms": ";".join(symptoms),
        "specialty": specialty,
        "priority": PRIORITY_MAP[priority],
        "possible_conditions": disease_name,
    }


def generate_dataset(n_samples=10000, output_path="data/symptoms_dataset.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    records = []
    specialties = list(DISEASE_MAP.keys())
    samples_per_specialty = n_samples // len(specialties)

    for specialty, diseases in DISEASE_MAP.items():
        for _ in range(samples_per_specialty):
            disease_name, core_symptoms, priority = random.choice(diseases)
            records.append(generate_record(specialty, disease_name, core_symptoms, priority))

    # Shuffle all records
    random.shuffle(records)

    fieldnames = ["symptoms", "specialty", "priority", "possible_conditions"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"✅ Generated {len(records)} records → {output_path}")
    print(f"   Specialties: {len(specialties)}")
    print(f"   Samples per specialty: {samples_per_specialty}")


if __name__ == "__main__":
    generate_dataset(n_samples=10000)
