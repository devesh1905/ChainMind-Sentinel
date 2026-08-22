import os
import joblib
import requests
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Load environment variables from .env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path, override=True)

# 1. Initialize FastAPI Application
app = FastAPI(
    title="ChainMind Sentinel AI Triage API",
    description="Real-time Machine Learning & Gemini Gen-AI Anomaly Detection Engine for Ethereum Transactions",
    version="1.3.0"
)

# 2. Load Trained Machine Learning Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Run train.py first!")

model = joblib.load(MODEL_PATH)


# 3. Define Pydantic Request & Response Models
class TransactionInput(BaseModel):
    value_eth: float = Field(..., description="ETH amount transferred", example=150.5)
    gas_price_gwei: float = Field(..., description="Gas price in Gwei", example=120.0)
    gas_used: int = Field(..., description="Gas units consumed", example=850000)
    from_address_age_days: int = Field(..., description="Sender wallet age in days", example=2)
    to_contract_age_days: int = Field(..., description="Recipient contract age in days", example=1)
    tx_frequency_last_hour: int = Field(..., description="Sender tx frequency in last hour", example=45)
    is_flash_loan_pattern: int = Field(..., description="Flash loan indicator (0 or 1)", example=1)


class ClassificationResponse(BaseModel):
    label: str = Field(..., description="'normal' or 'suspicious'")
    confidence: float = Field(..., description="Prediction confidence score between 0 and 1")
    reason: str = Field(..., description="Fast rule-based explanation of decision")
    ai_explanation: Optional[str] = Field(None, description="Gemini Gen-AI LLM explanation for suspicious transactions")


# 4. Helper Function for Rule-Based Reasoning
def generate_explanation(tx: TransactionInput, is_suspicious: bool) -> str:
    if not is_suspicious:
        return "Transaction parameters are within expected historical bounds"

    factors = []
    if tx.value_eth >= 50.0:
        factors.append(f"large transfer value ({tx.value_eth} ETH)")
    if tx.to_contract_age_days <= 14:
        factors.append(f"newly created recipient contract ({tx.to_contract_age_days} days old)")
    if tx.from_address_age_days <= 14:
        factors.append(f"recent sender wallet ({tx.from_address_age_days} days old)")
    if tx.tx_frequency_last_hour >= 10:
        factors.append(f"high call frequency ({tx.tx_frequency_last_hour} calls/hr)")
    if tx.gas_price_gwei >= 75.0:
        factors.append(f"elevated gas price ({tx.gas_price_gwei} Gwei)")
    if tx.is_flash_loan_pattern == 1:
        factors.append("flash loan pattern detected")

    if factors:
        return "Flagged due to: " + ", ".join(factors)
    return "Flagged by ML model based on multi-feature anomaly classification"


# 5. Gemini Gen-AI Explanation Generator
def generate_ai_explanation(tx: TransactionInput, label: str, rule_based_reason: str) -> Optional[str]:
    # Skip LLM call for normal transactions
    if label != "suspicious":
        return None

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    fallback_text = "Gemini AI Analyst: Automated security anomaly flagged due to abnormal transaction metrics."
    if not api_key:
        print("[Gemini AI] No GEMINI_API_KEY found in .env. Returning fallback AI explanation.")
        return fallback_text

    prompt = (
        f"You are a senior blockchain security analyst evaluating an Ethereum transaction flagged as suspicious.\n"
        f"Transaction Parameters:\n"
        f"- Transferred Value: {tx.value_eth} ETH\n"
        f"- Gas Price: {tx.gas_price_gwei} Gwei\n"
        f"- Sender Wallet Age: {tx.from_address_age_days} days\n"
        f"- Recipient Contract Age: {tx.to_contract_age_days} days\n"
        f"- Tx Frequency (Last Hour): {tx.tx_frequency_last_hour} calls/hr\n"
        f"- Flash Loan Pattern: {tx.is_flash_loan_pattern}\n"
        f"Triggered Anomaly Flags: {rule_based_reason}\n\n"
        f"Write ONE complete, professional sentence (15 to 25 words) explaining the security risk in plain English. "
        f"Do NOT include intro phrases, titles, quotes, or thinking scratchpad text. Provide ONLY the final analyst sentence."
    )

    candidate_models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]

    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        headers = {
            "x-goog-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 300,
                "temperature": 0.2
            }
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and len(candidates) > 0:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    for p in parts:
                        txt = p.get("text", "").strip()
                        if txt and not p.get("thought", False):
                            # Remove markdown bolding or surrounding quotes
                            txt = txt.replace("**", "").strip()
                            if txt.startswith('"') and txt.endswith('"'):
                                txt = txt[1:-1].strip()
                            if len(txt.split()) >= 5:
                                print(f"[Gemini AI] Call Succeeded with model {model_name}! Explanation generated.")
                                return txt

            print(f"[Gemini AI] Model {model_name} returned status {resp.status_code}. Trying next model candidate...")
        except Exception as err:
            print(f"[Gemini AI] Model {model_name} call failed/timed out ({err}). Trying next model candidate...")

    print("[Gemini AI] All Gemini model candidates failed or timed out. Returning fallback AI explanation.")
    return fallback_text


def classify_single(tx: TransactionInput) -> ClassificationResponse:
    features = [[
        tx.value_eth,
        tx.gas_price_gwei,
        tx.gas_used,
        tx.from_address_age_days,
        tx.to_contract_age_days,
        tx.tx_frequency_last_hour,
        tx.is_flash_loan_pattern
    ]]

    pred = model.predict(features)[0]
    proba = model.predict_proba(features)[0]

    is_suspicious = (pred == 1)
    label_str = "suspicious" if is_suspicious else "normal"
    confidence_score = float(proba[1] if is_suspicious else proba[0])
    reason_str = generate_explanation(tx, is_suspicious)

    # Generate Gemini Gen-AI explanation for suspicious transactions
    ai_exp = generate_ai_explanation(tx, label_str, reason_str)

    return ClassificationResponse(
        label=label_str,
        confidence=round(confidence_score, 4),
        reason=reason_str,
        ai_explanation=ai_exp
    )


# 6. API Endpoints

@app.get("/health")
def health_check():
    api_key_status = "present" if (os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")) else "missing"
    return {"status": "ok", "gemini_api_key": api_key_status}


@app.post("/classify", response_model=ClassificationResponse)
def classify_transaction(tx: TransactionInput):
    try:
        return classify_single(tx)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/replay", response_model=List[ClassificationResponse])
def replay_batch_transactions(transactions: List[TransactionInput]):
    try:
        return [classify_single(tx) for tx in transactions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
