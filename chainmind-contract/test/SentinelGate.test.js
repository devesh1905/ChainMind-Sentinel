const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SentinelGate Smart Contract", function () {
  let sentinelGate;
  let owner;
  let oracle;
  let user1;
  let user2;

  const sampleTxHash1 = ethers.keccak256(ethers.toUtf8Bytes("tx_hash_sample_1"));
  const sampleTxHash2 = ethers.keccak256(ethers.toUtf8Bytes("tx_hash_sample_2"));

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    const SentinelGateFactory = await ethers.getContractFactory("SentinelGate");
    sentinelGate = await SentinelGateFactory.deploy();
    await sentinelGate.waitForDeployment();
  });

  describe("Deployment & Access Control Initialization", function () {
    it("Should set the deployer as owner and default oracle", async function () {
      expect(await sentinelGate.owner()).to.equal(owner.address);
      expect(await sentinelGate.oracle()).to.equal(owner.address);
    });
  });

  describe("setOracle", function () {
    it("Should allow the owner to update the oracle address", async function () {
      await expect(sentinelGate.setOracle(oracle.address))
        .to.emit(sentinelGate, "OracleUpdated")
        .withArgs(owner.address, oracle.address);

      expect(await sentinelGate.oracle()).to.equal(oracle.address);
    });

    it("Should revert if non-owner tries to update the oracle address", async function () {
      await expect(
        sentinelGate.connect(user1).setOracle(oracle.address)
      ).to.be.revertedWith("SentinelGate: caller is not the owner");
    });

    it("Should revert if owner tries to set oracle to zero address", async function () {
      await expect(
        sentinelGate.setOracle(ethers.ZeroAddress)
      ).to.be.revertedWith("SentinelGate: oracle address cannot be zero address");
    });
  });

  describe("reviewTransaction", function () {
    beforeEach(async function () {
      // Set oracle to dedicated oracle account
      await sentinelGate.setOracle(oracle.address);
    });

    it("Should allow authorized oracle to review and approve a transaction", async function () {
      const reason = "Transaction normal and verified";
      
      const tx = await sentinelGate.connect(oracle).reviewTransaction(sampleTxHash1, false, reason);
      const receipt = await tx.wait();
      
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(sentinelGate, "TransactionApproved")
        .withArgs(sampleTxHash1, block.timestamp);
    });

    it("Should allow authorized oracle to review and block a suspicious transaction", async function () {
      const reason = "High anomaly score detected: flashloan pattern";

      const tx = await sentinelGate.connect(oracle).reviewTransaction(sampleTxHash2, true, reason);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(sentinelGate, "TransactionBlocked")
        .withArgs(sampleTxHash2, reason, block.timestamp);
    });

    it("Should revert if an unauthorized address attempts to call reviewTransaction", async function () {
      await expect(
        sentinelGate.connect(user1).reviewTransaction(sampleTxHash1, true, "Hacker attempt")
      ).to.be.revertedWith("SentinelGate: caller is not the oracle");
    });
  });

  describe("getDecision", function () {
    beforeEach(async function () {
      await sentinelGate.setOracle(oracle.address);
    });

    it("Should return correct stored decision data for approved transaction", async function () {
      const reason = "Approved by AI Triage Engine";
      await sentinelGate.connect(oracle).reviewTransaction(sampleTxHash1, false, reason);

      const [isSuspicious, storedReason, timestamp] = await sentinelGate.getDecision(sampleTxHash1);
      
      expect(isSuspicious).to.be.false;
      expect(storedReason).to.equal(reason);
      expect(timestamp).to.be.greaterThan(0);
    });

    it("Should return correct stored decision data for blocked transaction", async function () {
      const reason = "Blocked: Reentrancy threat";
      await sentinelGate.connect(oracle).reviewTransaction(sampleTxHash2, true, reason);

      const [isSuspicious, storedReason, timestamp] = await sentinelGate.getDecision(sampleTxHash2);

      expect(isSuspicious).to.be.true;
      expect(storedReason).to.equal(reason);
      expect(timestamp).to.be.greaterThan(0);
    });

    it("Should revert when querying getDecision for an unreviewed transaction", async function () {
      const unreviewedTxHash = ethers.keccak256(ethers.toUtf8Bytes("unreviewed_tx"));
      await expect(
        sentinelGate.getDecision(unreviewedTxHash)
      ).to.be.revertedWith("SentinelGate: transaction has not been reviewed");
    });
  });
});
