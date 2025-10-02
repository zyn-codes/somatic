"""
Simplified data models for maximum visitor data collection
Focus on collecting comprehensive visitor and device information
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum

from pydantic import BaseModel, Field, EmailStr, validator
from sqlmodel import SQLModel, Field as SQLField, Column, JSON


class VisitType(str, Enum):
    PAGE_VISIT = "page_visit"
    FORM_SUBMISSION = "form_submission"


class DeviceType(str, Enum):
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"
    UNKNOWN = "unknown"


# Personal Information Models
class PersonalInfo(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50, alias="firstName")
    last_name: str = Field(..., min_length=2, max_length=50, alias="lastName")
    email: EmailStr
    
    @validator('first_name', 'last_name')
    def validate_name(cls, v):
        return v.strip().title()
    
    class Config:
        allow_population_by_field_name = True


class ContactInfo(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    message: Optional[str] = Field(None, max_length=1000)
    
    @validator('phone')
    def validate_phone(cls, v):
        # Remove all non-digit characters except +
        cleaned = ''.join(c for c in v if c.isdigit() or c == '+')
        return cleaned


class AppointmentDetails(BaseModel):
    timezone: str = Field(..., min_length=1)
    slot: str = Field(..., min_length=1)
    agreements: Dict[str, bool] = Field(default_factory=dict)


# Technical Data Collection Models
class ScreenInfo(BaseModel):
    width: int = Field(..., ge=100, le=10000)
    height: int = Field(..., ge=100, le=10000)
    color_depth: Optional[int] = Field(None, ge=1, le=64)
    pixel_ratio: Optional[float] = Field(None, ge=0.1, le=10.0)
    available_width: Optional[int] = None
    available_height: Optional[int] = None
    orientation: Optional[str] = None
    inner_width: Optional[int] = None
    inner_height: Optional[int] = None


class BrowserInfo(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    major_version: Optional[str] = None
    engine: Optional[str] = None
    engine_version: Optional[str] = None
    user_agent: Optional[str] = None
    language: Optional[str] = None
    languages: Optional[List[str]] = None
    platform: Optional[str] = None
    cookies_enabled: Optional[bool] = None
    java_enabled: Optional[bool] = None
    online: Optional[bool] = None


class OperatingSystem(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    platform: Optional[str] = None
    architecture: Optional[str] = None
    cpu_class: Optional[str] = None


class DeviceInfo(BaseModel):
    type: DeviceType = DeviceType.UNKNOWN
    brand: Optional[str] = None
    model: Optional[str] = None
    is_mobile: bool = False
    is_tablet: bool = False
    is_touch: bool = False
    hardware_concurrency: Optional[int] = None
    max_touch_points: Optional[int] = None
    memory: Optional[float] = None  # GB
    vendor: Optional[str] = None
    renderer: Optional[str] = None


class NetworkInfo(BaseModel):
    connection_type: Optional[str] = None
    effective_type: Optional[str] = None
    downlink: Optional[float] = None
    rtt: Optional[int] = None
    save_data: Optional[bool] = None
    ip_type: Optional[str] = None  # IPv4/IPv6


class GeolocationData(BaseModel):
    country: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    region_code: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    isp: Optional[str] = None
    organization: Optional[str] = None
    as_number: Optional[str] = None
    accuracy_radius: Optional[int] = None


class TechnicalFingerprint(BaseModel):
    canvas_fingerprint: Optional[str] = None
    webgl_fingerprint: Optional[str] = None
    audio_fingerprint: Optional[str] = None
    font_fingerprint: Optional[List[str]] = None
    timezone_fingerprint: Optional[str] = None
    plugin_fingerprint: Optional[List[str]] = None
    webrtc_fingerprint: Optional[Dict[str, Any]] = None
    local_storage_enabled: Optional[bool] = None
    session_storage_enabled: Optional[bool] = None
    indexed_db_enabled: Optional[bool] = None
    do_not_track: Optional[bool] = None
    ad_blocker_detected: Optional[bool] = None


class BehavioralData(BaseModel):
    mouse_movements: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    keystrokes: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    scroll_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    click_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    focus_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    time_on_page: Optional[float] = None
    form_completion_time: Optional[float] = None
    page_load_time: Optional[float] = None
    interaction_count: Optional[int] = None


class FormData(BaseModel):
    personal_info: Optional[PersonalInfo] = None
    contact_info: Optional[ContactInfo] = None
    appointment_details: Optional[AppointmentDetails] = None
    form_id: str = Field(..., min_length=1)


# Request Models
class VisitRequest(BaseModel):
    # Basic visit data
    url: str = Field(..., min_length=1, max_length=2000)
    referrer: Optional[str] = Field(None, max_length=2000)
    user_agent: Optional[str] = Field(None, max_length=1000)
    
    # Form submission flag and data
    form_submission: bool = False
    form_data: Optional[FormData] = None
    
    # Technical data
    technical_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    behavioral_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Client-provided metadata
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    languages: Optional[str] = None
    webrtc_ips: Optional[List[str]] = Field(default_factory=list)
    device_type: Optional[str] = None
    
    # Timestamps
    submitted_at: Optional[datetime] = None


# Enhanced visitor data (complete collected data)
class VisitorData(BaseModel):
    # Unique identifiers
    id: Optional[str] = None
    visit_id: str = Field(default_factory=lambda: generate_visit_id())
    session_id: Optional[str] = None
    
    # Timestamps
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None
    
    # Basic visit info
    visit_type: VisitType = VisitType.PAGE_VISIT
    is_form_submission: bool = False
    url: str
    referrer: Optional[str] = None
    
    # Client information
    client_ip: str
    user_agent: str
    
    # Technical data
    browser_info: Optional[BrowserInfo] = None
    os_info: Optional[OperatingSystem] = None
    device_info: Optional[DeviceInfo] = None
    screen_info: Optional[ScreenInfo] = None
    network_info: Optional[NetworkInfo] = None
    
    # Location and ISP
    geolocation: Optional[GeolocationData] = None
    
    # Fingerprinting
    technical_fingerprint: Optional[TechnicalFingerprint] = None
    
    # Behavioral data
    behavioral_data: Optional[BehavioralData] = None
    
    # Form data (if form submission)
    form_data: Optional[FormData] = None
    
    # Headers and metadata
    request_headers: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Response Models
class VisitResponse(BaseModel):
    success: bool
    visit_id: str
    timestamp: datetime
    message: Optional[str] = None


class HealthMetrics(BaseModel):
    total_requests: int = 0
    total_visits: int = 0
    total_form_submissions: int = 0
    active_connections: int = 0
    requests_per_minute: int = 0
    average_response_time: float = 0.0
    top_browsers: Dict[str, int] = Field(default_factory=dict)
    top_countries: Dict[str, int] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    uptime: float
    metrics: HealthMetrics


# Database Models (SQLModel for SQLite/PostgreSQL)
class VisitRecord(SQLModel, table=True):
    __tablename__ = "visits"
    
    id: Optional[int] = SQLField(primary_key=True)
    visit_id: str = SQLField(unique=True, index=True)
    timestamp: datetime = SQLField(index=True)
    visit_type: str = SQLField(index=True)
    client_ip: str = SQLField(index=True)
    country: Optional[str] = SQLField(index=True)
    is_form_submission: bool = SQLField(index=True)
    
    # JSON fields for complex data
    visitor_data: Dict[str, Any] = SQLField(default_factory=dict, sa_column=Column(JSON))
    form_data: Optional[Dict[str, Any]] = SQLField(default=None, sa_column=Column(JSON))
    technical_data: Dict[str, Any] = SQLField(default_factory=dict, sa_column=Column(JSON))


# Server metrics class
class ServerMetrics:
    def __init__(self):
        self.total_requests: int = 0
        self.total_visits: int = 0
        self.total_form_submissions: int = 0
        self.active_connections: int = 0
        self.last_minute_requests: List[float] = []
        self.browser_stats: Dict[str, int] = {}
        self.country_stats: Dict[str, int] = {}
        self.total_response_time: float = 0.0


# Utility functions
def generate_visit_id() -> str:
    """Generate unique visit ID"""
    import uuid
    from datetime import datetime
    timestamp = int(datetime.now().timestamp())
    unique_id = str(uuid.uuid4())[:8]
    return f"VISIT-{timestamp}-{unique_id}"


def generate_request_id() -> str:
    """Generate unique request ID"""
    import uuid
    return f"REQ-{str(uuid.uuid4())[:12]}"


def get_client_ip(request) -> str:
    """Extract client IP from request with proxy support"""
    # Check various headers for real IP
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    forwarded = request.headers.get("forwarded")
    if forwarded:
        # Parse forwarded header
        for part in forwarded.split(";"):
            if "for=" in part:
                return part.split("for=")[1].split(",")[0].strip()
    
    # Fallback to client host
    if hasattr(request, 'client') and request.client:
        return request.client.host
    
    return "unknown"


def load_environment():
    """Load environment variables"""
    from dotenv import load_dotenv
    import os
    
    load_dotenv()
    
    # Ensure required environment variables
    required_vars = ["ADMIN_PASSWORD"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {missing_vars}")