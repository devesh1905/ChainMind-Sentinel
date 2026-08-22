import csv
import os
import random

def generate_synthetic_data(num_samples=500, random_seed=42):
    random.seed(random_seed)
    
    num_attacks = int(num_samples * 0.15)  # ~75 samples (15%)
    num_normals = num_samples - num_attacks  # 425 samples (85%)
    
    records = []
    
    # 1. Generate Normal Transactions (label = 0)
    for _ in range(num_normals):
        # 5% chance of slight noise/outlier in normal behavior
        is_noisy = random.random() < 0.05
        
        value_eth = round(random.uniform(0.01, 15.0) if not is_noisy else random.uniform(15.0, 50.0), 4)
        gas_price_gwei = round(random.uniform(10.0, 45.0) if not is_noisy else random.uniform(45.0, 75.0), 2)
        gas_used = random.randint(21000, 250000)
        from_address_age_days = random.randint(30, 1200) if not is_noisy else random.randint(5, 30)
        to_contract_age_days = random.randint(30, 1500) if not is_noisy else random.randint(10, 30)
        tx_frequency_last_hour = random.randint(1, 5) if not is_noisy else random.randint(6, 12)
        is_flash_loan_pattern = 0 if random.random() > 0.02 else 1
        
        records.append({
            "value_eth": value_eth,
            "gas_price_gwei": gas_price_gwei,
            "gas_used": gas_used,
            "from_address_age_days": from_address_age_days,
            "to_contract_age_days": to_contract_age_days,
            "tx_frequency_last_hour": tx_frequency_last_hour,
            "is_flash_loan_pattern": is_flash_loan_pattern,
            "label": 0
        })
        
    # 2. Generate Attack Transactions (label = 1)
    for _ in range(num_attacks):
        # 5% chance of slight noise/variation in attack pattern
        is_noisy = random.random() < 0.05
        
        value_eth = round(random.uniform(100.0, 5000.0) if not is_noisy else random.uniform(40.0, 100.0), 4)
        gas_price_gwei = round(random.uniform(80.0, 350.0) if not is_noisy else random.uniform(50.0, 80.0), 2)
        gas_used = random.randint(300000, 2500000)
        from_address_age_days = random.randint(0, 15) if not is_noisy else random.randint(15, 60)
        to_contract_age_days = random.randint(0, 7) if not is_noisy else random.randint(7, 25)
        tx_frequency_last_hour = random.randint(15, 120) if not is_noisy else random.randint(8, 15)
        is_flash_loan_pattern = 1 if random.random() > 0.05 else 0
        
        records.append({
            "value_eth": value_eth,
            "gas_price_gwei": gas_price_gwei,
            "gas_used": gas_used,
            "from_address_age_days": from_address_age_days,
            "to_contract_age_days": to_contract_age_days,
            "tx_frequency_last_hour": tx_frequency_last_hour,
            "is_flash_loan_pattern": is_flash_loan_pattern,
            "label": 1
        })
        
    # Shuffle records so normal and attack data are mixed
    random.shuffle(records)
    
    # Create data directory if it doesn't exist
    output_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, "synthetic_transactions.csv")
    
    fieldnames = [
        "value_eth",
        "gas_price_gwei",
        "gas_used",
        "from_address_age_days",
        "to_contract_age_days",
        "tx_frequency_last_hour",
        "is_flash_loan_pattern",
        "label"
    ]
    
    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
        
    # Calculate Summary Statistics
    total_count = len(records)
    normal_count = sum(1 for r in records if r["label"] == 0)
    attack_count = sum(1 for r in records if r["label"] == 1)
    normal_pct = (normal_count / total_count) * 100
    attack_pct = (attack_count / total_count) * 100
    
    print("=" * 60)
    print("SYNTHETIC ETHEREUM TRANSACTION DATASET SUMMARY")
    print("=" * 60)
    print(f"Output File        : {output_file}")
    print(f"Total Records     : {total_count}")
    print(f"Normal (Label 0)   : {normal_count} ({normal_pct:.1f}%)")
    print(f"Attack (Label 1)   : {attack_count} ({attack_pct:.1f}%)")
    print("=" * 60)
    print("Dataset generation completed successfully!\n")

if __name__ == "__main__":
    generate_synthetic_data()
