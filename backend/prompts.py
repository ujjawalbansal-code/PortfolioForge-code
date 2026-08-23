import json
from section_catalog import PRE_BUILT_SECTIONS
from models import Portfolio


def build_suggest_sections_prompt(resume_text: str) -> list[dict]:
    """Build the prompt messages for suggesting sections based on resume text."""
    catalog_json = json.dumps(PRE_BUILT_SECTIONS, indent=2)

    system_msg = (
        "You are an expert technical resume parser and portfolio strategist.\n"
        "Your task is to analyze the provided resume text and suggest the best sections for a digital portfolio.\n\n"
        f"Here are the pre-built sections available:\n{catalog_json}\n\n"
        "Suggest sections that are applicable based on the resume. You may also suggest custom sections "
        "if there is relevant data (e.g., Publications, Volunteering).\n"
        "Respond ONLY with a JSON object that matches the following schema:\n"
        '{\n'
        '  "sections": [\n'
        '    {\n'
        '      "id": "section_id",\n'
        '      "name": "Section Name",\n'
        '      "description": "Why this section is suggested",\n'
        '      "is_prebuilt": true\n'
        '    }\n'
        '  ]\n'
        '}'
    )
    user_msg = f"Resume text:\n\n{resume_text}"
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


def build_generate_portfolio_prompt(resume_text: str, selected_sections: list[dict]) -> list[dict]:
    """Build the prompt messages for generating the final structured portfolio."""
    schema = Portfolio.model_json_schema()
    sections_json = json.dumps(selected_sections, indent=2)
    schema_json = json.dumps(schema, indent=2)

    system_msg = (
        "You are an expert portfolio content generator.\n"
        "Your task is to extract information from the provided resume text and generate a complete, "
        "structured portfolio JSON based on the sections the user has selected.\n\n"
        f"Selected sections:\n{sections_json}\n\n"
        "IMPORTANT INSTRUCTIONS:\n"
        "- Generate ONLY valid JSON matching the schema below.\n"
        "- Do not fabricate information. Only use facts present in the resume.\n"
        "- For SocialsSection, if the resume doesn't have a URL for a platform, "
        "use 'PLACEHOLDER:PlatformName' as the url value (e.g. 'PLACEHOLDER:GitHub').\n"
        "- Include strings in the 'warnings' list for any selected sections where data is missing, "
        "sparse, or not found in the resume.\n"
        "- Make sure to use the correct discriminated union type for each section.\n\n"
        f"Schema to follow:\n{schema_json}"
    )
    user_msg = f"Resume text:\n\n{resume_text}"
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]
