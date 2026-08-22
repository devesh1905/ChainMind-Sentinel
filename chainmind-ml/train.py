import csv
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix

def train_model():
    print("=" * 60)
    print("CHAINMIND SENTINEL - MODEL TRAINING PIPELINE")
    print("=" * 60)
    
    # 1. Locate dataset
    data_path = os.path.join(os.path.dirname(__file__), "data", "synthetic_transactions.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Please run generate_data.py first.")
        
    # Load dataset using standard library / csv
    features = []
    labels = []
    
    with open(data_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            feat_vector = [
                float(row["value_eth"]),
                float(row["gas_price_gwei"]),
                int(row["gas_used"]),
                int(row["from_address_age_days"]),
                int(row["to_contract_age_days"]),
                int(row["tx_frequency_last_hour"]),
                int(row["is_flash_loan_pattern"])
            ]
            features.append(feat_vector)
            labels.append(int(row["label"]))
            
    print(f"Loaded {len(features)} total records from synthetic_transactions.csv")
    
    # 2. Train / Test Split (80 / 20)
    X_train, X_test, y_train, y_test = train_test_split(
        features, 
        labels, 
        test_size=0.20, 
        random_state=42, 
        stratify=labels
    )
    
    print(f"Training set size : {len(X_train)} samples")
    print(f"Testing set size  : {len(X_test)} samples")
    
    # 3. Train RandomForestClassifier
    print("\nTraining Random Forest Classifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # 4. Evaluate Model
    y_pred = model.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    # 5. Save model to disk
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    joblib.dump(model, model_path)
    print(f"Trained model saved to: {model_path}\n")
    
    # 6. Print formatted metrics for screenshots/demo
    print("=" * 60)
    print("MODEL PERFORMANCE METRICS (TEST SET EVALUATION)")
    print("=" * 60)
    print(f"Accuracy  : {acc * 100:.2f}%  ({acc:.4f})")
    print(f"Precision : {prec * 100:.2f}%  ({prec:.4f})")
    print(f"Recall    : {rec * 100:.2f}%  ({rec:.4f})")
    print("-" * 60)
    print("CONFUSION MATRIX:")
    print("                      Predicted Normal (0)   Predicted Attack (1)")
    print(f"Actual Normal (0) :         {cm[0][0]:<20} {cm[0][1]:<20}")
    print(f"Actual Attack (1) :         {cm[1][0]:<20} {cm[1][1]:<20}")
    print("=" * 60)
    print("Training complete! Ready for FastAPI deployment.\n")

if __name__ == "__main__":
    train_model()
