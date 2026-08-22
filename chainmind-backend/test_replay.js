const demoAttacks = require("./demo_attacks");

async function runTest() {
  console.log("==================================================");
  console.log("🧪 TESTING CHAINMIND BACKEND REPLAY ENDPOINT");
  console.log("==================================================");
  console.log(`Sending ${demoAttacks.length} demo transactions to http://localhost:4000/replay...\n`);

  try {
    const response = await fetch("http://localhost:4000/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(demoAttacks)
    });

    const data = await response.json();

    console.log("==================================================");
    console.log("🎉 REPLAY TEST RESPONSE RECEIVED!");
    console.log("==================================================");
    console.log("Status Code    :", response.status);
    console.log("Processed Count:", data.processedCount);
    console.log("Success        :", data.success);
    console.log("--------------------------------------------------");

    if (data.results && data.results.length > 0) {
      data.results.forEach((res, idx) => {
        console.log(`\n[${idx + 1}/${data.results.length}] ${demoAttacks[idx].name}`);
        console.log(`  Verdict   : ${res.label.toUpperCase()}`);
        console.log(`  Confidence: ${res.confidence}`);
        console.log(`  Reason    : ${res.reason}`);
        console.log(`  Sepolia Tx: ${res.sepoliaTxHash}`);
      });
    }
    console.log("\n==================================================\n");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runTest();
