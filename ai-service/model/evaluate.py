"""
RoboMed AI Triage — Model Evaluation Script
============================================
Loads trained models and prints a detailed evaluation report
on the held-out test split. Run this any time to verify model quality.

Usage:
    python model/evaluate.py
"""

import os
import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix, ConfusionMatrixDisplay
)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "symptoms_dataset.csv")
MIN_ACCURACY = 0.85
MIN_PER_CLASS_F1 = 0.75


def main():
    # Load models
    clf      = joblib.load(os.path.join(BASE_DIR, "symptom_model.pkl"))
    mlb      = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))
    le_spec  = joblib.load(os.path.join(BASE_DIR, "specialty_encoder.pkl"))

    # Load and parse dataset
    df = pd.read_csv(DATA_PATH)
    df["symptom_list"] = df["symptoms"].str.split(";").apply(
        lambda lst: [s.strip().lower() for s in lst if s.strip()]
    )

    X = mlb.transform(df["symptom_list"])
    y = le_spec.transform(df["specialty"])

    _, X_te, _, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    y_pred = clf.predict(X_te)
    acc    = accuracy_score(y_te, y_pred)
    f1     = f1_score(y_te, y_pred, average="weighted")

    print("=" * 60)
    print("RoboMed AI — Evaluation Report")
    print("=" * 60)
    print(f"Accuracy (weighted): {acc:.4f}")
    print(f"F1 (weighted):       {f1:.4f}")
    print()
    report = classification_report(
        y_te, y_pred, target_names=le_spec.classes_, output_dict=True
    )
    print(classification_report(y_te, y_pred, target_names=le_spec.classes_))

    # Generate confusion matrix
    cm = confusion_matrix(y_te, y_pred)
    cm_df = pd.DataFrame(cm, index=le_spec.classes_, columns=le_spec.classes_)
    
    print("\n" + "=" * 60)
    print("Institutional Confusion Matrix (Predicted x Actual)")
    print("=" * 60)
    print(cm_df)
    print("=" * 60 + "\n")

    # Export results for documentation
    summary = {
        "accuracy": float(acc),
        "f1_weighted": float(f1),
        "report": report
    }
    with open(os.path.join(BASE_DIR, "evaluation_results.json"), "w") as f:
        json.dump(summary, f, indent=4)
    print(f"DONE: Metrics formally archived to evaluation_results.json")

    # Per-class F1 assertions
    failed = []
    for specialty in le_spec.classes_:
        per_f1 = report[specialty]["f1-score"]
        if per_f1 < MIN_PER_CLASS_F1:
            failed.append((specialty, per_f1))

    if failed:
        print("WARNING: Classes below per-class F1 threshold:")
        for name, score in failed:
            print(f"   {name}: {score:.4f} < {MIN_PER_CLASS_F1}")
    else:
        print(f"PASS: All classes F1 >= {MIN_PER_CLASS_F1}")

    assert acc >= MIN_ACCURACY, f"Accuracy {acc:.4f} below threshold {MIN_ACCURACY}"
    print(f"PASS: Overall accuracy check passed ({acc:.4f})")


if __name__ == "__main__":
    main()
