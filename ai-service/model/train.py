"""
RoboMed AI Triage — Model Training Script
==========================================
Trains two classifiers:
  1. specialty_model  — predicts recommended_specialty
  2. priority_model   — predicts priority_level (LOW | MEDIUM | HIGH)

Both use a Random Forest over a MultiLabelBinarizer feature matrix.
Models are serialised to disk and a model_info.json version file is written.

Usage:
    python model/train.py

Requirements:
    Run generate_synthetic.py first to create data/symptoms_dataset.csv
"""

import os
import json
import time
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.pipeline import Pipeline

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "..", "data", "symptoms_dataset.csv")
MODEL_DIR  = BASE_DIR  # save pkl files next to this script
INFO_PATH  = os.path.join(MODEL_DIR, "model_info.json")

# ─── Hyper-parameters ─────────────────────────────────────────────────────────
RANDOM_STATE    = 42
N_ESTIMATORS    = 200
TEST_SIZE       = 0.2
MIN_ACCURACY    = 0.85   # build fails if below this threshold


def load_and_parse(path):
    df = pd.read_csv(path)
    df["symptom_list"] = df["symptoms"].str.split(";").apply(
        lambda lst: [s.strip().lower() for s in lst if s.strip()]
    )
    return df


def build_features(df):
    mlb = MultiLabelBinarizer()
    X = mlb.fit_transform(df["symptom_list"])
    return X, mlb


def train_classifier(X_train, y_train, label_name="specialty"):
    print(f"\n🏋️  Training {label_name} classifier …")
    clf = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    t0 = time.time()
    clf.fit(X_train, y_train)
    print(f"   Done in {time.time() - t0:.1f}s")
    return clf


def evaluate(clf, X_test, y_test, le, label_name):
    y_pred  = clf.predict(X_test)
    acc     = accuracy_score(y_test, y_pred)
    f1      = f1_score(y_test, y_pred, average="weighted")
    print(f"\n📊 {label_name} Results")
    print(f"   Accuracy  : {acc:.4f}")
    print(f"   F1 (wt)   : {f1:.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    return acc, f1


def bump_version(info_path):
    if os.path.exists(info_path):
        with open(info_path) as f:
            info = json.load(f)
        parts = info.get("version", "1.0.0").split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        return ".".join(parts)
    return "1.0.0"


def main():
    print("🚀 RoboMed AI — Training Pipeline\n" + "=" * 40)

    # 1. Load
    print(f"📂 Loading dataset: {DATA_PATH}")
    df = load_and_parse(DATA_PATH)
    print(f"   Rows: {len(df)}  |  Specialties: {df['specialty'].nunique()}")

    # 2. Feature engineering
    X, mlb = build_features(df)

    # 3. Encode labels
    le_specialty = LabelEncoder()
    le_priority  = LabelEncoder()
    y_specialty  = le_specialty.fit_transform(df["specialty"])
    y_priority   = le_priority.fit_transform(df["priority"])

    # 4. Stratified train/test split
    X_tr, X_te, ys_tr, ys_te, yp_tr, yp_te = train_test_split(
        X, y_specialty, y_priority,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y_specialty,
    )

    # 5. Train
    clf_specialty = train_classifier(X_tr, ys_tr, "specialty")
    clf_priority  = train_classifier(X_tr, yp_tr, "priority")

    # 6. Evaluate
    acc_s, f1_s = evaluate(clf_specialty, X_te, ys_te, le_specialty, "Specialty")
    acc_p, f1_p = evaluate(clf_priority,  X_te, yp_te, le_priority,  "Priority")

    # 7. Enforce accuracy threshold
    assert acc_s >= MIN_ACCURACY, (
        f"❌ Specialty accuracy {acc_s:.4f} < threshold {MIN_ACCURACY}. "
        "Improve the dataset or model before deploying."
    )
    print(f"\n✅ Accuracy check passed ({acc_s:.4f} >= {MIN_ACCURACY})")

    # 8. Save models
    joblib.dump(clf_specialty, os.path.join(MODEL_DIR, "symptom_model.pkl"))
    joblib.dump(clf_priority,  os.path.join(MODEL_DIR, "priority_model.pkl"))
    joblib.dump(mlb,           os.path.join(MODEL_DIR, "label_encoder.pkl"))
    joblib.dump(le_specialty,  os.path.join(MODEL_DIR, "specialty_encoder.pkl"))
    joblib.dump(le_priority,   os.path.join(MODEL_DIR, "priority_encoder.pkl"))

    # 9. Write version metadata
    version = bump_version(INFO_PATH)
    info = {
        "version":        version,
        "trained_at":     datetime.now(timezone.utc).isoformat(),
        "n_samples":      len(df),
        "n_specialties":  int(df["specialty"].nunique()),
        "accuracy":       round(float(acc_s), 4),
        "f1_weighted":    round(float(f1_s), 4),
        "priority_accuracy": round(float(acc_p), 4),
        "test_size":      TEST_SIZE,
        "n_estimators":   N_ESTIMATORS,
        "dataset":        "synthetic_v1",   # update when switching to clinical data
    }
    with open(INFO_PATH, "w") as f:
        json.dump(info, f, indent=2)

    print(f"\n💾 Models saved → {MODEL_DIR}")
    print(f"📄 Version metadata: {version}")
    print(f"\n🎉 Training complete!\n")


if __name__ == "__main__":
    main()
