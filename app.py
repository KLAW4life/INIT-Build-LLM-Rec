# app.py
import streamlit as st
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
from google import genai
import fitz  
# from pymupdf import fitz
from dotenv import load_dotenv
import tempfile
import os

# Load environment variables
load_dotenv()

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# ---------- TEXT CLEANING ----------
def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).replace("\n", " ").replace("\r", " ").strip().lower()

# ---------- PDF EXTRACTION ----------
def extract_text_from_pdf(uploaded_file):
    """Extract plain text from uploaded PDF resume."""
    text = ""
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(uploaded_file.getvalue())
            tmp_path = tmp_file.name
        
        # Extract text
        with fitz.open(tmp_path) as doc:
            for page in doc:
                text += page.get_text("text")
        
        # Clean up
        os.unlink(tmp_path)
    except Exception as e:
        st.error(f"Error reading PDF: {e}")
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

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        st.error(f"Gemini API error: {e}")
        return "Unable to generate recommendations at this time."

# ---------- SIMILARITY CALCULATION ----------
@st.cache_resource
def load_model():
    """Load the embedding model (cached)."""
    with st.spinner("Loading AI model..."):
        return SentenceTransformer("intfloat/e5-small")

def compute_similarity(resume_text, jobs_df, model):
    """Compute similarity scores and return top 3 jobs."""
    # Encode resume and jobs
    resume_embedding = model.encode(
        [resume_text], convert_to_tensor=True, show_progress_bar=False
    )
    job_embeddings = model.encode(
        jobs_df["Responsibilities"].tolist(),
        convert_to_tensor=True,
        show_progress_bar=False
    )
    
    # Calculate similarity
    scores = util.cos_sim(resume_embedding, job_embeddings)[0]
    
    # Get top 3 indices
    top_indices = np.argsort(-scores.cpu().numpy())[:3]
    
    top_jobs = jobs_df.iloc[top_indices].copy()
    top_jobs["similarity_score"] = [float(scores[i]) for i in top_indices]
    
    return top_jobs

# ---------- DATA LOADING ----------
@st.cache_data
def load_jobs(csv_path="jobs_dataset.csv"):
    """Load and preprocess jobs dataset."""
    try:
        jobs = pd.read_csv(csv_path)
        
        # Clean column names
        jobs.columns = jobs.columns.str.strip().str.lower()
        
        # Rename columns
        rename_map = {
            "type": "Type",
            "level": "Level",
            "tools": "Tools",
            "project description": "Project Description",
            "features": "Features",
            "responsibilities": "Responsibilities",
        }
        jobs.rename(columns=rename_map, inplace=True)
        
        # Create Responsibilities field if missing
        if "Responsibilities" not in jobs.columns:
            jobs["Responsibilities"] = (
                jobs.get("Type", "").fillna("") + " " +
                jobs.get("Level", "").fillna("") + " " +
                jobs.get("Tools", "").fillna("") + " " +
                jobs.get("Project Description", "").fillna("") + " " +
                jobs.get("Features", "").fillna("")
            )
        
        # Fill missing values
        jobs["Type"] = jobs.get("Type", "").fillna("Unspecified Type")
        jobs["Level"] = jobs.get("Level", "").fillna("Unspecified Level")
        jobs["Responsibilities"] = jobs["Responsibilities"].apply(clean_text)
        
        return jobs
    except FileNotFoundError:
        st.error(f"CSV file not found at {csv_path}")
        return None
    except Exception as e:
        st.error(f"Error loading dataset: {e}")
        return None

# ---------- STREAMLIT UI ----------
def main():
    st.set_page_config(
        page_title="Job Project Matcher",
        page_icon="💼",
        layout="wide"
    )
    
    st.title("💼 Resume to Project Matcher")
    st.markdown("Upload your resume (PDF) and get personalized project recommendations")
    
    # Initialize session state
    if 'resume_text' not in st.session_state:
        st.session_state.resume_text = None
    if 'processing' not in st.session_state:
        st.session_state.processing = False
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Configuration")
        csv_path = st.text_input("Dataset path", value="jobs_dataset.csv")
        
        st.markdown("---")
        st.markdown("### How it works")
        st.markdown("""
        1. Upload your resume (PDF)
        2. The system extracts text from your PDF
        3. We match your skills with available projects
        4. AI generates personalized recommendations
        """)
        
        if st.button("🔄 Reload Dataset"):
            st.cache_data.clear()
            st.cache_resource.clear()
            st.success("Dataset and models reloaded!")
    
    # Main content
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("📄 Upload Resume")
        uploaded_file = st.file_uploader(
            "Choose a PDF file",
            type=['pdf'],
            help="Upload your resume in PDF format",
            key="resume_uploader"
        )
        
        if uploaded_file is not None:
            # Check if file changed
            if st.session_state.get('last_uploaded_file') != uploaded_file.name:
                st.session_state.last_uploaded_file = uploaded_file.name
                st.session_state.resume_text = None
                
                with st.spinner("Extracting text from PDF..."):
                    st.session_state.resume_text = extract_text_from_pdf(uploaded_file)
                
                if st.session_state.resume_text:
                    st.success(f"✅ Extracted {len(st.session_state.resume_text)} characters")
                    
                    # Show preview
                    with st.expander("Preview extracted text"):
                        preview = st.session_state.resume_text[:500]
                        if len(st.session_state.resume_text) > 500:
                            preview += "..."
                        st.text(preview)
                else:
                    st.error("Could not extract text from PDF. Please check the file format.")
    
    # Process when both file and dataset are ready
    if st.session_state.resume_text:
        with col2:
            st.subheader("🔍 Loading Dataset")
            jobs_df = load_jobs(csv_path)
            
            if jobs_df is not None:
                st.success(f"✅ Loaded {len(jobs_df)} projects")
                
                # Process button
                if st.button("🎯 Find Matching Projects", type="primary", key="process_btn"):
                    st.session_state.processing = True
                    
                    try:
                        # Load model
                        model = load_model()
                        
                        # Compute similarity
                        with st.spinner("Computing similarity scores..."):
                            top_jobs = compute_similarity(st.session_state.resume_text, jobs_df, model)
                        
                        # Display similarity scores
                        st.subheader("📊 Top 3 Matches (by similarity)")
                        match_cols = st.columns(3)
                        for idx, (_, row) in enumerate(top_jobs.iterrows()):
                            score = row['similarity_score']
                            with match_cols[idx]:
                                st.metric(
                                    label=f"{row['Type']}",
                                    value=f"{score:.1%}",
                                    delta=f"Level: {row['Level']}"
                                )
                        
                        # Get Gemini recommendations
                        with st.spinner("Generating AI recommendations..."):
                            recommendations = gemini_recommend(st.session_state.resume_text, top_jobs)
                        
                        # Display results
                        st.markdown("---")
                        st.subheader("🤖 AI Recommendations")
                        st.markdown(recommendations)
                        
                        # Optional: Display detailed job info
                        with st.expander("📋 View detailed project information"):
                            for idx, row in top_jobs.iterrows():
                                st.markdown(f"### Project {idx+1}")
                                st.markdown(f"**Type:** {row['Type']}")
                                st.markdown(f"**Level:** {row['Level']}")
                                st.markdown(f"**Similarity Score:** {row['similarity_score']:.1%}")
                                st.markdown("**Description:**")
                                desc = row['Responsibilities']
                                if len(desc) > 500:
                                    desc = desc[:500] + "..."
                                st.markdown(desc)
                                st.markdown("---")
                        
                        st.session_state.processing = False
                        
                    except Exception as e:
                        st.error(f"An error occurred: {str(e)}")
                        st.session_state.processing = False

if __name__ == "__main__":
    main()