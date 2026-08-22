const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("----------------------------------------------------");
  console.log("🚀 Starting SentinelGate deployment process...");
  console.log("----------------------------------------------------");

  const oracleAddress = process.env.PUBLIC_ADDRESS;
  if (!oracleAddress) {
    throw new Error("❌ PUBLIC_ADDRESS is missing in .env file");
  }

  // 1. Get the Deployer Signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📍 Deployer Wallet Address: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${hre.ethers.formatEther(balance)} ETH`);

  // 2. Deploy SentinelGate contract
  console.log("\n📦 Deploying SentinelGate contract to Sepolia testnet...");
  const SentinelGateFactory = await hre.ethers.getContractFactory("SentinelGate");
  const sentinelGate = await SentinelGateFactory.deploy();

  const deployTx = sentinelGate.deploymentTransaction();
  console.log(`⏳ Deployment Transaction Hash: ${deployTx.hash}`);
  
  // Wait for 1 block confirmation
  const receipt = await deployTx.wait(1);
  const contractAddress = receipt.contractAddress;

  console.log("----------------------------------------------------");
  console.log(`✅ SentinelGate successfully deployed!`);
  console.log(`📌 Contract Address: ${contractAddress}`);
  console.log(`🌐 Sepolia Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("----------------------------------------------------");

  // 3. Set the Oracle address to PUBLIC_ADDRESS
  console.log(`\n🔮 Setting Oracle address to: ${oracleAddress}...`);
  const setOracleTx = await sentinelGate.setOracle(oracleAddress);
  console.log(`⏳ setOracle Transaction Hash: ${setOracleTx.hash}`);
  await setOracleTx.wait(1);
  console.log(`✅ Oracle address successfully set to: ${oracleAddress}`);

  // 4. Export Artifact / ABI to /shared directory for team sharing
  console.log("\n📁 Exporting contract ABI artifact to /shared folder...");
  const sharedDir = path.join(__dirname, "..", "shared");
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "SentinelGate.sol",
    "SentinelGate.json"
  );

  if (fs.existsSync(artifactPath)) {
    const artifactContent = fs.readFileSync(artifactPath, "utf8");
    const sharedArtifactPath = path.join(sharedDir, "SentinelGate.json");
    fs.writeFileSync(sharedArtifactPath, artifactContent, "utf8");
    console.log(`📄 Saved ABI Artifact to: ${sharedArtifactPath}`);
  } else {
    console.warn("⚠️ Could not find compiled artifact at:", artifactPath);
  }

  console.log("\n🎉 Deployment and setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed with error:", error);
    process.exit(1);
  });
