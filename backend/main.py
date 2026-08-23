import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel


from models import SectionSuggestions, Portfolio
import llm_service

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up backend application")
    yield
    logger.info("Shutting down backend application")

app = FastAPI(title="SkillCred Portfolio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UploadResumeRequest(BaseModel):
    resume_text: str

class GeneratePortfolioRequest(BaseModel):
    resume_text: str
    sections: list[dict]

@app.post("/api/upload-resume", response_model=SectionSuggestions)
def api_upload_resume(req: UploadResumeRequest):
    """Endpoint to upload resume and get section suggestions."""
    if not req.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")
    try:
        return llm_service.suggest_sections(req.resume_text)
    except Exception as e:
        logger.error(f"Error in upload-resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-portfolio", response_model=dict)
def api_generate_portfolio(req: GeneratePortfolioRequest):
    """Endpoint to generate the complete portfolio based on selected sections."""
    if not req.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")
    if not req.sections:
        raise HTTPException(status_code=400, detail="Must provide at least one selected section.")
    try:
        portfolio = llm_service.generate_portfolio(req.resume_text, req.sections)
        response_data = {"portfolio": portfolio.model_dump()}
        
        return response_data
    except Exception as e:
        logger.error(f"Error in generate-portfolio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

