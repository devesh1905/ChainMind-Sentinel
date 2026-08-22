# ChainMind Sentinel

# ChainMind Sentinel

Title:
ChainMind Sentinel

Background:
In decentralized finance (DeFi), smart contract vulnerabilities are exploited within seconds of deployment. Attackers use flash loan attacks or reentrancy to drain funds, often before security teams can detect anomalies. Real-time monitoring of blockchain transactions is critical, but current tools lack integration between AI-driven anomaly detection and on-chain verification.

Problem Statement:
Design a system that detects and blocks malicious transactions in real-time by combining blockchain event monitoring with AI-based behavioral anomaly detection. The system must validate suspicious activity using on-chain data and prevent exploit execution before irreversible damage occurs. Time is critical — attackers exploit vulnerabilities within minutes, and security teams need automated, auditable responses.

Scope:
Develop a real-time security system that monitors Ethereum blockchain transactions, detects anomalies using machine learning, and enforces security policies via blockchain smart contracts. The system must integrate transaction monitoring, AI classification, and on-chain enforcement.

MVP Scope:
- Monitor Ethereum blockchain for incoming transactions using a blockchain node (e.g. Infura or Alchemy)
- Use AI/ML to classify transactions as 'normal' or 'suspicious' based on historical behavior
- Deploy a smart contract that acts as a security gate, blocking suspicious transactions
- Log all decisions and transaction data on-chain for auditability
- Provide a dashboard showing real-time alerts and blocked transactions

Advanced/Bonus Scope:
- Implement a lightweight gen-ai component to explain why a transaction was flagged
- Add support for multiple blockchain networks (e.g. Polygon or Arbitrum)
- Integrate with a real-time alerting service (e.g. Twilio or Discord)

Functional Requirements:
- The system must detect and classify Ethereum transactions in real-time
- AI/ML model must be trained on historical transaction data to identify anomalies
- A blockchain smart contract must enforce security policies by rejecting suspicious transactions
- All decisions must be recorded on-chain with metadata (timestamp, reason, transaction hash)
- A frontend must display live transaction monitoring and security alerts
- The system must support replay of past transactions for model validation

Non-Functional Requirements:
- Response time for transaction analysis must be under 5 seconds
- On-chain logging must be immutable and verifiable
- AI model accuracy must exceed 85% on test data
- System must be deployable on a cloud environment (AWS/GCP)
- All security decisions must be traceable and explainable

Constraints:
- MVP must be fully functional within 6 hours of development
- Only Ethereum blockchain is allowed for transaction monitoring
- No external APIs or third-party services beyond blockchain nodes
- All code must be written from scratch — no pre-built templates
- The AI/ML model must be trained on provided synthetic data
- All blockchain interactions must be on testnet (Goerli/Rinkeby)

Deliverables:
- A working blockchain security gate smart contract
- An AI/ML model that classifies transactions
- A real-time dashboard showing alerts and blocked transactions
- On-chain logs of all decisions
- A demo video showing the system in action
