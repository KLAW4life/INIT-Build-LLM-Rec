import os
import argparse
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import google.genai as genai
import fitz  # PyMuPDF for PDFs
from dotenv import load_dotenv


# ---------- CONFIGURE GOOGLE AI ----------
load_dotenv()
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


# ---------- TEXT CLEANING ----------
def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).replace("\n", " ").replace("\r", " ").strip().lower()


# ---------- PDF EXTRACTION ----------
def extract_text_from_pdf(pdf_path):
    """Extract plain text from a PDF resume."""
    text = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text("text")
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
    return text.strip()


# ---------- GEMINI RECOMMENDER ----------
def gemini_recommend(resume_text, jobs_df):
    """Use Gemini to reason about why the matches are good."""
    job_texts = "\n\n".join(
        [
            f"Project {i+1}:\n"
            f"Type: {row['Type']}\n"
            f"Level: {row['Level']}\n"
            f"Description:\n{row.get('Responsibilities', '')}"
            for i, (_, row) in enumerate(jobs_df.iterrows())
        ]
    )

    prompt = f"""
You are an intelligent candidate–build matcher for FIU Students.

Resume:
{resume_text}

Build Projects:
{job_texts}

Task:
1. Identify the 3 projects that best match the student's resume.
2. Use ONLY provided Type and Level values.
3. For each project include:
   - Project number
   - Type
   - Level
   - Reason tied to resume skills, coursework, projects

Format:

1. Project [number] – [Type, Level]
   Reason: [...]
"""

    model_gemini = genai.GenerativeModel("gemini-2.5-flash")
    response = model_gemini.generate_content(prompt)
    return response.text


# ---------- CORE PIPELINE ----------
def compute_similarity_and_recommend(resume_text, jobs_df):
    print("🔹 Loading embedding model...")
    model = SentenceTransformer("intfloat/e5-small")

    print("🔹 Encoding resume and jobs...")
    resume_embedding = model.encode(
        [resume_text], convert_to_tensor=True, show_progress_bar=False
    )
    job_embeddings = model.encode(
        jobs_df["Responsibilities"].tolist(),
        convert_to_tensor=True,
        show_progress_bar=False
    )

    print("🔹 Calculating similarity...")
    scores = util.cos_sim(resume_embedding, job_embeddings)[0]

    # FIXED: convert tensor → numpy safely
    top_indices = np.argsort(-scores.cpu().numpy())[:3]

    top_jobs = jobs_df.iloc[top_indices].copy()
    top_jobs["similarity_score"] = [float(scores[i]) for i in top_indices]

    print("\n🔹 Top matches:")
    for _, row in top_jobs.iterrows():
        print(f"- {row['Type']} ({row['Level']}): {row['similarity_score']:.3f}")

    print("\n🔹 Calling Gemini...\n")
    output = gemini_recommend(resume_text, top_jobs)

    print("\n========== FINAL RECOMMENDATIONS ==========\n")
    print(output)
    print("\n===========================================\n")

    return output


# ---------- DATA LOADING ----------
def load_jobs(csv_path):
    jobs = pd.read_csv(csv_path)

    jobs.columns = jobs.columns.str.strip().str.lower()

    rename_map = {
        "type": "Type",
        "level": "Level",
        "tools": "Tools",
        "project description": "Project Description",
        "features": "Features",
        "responsibilities": "Responsibilities",
    }
    jobs.rename(columns=rename_map, inplace=True)

    if "Responsibilities" not in jobs.columns:
        jobs["Responsibilities"] = (
            jobs.get("Type", "").fillna("") + " " +
            jobs.get("Level", "").fillna("") + " " +
            jobs.get("Tools", "").fillna("") + " " +
            jobs.get("Project Description", "").fillna("") + " " +
            jobs.get("Features", "").fillna("")
        )

    jobs["Type"] = jobs.get("Type", "").fillna("Unspecified Type")
    jobs["Level"] = jobs.get("Level", "").fillna("Unspecified Level")
    jobs["Responsibilities"] = jobs["Responsibilities"].apply(clean_text)

    return jobs


# ---------- CLI ENTRY ----------
def run_cli():
    parser = argparse.ArgumentParser(description="Resume → Project Matcher (No Tkinter)")
    parser.add_argument("--resume", required=True, help="Path to resume PDF or TXT")
    parser.add_argument("--jobs", default="jobs_dataset.csv", help="Path to dataset CSV")

    args = parser.parse_args()

    resume_path = args.resume

    # ---------- READ RESUME ----------
    if resume_path.lower().endswith(".pdf"):
        resume_text = extract_text_from_pdf(resume_path)
    elif resume_path.lower().endswith(".txt"):
        with open(resume_path, "r", encoding="utf-8") as f:
            resume_text = f.read()
    else:
        print("❌ Unsupported file type. Use PDF or TXT.")
        return

    resume_text = clean_text(resume_text)

    if not resume_text:
        print("❌ Resume text is empty.")
        return

    # ---------- LOAD JOBS ----------
    try:
        jobs_df = load_jobs(args.jobs)
    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        return

    # ---------- RUN PIPELINE ----------
    compute_similarity_and_recommend(resume_text, jobs_df)


# ---------- MAIN ----------
if __name__ == "__main__":
    run_cli()
