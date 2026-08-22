# ChainMind Sentinel

Real-time AI-powered security gate for Ethereum transactions — detects suspicious behavior using machine learning and enforces blocking decisions on-chain via a smart contract, with full auditability.

## Problem

DeFi exploits (flash loans, reentrancy) happen within seconds of deployment — faster than human security teams can react. ChainMind Sentinel combines real-time ML-based anomaly detection with an on-chain smart contract gate, so suspicious transactions are flagged and recorded immutably, with every decision explainable and auditable.

## Live Deployment

- **Network:** Ethereum Sepolia (testnet)
- **Contract Address:** `0x154d5Dec0C4D35a1bF985D44b335D4d84d441C21`
- **View on Etherscan:** https://sepolia.etherscan.io/address/0x154d5Dec0C4D35a1bF985D44b335D4d84d441C21

## Architecture

```
┌────────────────────────────┐     ┌────────────────────────────┐     ┌────────────────────────────┐
│         ML Service         │     │      Backend Service       │     │       Smart Contract       │
│         (FastAPI)          │◄───►│     (Node.js/Express)      │◄───►│      SentinelGate.sol      │
│         Port 8000          │     │         Port 4000          │     │    Deployed on Sepolia     │
│                            │     │                            │     │                            │
│ - Classifies txns          │     │ - Bridges ML + chain       │     │ - Stores decisions         │
│   as normal/suspicious     │     │ - Emits live events        │     │ - Emits on-chain           │
│ - Gemini-generated         │     │   via Socket.io            │     │   audit events             │
│   explanations             │     │ - Sends Telegram alerts    │     │ - Oracle-gated access      │
└────────────────────────────┘     └────────────────────────────┘     └────────────────────────────┘
                                                  ▲
                                     │ WebSocket (live updates)
                                                  ▼
                                   ┌────────────────────────────┐
                                   │     Frontend Dashboard     │
                                   │       (React + Vite)       │
                                   │         Port 5173          │
                                   │                            │
                                   │ - Live security feed       │
                                   │ - Stats bar (real-time)    │
                                   │ - Quick / Full demo        │
                                   │   triggers                 │
                                   └────────────────────────────┘
```

## Features

- **Real-time transaction classification** using a RandomForest model trained on synthetic transaction data (flash loan / reentrancy / frontrunning signatures)
- **On-chain security gate** (`SentinelGate.sol`) — every decision (approve/block) is written to Sepolia as an immutable, verifiable event
- **AI-generated explanations** — beyond rule-based flags, a Gemini-powered explanation is generated for every blocked transaction in plain, analyst-style language
- **Live dashboard** — Socket.io-powered real-time feed, stats bar, and one-click demo triggers ("Quick Demo" for 1 transaction, "Full Demo" for a 6-transaction batch mixing normal and attack patterns)
- **Telegram alerting** — instant push notification whenever a transaction is blocked

## Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Solidity, Hardhat, Ethereum Sepolia |
| ML Service | Python, scikit-learn, FastAPI |
| Backend | Node.js, Express, ethers.js, Socket.io |
| Frontend | React, Vite, socket.io-client |
| AI Explanations | Google Gemini API |
| Alerting | Telegram Bot API |

## Model Performance

Trained on 500 synthetic transactions (85% normal / 15% attack patterns), evaluated on a held-out 20% test split:

- **Accuracy:** 100%
- **Precision:** 100%
- **Recall:** 100%

*Note: near-perfect scores reflect clearly separable synthetic attack signatures (large value transfers + newly deployed contracts + high gas + rapid call frequency). On real-world historical data, we'd expect performance in the 85–95% range, which is why that was our target threshold rather than an assumption of perfection.*

## Running Locally

Each service runs independently. Start them in this order, each in its own terminal:

### 1. ML Service
```bash
cd chainmind-ml
pip install -r requirements.txt
python train.py        # trains and saves model.pkl
uvicorn app:app --port 8000
```

### 2. Smart Contract (already deployed — only needed to redeploy)
```bash
cd chainmind-contract
npx hardhat run scripts/deploy.js --network sepolia
```

### 3. Backend
```bash
cd chainmind-backend
npm install
node server.js         # runs on port 4000
```

### 4. Frontend
```bash
cd chainmind-frontend
npm install
npm run dev             # runs on port 5173
```

### Environment Variables

Each service needs its own `.env` file (not committed to this repo):

**`chainmind-contract/.env`**
```
SEPOLIA_RPC_URL=
PRIVATE_KEY=
PUBLIC_ADDRESS=
```

**`chainmind-ml/.env`**
```
GEMINI_API_KEY=
```

**`chainmind-backend/.env`**
```
SEPOLIA_RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESS=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Triggering the Demo

Once all 4 services are running, open the dashboard at `http://localhost:5173` and use either:
- **Quick Demo (1)** — sends a single attack transaction through the full pipeline
- **Full Demo (6)** — sends a mixed batch of 2 normal + 4 attack transactions

Each triggers: ML classification → on-chain `reviewTransaction` call → live dashboard update → Telegram alert (if blocked).

## Deliverables Checklist

- [x] Blockchain security gate smart contract (deployed, verified on Sepolia)
- [x] AI/ML transaction classifier (trained, served via API)
- [x] Real-time dashboard with alerts and blocked transactions
- [x] On-chain audit logs (immutable, verifiable via Etherscan)
- [x] Gen-AI explanation of flagged transactions (bonus)
- [x] Real-time alerting integration via Telegram (bonus)

## Known Limitations / Scope Notes

- Single-chain (Ethereum Sepolia) by design — multi-chain support (Polygon/Arbitrum) was scoped out to prioritize a complete, polished core system within the time constraint.
- Uses synthetic training data (per project constraints) rather than live historical exploit data.
- Transaction monitoring is demonstrated via a replay/batch mechanism rather than live mempool listening, for demo reliability and consistency.
