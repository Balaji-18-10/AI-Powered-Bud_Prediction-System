import os
import pandas as pd
from sklearn.datasets import fetch_openml

def download_and_save_dataset():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    target_csv = os.path.join(current_dir, "jm1.csv")

    print(f"Fetching NASA MDP JM1 defect dataset from OpenML (data_id 1053)...")
    dataset = fetch_openml("jm1", version=1, as_frame=True)
    df = dataset.frame.copy()

    # Save raw CSV
    df.to_csv(target_csv, index=False)
    print(f"Saved dataset to {target_csv}")
    print(f"Total instances: {len(df)}")
    print(f"Columns: {list(df.columns)}")

    # Print empirical statistics
    duplicates = df.duplicated().sum()
    unique_rows = len(df) - duplicates
    print(f"Exact duplicate rows: {duplicates}")
    print(f"Unique instances: {unique_rows}")
    print(f"Target distribution:\n{df['defects'].value_counts()}")

if __name__ == "__main__":
    download_and_save_dataset()
