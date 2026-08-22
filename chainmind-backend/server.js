require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// 1. Initialize Express App & Socket.io Server
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 2. Load Smart Contract Configuration & Ethers Provider
const PORT = process.env.PORT || 4000;
const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!RPC_URL || !process.env.PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error("❌ Error: Missing SEPOLIA_RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS in .env");
  process.exit(1);
}

const formattedPrivateKey = process.env.PRIVATE_KEY.startsWith("0x")
  ? process.env.PRIVATE_KEY
  : `0x${process.env.PRIVATE_KEY}`;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(formattedPrivateKey, provider);

const abiPath = path.join(__dirname, "SentinelGate.json");
if (!fs.existsSync(abiPath)) {
  console.error("❌ Error: SentinelGate.json ABI file not found in chainmind-backend");
  process.exit(1);
}

const sentinelGateArtifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
const contract = new ethers.Contract(CONTRACT_ADDRESS, sentinelGateArtifact.abi, wallet);

let oracleAddress = "0x0000000000000000000000000000000000000000";

// In-Memory Storage for Audit Trail (Max 100 recent decisions)
const recentDecisions = [];

/**
 * Helper: Send Telegram Alert for Blocked Transactions
 * Non-blocking, 3-second timeout via AbortController, detailed console logging
 */
async function sendTelegramAlert(decision) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("⚠️ [Telegram Alert] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing in .env");
    return;
  }

  const confidencePct = Math.round((decision.confidence || 0) * 100);
  const sepoliaUrl = `https://sepolia.etherscan.io/tx/${decision.sepoliaTxHash}`;

  const textMessage = [
    "🚨 ChainMind Sentinel Alert",
    "Status: BLOCKED",
    `Reason: ${decision.reason}`,
    `Confidence: ${confidencePct}%`,
    `Tx: ${sepoliaUrl}`
  ].join("\n");

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMessage
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`📱 [Telegram Alert] Sent successfully to chat ${chatId}!`);
    } else {
      const errText = await response.text();
      console.error(`❌ [Telegram Alert] API Error (${response.status}): ${errText}`);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("❌ [Telegram Alert] Request timed out after 3 seconds");
    } else {
      console.error("❌ [Telegram Alert] Exception while sending message:", error.message);
    }
  }
}

/**
 * Core Function: Process single transaction features
 * 1. Calls ML API (http://localhost:8000/classify)
 * 2. Captures rule-based reason & Gen-AI explanation
 * 3. Generates mock bytes32 transaction hash
 * 4. Submits on-chain review to SentinelGate smart contract on Sepolia
 * 5. Logs to in-memory store
 * 6. Emits real-time event via WebSockets (Socket.io)
 * 7. Sends instant Telegram alert if transaction is blocked (isSuspicious === true)
 */
async function processTransaction(txFeatures) {
  // Step A: Call ML API classifier
  const mlResponse = await fetch(`${ML_API_URL}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(txFeatures)
  });

  if (!mlResponse.ok) {
    throw new Error(`ML Classifier API error: ${mlResponse.statusText}`);
  }

  const mlResult = await mlResponse.json();
  const { label, confidence, reason, ai_explanation } = mlResult;
  const isSuspicious = (label === "suspicious");

  // Step B: Generate synthetic bytes32 transaction hash
  const mockTxHash = ethers.id(Math.random().toString() + Date.now().toString());

  console.log("\n--------------------------------------------------");
  console.log(`📡 [ML VERDICT] Hash: ${mockTxHash.substring(0, 14)}...`);
  console.log(`   Label          : ${label.toUpperCase()} (Confidence: ${confidence})`);
  console.log(`   Reason         : ${reason}`);
  if (ai_explanation) {
    console.log(`   AI Explanation : ${ai_explanation}`);
  }
  console.log(`⌛ Submitting reviewTransaction on-chain to Sepolia...`);

  // Step C: Execute on-chain contract reviewTransaction
  const reviewTx = await contract.reviewTransaction(mockTxHash, isSuspicious, reason);
  console.log(`⏳ Sepolia Transaction Sent! Hash: ${reviewTx.hash}`);
  
  const receipt = await reviewTx.wait(1);
  console.log(`✅ Transaction confirmed in block #${receipt.blockNumber}`);

  // Step D: Construct Decision Record
  const decisionRecord = {
    txHash: mockTxHash,
    label: label,
    isSuspicious: isSuspicious,
    confidence: confidence,
    reason: reason,
    ai_explanation: ai_explanation || null,
    timestamp: new Date().toISOString(),
    sepoliaTxHash: reviewTx.hash,
    blockNumber: receipt.blockNumber,
    txFeatures: txFeatures
  };

  // Step E: Save to In-Memory History (Cap at 100)
  recentDecisions.unshift(decisionRecord);
  if (recentDecisions.length > 100) {
    recentDecisions.pop();
  }

  // Step F: Broadcast event over Socket.io to all connected frontend clients
  io.emit("newDecision", decisionRecord);
  console.log(`📢 Broadcasted decision over Socket.io ("newDecision")`);

  // Step G: Send Telegram Alert for Blocked Transactions (Non-blocking)
  if (isSuspicious) {
    sendTelegramAlert(decisionRecord).catch((err) => {
      console.error("❌ [Telegram Alert] Async error:", err.message);
    });
  }

  console.log(`🌐 Etherscan Explorer: https://sepolia.etherscan.io/tx/${reviewTx.hash}`);
  console.log("--------------------------------------------------\n");

  return decisionRecord;
}

// 3. Socket.io WebSockets Connection Event Handler
io.on("connection", (socket) => {
  console.log(`🔌 [WEBSOCKET] New client connected: ${socket.id}`);

  // Send current historical decisions upon fresh connection
  socket.emit("initialHistory", recentDecisions);

  socket.on("disconnect", () => {
    console.log(`🔌 [WEBSOCKET] Client disconnected: ${socket.id}`);
  });
});

// 4. REST API Endpoints

// GET /health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    contractAddress: CONTRACT_ADDRESS,
    oracleAddress: oracleAddress,
    walletAddress: wallet.address
  });
});

// GET /transactions
app.get("/transactions", (req, res) => {
  res.json(recentDecisions);
});

// POST /replay
app.post("/replay", async (req, res) => {
  const transactionsBatch = req.body;

  if (!Array.isArray(transactionsBatch) || transactionsBatch.length === 0) {
    return res.status(400).json({ error: "Request body must be a non-empty array of transaction feature objects" });
  }

  console.log(`\n==================================================`);
  console.log(`🚀 Starting Replay Batch Execution of ${transactionsBatch.length} Transactions...`);
  console.log(`==================================================`);

  const results = [];

  try {
    // Execute sequentially so Sepolia transaction nonces increment in order
    for (let i = 0; i < transactionsBatch.length; i++) {
      console.log(`\n▶ Processing batch item ${i + 1} of ${transactionsBatch.length}...`);
      const record = await processTransaction(transactionsBatch[i]);
      results.push(record);
    }

    console.log(`\n==================================================`);
    console.log(`🎉 Batch Replay Complete! Processed ${results.length} transactions.`);
    console.log(`==================================================\n`);

    res.json({
      success: true,
      processedCount: results.length,
      results: results
    });
  } catch (error) {
    console.error("❌ Error executing replay batch:", error);
    res.status(500).json({ error: error.message || "Failed to process replay batch" });
  }
});

// 5. Start Server & Query Contract Oracle State
server.listen(PORT, async () => {
  console.log("==================================================");
  console.log(`🛡️ CHAINMIND SENTINEL BACKEND SERVICE STARTED`);
  console.log("==================================================");
  console.log(`🚀 Server running on   : http://localhost:${PORT}`);
  console.log(`🔌 WebSockets Active on: ws://localhost:${PORT}`);
  console.log(`📍 Wallet Address     : ${wallet.address}`);
  console.log(`📌 Contract Address   : ${CONTRACT_ADDRESS}`);

  try {
    oracleAddress = await contract.oracle();
    console.log(`🔮 Contract Oracle    : ${oracleAddress}`);
    if (oracleAddress.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("✅ Wallet IS authorized as contract Oracle!");
    } else {
      console.warn("⚠️ Warning: Wallet is NOT the authorized oracle!");
    }
  } catch (err) {
    console.warn("⚠️ Could not verify contract oracle address:", err.message);
  }
  console.log("==================================================\n");
});
