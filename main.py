# ---------- Imports ----------
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# ---------- CONFIGURE GOOGLE AI STUDIO ----------
os.getenv('GOOGLE_API_KEY')
# os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

base_path = os.path.dirname(os.path.abspath(__file__))  # path of the current script
resume_path = os.path.join(base_path, "resume_dataset.csv")
job_path = os.path.join(base_path, "job_dataset.csv")

# ---------- LOAD DATA ----------
resumes = pd.read_csv(resume_path)
jobs = pd.read_csv(job_path)

def clean_text(text):
    if pd.isna(text):
        return ""
    return text.replace('\n', ' ').strip().lower()

resumes['Resume'] = resumes['Resume'].apply(clean_text)
jobs['Responsibilities'] = jobs['Responsibilities'].apply(clean_text)

# ---------- LOAD EMBEDDING MODEL ----------
print("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# ---------- USER RESUME INPUT ----------
with open("resume.txt", "r", encoding="utf-8") as f:
    resume_text = f.read()

resume_text = clean_text(resume_text)

# ---------- ENCODE RESUME AND JOBS ----------
print("Encoding data...")
resume_embedding = model.encode([resume_text], convert_to_tensor=True)
job_embeddings = model.encode(jobs['Responsibilities'].tolist(), convert_to_tensor=True)

# ---------- CALCULATE SIMILARITIES ----------
scores = util.cos_sim(resume_embedding, job_embeddings)[0]
top_indices = np.argsort(-scores.cpu())[:5]
top_jobs = jobs.iloc[top_indices]

# ---------- GEMINI RECOMMENDER ----------
def gemini_recommend(resume_text, jobs_df):
    job_texts = "\n\n".join(
        [f"Job {i+1}: {row['Responsibilities']}" for i, (_, row) in enumerate(jobs_df.iterrows())]
    )

    prompt = f"""
    You are an intelligent career assistant.
    Below is a candidate's resume followed by a few job descriptions.

    Resume:
    {resume_text}

    Jobs:
    {job_texts}

    Task:
    1. Identify the 3 jobs that best fit the candidate based on experience and skills.
    2. Explain briefly why each job is a good match.
    3. Output your response as a numbered list.
    """

    model_gemini = genai.GenerativeModel("gemini-1.5-flash")
    response = model_gemini.generate_content(prompt)
    return response.text

# ---------- GENERATE RECOMMENDATIONS ----------
print("Generating recommendations with Gemini...")
recommendations = gemini_recommend(resume_text, top_jobs)

print("\n========== RECOMMENDED JOBS ==========\n")
print(recommendations)
print("\n======================================")
