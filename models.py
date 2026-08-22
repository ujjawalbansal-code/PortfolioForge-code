from pydantic import BaseModel, Field
from typing import Literal, Optional, Union, Annotated

class HeroSection(BaseModel):
    """Hero section for the top of the portfolio."""
    type: Literal["hero"] = "hero"
    name: str
    title: str
    tagline: str
    summary: str

class ExperienceItem(BaseModel):
    """Individual work experience item."""
    company: str
    role: str
    start_date: str
    end_date: Optional[str] = None
    bullets: list[str]

class ExperienceSection(BaseModel):
    """Experience section containing work history."""
    type: Literal["experience"] = "experience"
    heading: str = "Experience"
    items: list[ExperienceItem]

class Skill(BaseModel):
    """Individual skill."""
    name: str
    category: str

class SkillsSection(BaseModel):
    """Skills section categorized by domain."""
    type: Literal["skills"] = "skills"
    heading: str = "Skills"
    skills: list[Skill]

class ProjectItem(BaseModel):
    """Individual project item."""
    title: str
    description: str
    tech_stack: list[str]
    url: Optional[str] = None
    github_url: Optional[str] = None

class ProjectsSection(BaseModel):
    """Projects section detailing technical projects."""
    type: Literal["projects"] = "projects"
    heading: str = "Projects"
    items: list[ProjectItem]

class EducationItem(BaseModel):
    """Individual education item."""
    institution: str
    degree: str
    field: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    honors: Optional[str] = None

class EducationSection(BaseModel):
    """Education section containing academic history."""
    type: Literal["education"] = "education"
    heading: str = "Education"
    items: list[EducationItem]

class CertificateItem(BaseModel):
    """Individual certificate item."""
    name: str
    issuer: str
    date: Optional[str] = None
    url: Optional[str] = None

class CertificatesSection(BaseModel):
    """Certificates section containing professional certifications."""
    type: Literal["certificates"] = "certificates"
    heading: str = "Certificates"
    items: list[CertificateItem]

class SocialLink(BaseModel):
    """Individual social media link."""
    platform: str
    url: str
    label: str

class SocialsSection(BaseModel):
    """Socials section containing links to professional platforms."""
    type: Literal["socials"] = "socials"
    heading: str = "Socials"
    links: list[SocialLink]

class ContactSection(BaseModel):
    """Contact section containing personal contact information."""
    type: Literal["contact"] = "contact"
    heading: str = "Contact"
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None

class Card(BaseModel):
    """Generic card for custom sections."""
    title: str
    description: str
    details: Optional[list[str]] = None

class CustomSection(BaseModel):
    """Custom section for arbitrary user data."""
    type: Literal["custom"] = "custom"
    heading: str
    description: Optional[str] = None
    cards: list[Card]

# Discriminated union
SectionType = Annotated[
    Union[HeroSection, ExperienceSection, SkillsSection, ProjectsSection,
          EducationSection, CertificatesSection, SocialsSection, ContactSection, CustomSection],
    Field(discriminator="type")
]

class Portfolio(BaseModel):
    """Complete portfolio structured data."""
    sections: list[SectionType]
    warnings: list[str] = []

class SuggestedSection(BaseModel):
    """A suggested section based on resume content."""
    id: str
    name: str
    description: str
    is_prebuilt: bool

class SectionSuggestions(BaseModel):
    """List of suggested sections for the user to review."""
    sections: list[SuggestedSection]
