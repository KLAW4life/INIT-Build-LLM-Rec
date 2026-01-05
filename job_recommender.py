# ---------- IMPORTS ----------
import os
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import google.generativeai as genai
import fitz  # PyMuPDF for PDFs
import tkinter as tk
from tkinter import filedialog, messagebox
from dotenv import load_dotenv


# ---------- CONFIGURE GOOGLE AI ----------``
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


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
    You are given an FIU student's resume and a list of build projects,
    each with a specified Type and Level.

    Resume:
    {resume_text}

    Build Projects:
    {job_texts}

    Task:
    1. Identify the 3 projects from the list that best align with this student's resume.
    2. Use the exact "Type" and "Level" values provided for each project (do not invent new ones).
    3. For each selected project, include:
       - Project number
       - Type (as listed)
       - Level (as listed)
       - A justification explaining *why* the student's skills, experiences, and projects make them a strong fit.
         Reference relevant coursework, programming languages, and leadership roles from the resume.
    4. Output your answer as a numbered list in this format:

    1. Project [number] – [Type, Level]
       Reason: [brief justification referencing the resume]
    """

    model_gemini = genai.GenerativeModel("gemini-2.5-flash")
    response = model_gemini.generate_content(prompt)
    return response.text


# ---------- CORE MATCHING PIPELINE ----------
def compute_similarity_and_recommend(resume_text, jobs_df):
    """Compute similarity, select top matches, then use Gemini to justify them."""
    print("🔹 Loading embedding model...")
    # model = SentenceTransformer("all-MiniLM-L6-v2")
    model = SentenceTransformer("intfloat/e5-small")

    print("🔹 Encoding resume and job descriptions...")
    resume_embedding = model.encode([resume_text], convert_to_tensor=True, show_progress_bar=False)
    job_embeddings = model.encode(jobs_df["Responsibilities"].tolist(), convert_to_tensor=True, show_progress_bar=False)

    print("🔹 Calculating cosine similarity scores...")
    scores = util.cos_sim(resume_embedding, job_embeddings)[0]

    # Pick top 3 highest matches
    top_indices = np.argsort(-scores.cpu())[:3]
    top_jobs = jobs_df.iloc[top_indices].copy()
    top_jobs["similarity_score"] = [float(scores[idx]) for idx in top_indices]

    print("\n🔹 Top 3 matches based on similarity:")
    for i, row in top_jobs.iterrows():
        print(f"   - {row['Type']} ({row['Level']}): {row['similarity_score']:.3f}")

    print("\n🔹 Generating Gemini-based recommendations...\n")
    output = gemini_recommend(resume_text, top_jobs)

    print("\n========== FINAL RECOMMENDED PROJECTS ==========\n")
    print(output)
    print("\n===============================================\n")

    messagebox.showinfo("Recommendations Generated", "Check your terminal for detailed recommendations.")
    return output


# ---------- GUI FILE PICKER ----------
def pick_resume_and_run():
    root = tk.Tk()
    root.withdraw()

    messagebox.showinfo("Resume Selection", "Please select your resume file (PDF or TXT).")
    resume_path = filedialog.askopenfilename(
        title="Select Resume",
        filetypes=[("Resume files", "*.pdf *.txt")]
    )

    if not resume_path:
        messagebox.showwarning("No file selected", "No resume file was chosen. Exiting.")
        return

    # Extract text
    if resume_path.lower().endswith(".pdf"):
        resume_text = extract_text_from_pdf(resume_path)
    elif resume_path.lower().endswith(".txt"):
        with open(resume_path, "r", encoding="utf-8") as f:
            resume_text = f.read()
    else:
        messagebox.showerror("Invalid file", "Unsupported file type. Please use a PDF or TXT.")
        return

    resume_text = clean_text(resume_text)
    if not resume_text:
        messagebox.showerror("Empty Resume", "Could not extract text from the selected resume.")
        return

    # ---------- LOAD JOB DATA ----------
    try:
        jobs = pd.read_csv("jobs_dataset.csv")

        # Normalize column names
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

        # Combine columns into Responsibilities if missing
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

    except Exception as e:
        messagebox.showerror("Dataset Error", f"Error loading job dataset: {e}")
        return

    # ---------- RUN SIMILARITY + GEMINI ----------
    compute_similarity_and_recommend(resume_text, jobs)


# ---------- ENTRY POINT ----------
if __name__ == "__main__":
    pick_resume_and_run()
