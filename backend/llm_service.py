import json
import logging
from typing import Optional
from openai import OpenAI
from pydantic import ValidationError
import os
from dotenv import load_dotenv


from models import SectionSuggestions, Portfolio
from prompts import build_suggest_sections_prompt, build_generate_portfolio_prompt

load_dotenv()
logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url=os.getenv("GROQ_BASE_URL")
)

MAX_RETRIES=4

def suggest_sections(resume_text: str) -> SectionSuggestions:
    """Analyze resume text and suggest portfolio sections."""
    global last_prompt, last_raw_response, last_validated_result
    
    messages = build_suggest_sections_prompt(resume_text)
    last_prompt = messages
    
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Calling LLM for suggest_sections (attempt {attempt + 1})")
            response = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL"),
                messages=messages,
                response_format={"type": "json_object"}
            )
            raw_content = response.choices[0].message.content
            last_raw_response = raw_content
            
            parsed_json = json.loads(raw_content)
            result = SectionSuggestions.model_validate(parsed_json)
            last_validated_result = result.model_dump()
            return result
            
        except (ValidationError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to parse or validate LLM response: {e}")
            messages.append({"role": "assistant", "content": raw_content})
            messages.append({"role": "user", "content": f"Failed to validate response. Error: {e}. Please fix and return ONLY valid JSON."})
            
    raise ValueError("Failed to get valid section suggestions from LLM after multiple retries.")


def generate_portfolio(resume_text: str, selected_sections: list[dict]) -> Portfolio:
    """Generate the complete portfolio data from resume and selected sections."""
    global last_prompt, last_raw_response, last_validated_result
    
    
    messages = build_generate_portfolio_prompt(resume_text, selected_sections)
    last_prompt = messages
    
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Calling LLM for generate_portfolio (attempt {attempt + 1})")
            response = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL"),
                messages=messages,
                response_format={"type": "json_object"}
            )
            raw_content = response.choices[0].message.content
            last_raw_response = raw_content
            
            parsed_json = json.loads(raw_content)
            result = Portfolio.model_validate(parsed_json)
            last_validated_result = result.model_dump()
            return result
            
        except (ValidationError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to parse or validate LLM response: {e}")
            messages.append({"role": "assistant", "content": raw_content})
            messages.append({"role": "user", "content": f"Failed to validate response. Error: {e}. Please fix and return ONLY valid JSON matching the exact schema."})
            
    raise ValueError("Failed to get valid portfolio data from LLM after multiple retries.")
