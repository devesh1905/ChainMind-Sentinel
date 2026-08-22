export const demoAttacks = [
  {
    name: "Normal Payment Transfer",
    value_eth: 1.5,
    gas_price_gwei: 25.0,
    gas_used: 21000,
    from_address_age_days: 450,
    to_contract_age_days: 800,
    tx_frequency_last_hour: 2,
    is_flash_loan_pattern: 0
  },
  {
    name: "Flash Loan Arbitrage Exploit",
    value_eth: 3500.0,
    gas_price_gwei: 280.0,
    gas_used: 1850000,
    from_address_age_days: 2,
    to_contract_age_days: 1,
    tx_frequency_last_hour: 85,
    is_flash_loan_pattern: 1
  },
  {
    name: "Normal DEX Swap (Uniswap)",
    value_eth: 5.2,
    gas_price_gwei: 32.5,
    gas_used: 145000,
    from_address_age_days: 210,
    to_contract_age_days: 1100,
    tx_frequency_last_hour: 3,
    is_flash_loan_pattern: 0
  },
  {
    name: "Reentrancy Vault Drain",
    value_eth: 1200.0,
    gas_price_gwei: 195.0,
    gas_used: 2100000,
    from_address_age_days: 4,
    to_contract_age_days: 3,
    tx_frequency_last_hour: 60,
    is_flash_loan_pattern: 1
  },
  {
    name: "Frontrunning Bot Attack",
    value_eth: 850.0,
    gas_price_gwei: 340.0,
    gas_used: 920000,
    from_address_age_days: 1,
    to_contract_age_days: 2,
    tx_frequency_last_hour: 110,
    is_flash_loan_pattern: 1
  },
  {
    name: "Newly Deployed Exploit Contract",
    value_eth: 2900.0,
    gas_price_gwei: 210.0,
    gas_used: 1600000,
    from_address_age_days: 0,
    to_contract_age_days: 0,
    tx_frequency_last_hour: 95,
    is_flash_loan_pattern: 1
  }
];
