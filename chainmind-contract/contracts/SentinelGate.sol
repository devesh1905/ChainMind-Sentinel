// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract SentinelGate {
    // State variables for access control
    address public owner;
    address public oracle;

    // Struct to store decision metadata on-chain
    struct Decision {
        bool isSuspicious;
        string reason;
        uint256 timestamp;
        bool exists;
    }

    // Mapping from transaction hash to the stored decision (on-chain audit trail)
    mapping(bytes32 => Decision) private decisions;

    // Events
    event TransactionBlocked(bytes32 indexed txHash, string reason, uint256 timestamp);
    event TransactionApproved(bytes32 indexed txHash, uint256 timestamp);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // Access control modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "SentinelGate: caller is not the owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "SentinelGate: caller is not the oracle");
        _;
    }

    // Constructor sets the initial owner and defaults the oracle to the owner's address
    constructor() {
        owner = msg.sender;
        oracle = msg.sender; // Defaulting oracle to the deployer for testing convenience
    }

    /**
     * @notice Transfer contract ownership to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SentinelGate: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Update the authorized oracle address.
     * @param newOracle The address of the new oracle.
     */
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "SentinelGate: oracle address cannot be zero address");
        emit OracleUpdated(oracle, newOracle);
        oracle = newOracle;
    }

    /**
     * @notice Review and record the security status of a transaction.
     * @param txHash The transaction hash being reviewed.
     * @param isSuspicious True if transaction is flagged as suspicious, false if approved.
     * @param reason Explanatory reason/details for the decision.
     */
    function reviewTransaction(
        bytes32 txHash, 
        bool isSuspicious, 
        string calldata reason
    ) external onlyOracle {
        require(txHash != bytes32(0), "SentinelGate: invalid txHash");
        
        // Store decision metadata in mapping
        decisions[txHash] = Decision({
            isSuspicious: isSuspicious,
            reason: reason,
            timestamp: block.timestamp,
            exists: true
        });

        // Emit corresponding event for real-time frontend/dashboard listening
        if (isSuspicious) {
            emit TransactionBlocked(txHash, reason, block.timestamp);
        } else {
            emit TransactionApproved(txHash, block.timestamp);
        }
    }

    /**
     * @notice Retrieve the security decision audit log for a given transaction hash.
     * @param txHash The transaction hash to query.
     * @return isSuspicious Whether the transaction was flagged as suspicious.
     * @return reason The reason provided for the classification.
     * @return timestamp The block timestamp when the review was recorded.
     */
    function getDecision(bytes32 txHash) 
        external 
        view 
        returns (
            bool isSuspicious, 
            string memory reason, 
            uint256 timestamp
        ) 
    {
        Decision memory dec = decisions[txHash];
        require(dec.exists, "SentinelGate: transaction has not been reviewed");
        return (dec.isSuspicious, dec.reason, dec.timestamp);
    }
}
