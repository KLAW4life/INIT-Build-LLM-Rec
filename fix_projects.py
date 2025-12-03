import pandas as pd

# Try multiple encodings safely
try:
    df = pd.read_csv("buildprojects.csv", encoding="utf-8")
except UnicodeDecodeError:
    df = pd.read_csv("buildprojects.csv", encoding="latin-1")  # works for Windows/Excel files

# Combine descriptive columns
df["Responsibilities"] = (
    df["Type"].fillna('') + " " +
    df["Level"].fillna('') + " " +
    df["Tools"].fillna('') + " " +
    df["Project Description"].fillna('') + " " +
    df["Features"].fillna('')
)

# Clean and normalize text
df["Responsibilities"] = (
    df["Responsibilities"]
    .astype(str)
    .str.replace("\n", " ", regex=False)
    .str.replace("\r", " ", regex=False)
    .str.strip()
    .str.lower()
)

# Save cleaned dataset
df.to_csv("jobs_dataset.csv", index=False, encoding="utf-8")
print("✅ job_dataset.csv created successfully and ready for the recommender!")
print(df[["ID", "Type", "Level", "Responsibilities"]].head(2))
