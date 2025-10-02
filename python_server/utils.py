"""
Utility functions for Somatic Python Server
"""

import os
import re
import uuid
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def generate_visit_id() -> str:
    """Generate unique visit ID"""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    unique_id = secrets.token_hex(4)
    return f"VISIT-{timestamp}-{unique_id.upper()}"


def generate_request_id() -> str:
    """Generate unique request ID"""
    return f"REQ-{secrets.token_hex(6).upper()}"


def get_client_ip(request) -> str:
    """Extract real client IP from request with proxy support"""
    # Check various headers for real IP
    ip_headers = [
        "cf-connecting-ip",      # Cloudflare
        "x-real-ip",            # Nginx
        "x-forwarded-for",      # Standard proxy header
        "x-client-ip",          # Apache
        "forwarded-for",        # Alternative
        "forwarded",            # RFC 7239
    ]
    
    for header in ip_headers:
        ip_value = request.headers.get(header)
        if ip_value:
            # Handle comma-separated IPs (take the first one)
            first_ip = ip_value.split(",")[0].strip()
            if first_ip and first_ip != "unknown":
                return first_ip
    
    # Fallback to request client
    if hasattr(request, 'client') and request.client and request.client.host:
        return request.client.host
    
    return "unknown"


def parse_user_agent_basic(user_agent: str) -> Dict[str, str]:
    """Basic user agent parsing fallback"""
    result = {
        "browser": "Unknown",
        "version": "Unknown",
        "os": "Unknown",
        "device": "Unknown"
    }
    
    if not user_agent:
        return result
    
    ua_lower = user_agent.lower()
    
    # Browser detection
    if "chrome" in ua_lower and "chromium" not in ua_lower:
        result["browser"] = "Chrome"
        match = re.search(r"chrome/(\d+)", ua_lower)
        if match:
            result["version"] = match.group(1)
    elif "firefox" in ua_lower:
        result["browser"] = "Firefox"
        match = re.search(r"firefox/(\d+)", ua_lower)
        if match:
            result["version"] = match.group(1)
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        result["browser"] = "Safari"
        match = re.search(r"safari/(\d+)", ua_lower)
        if match:
            result["version"] = match.group(1)
    elif "edge" in ua_lower:
        result["browser"] = "Edge"
        match = re.search(r"edge/(\d+)", ua_lower)
        if match:
            result["version"] = match.group(1)
    elif "opera" in ua_lower:
        result["browser"] = "Opera"
        match = re.search(r"opera/(\d+)", ua_lower)
        if match:
            result["version"] = match.group(1)
    
    # OS detection
    if "windows" in ua_lower:
        result["os"] = "Windows"
    elif "mac" in ua_lower or "darwin" in ua_lower:
        result["os"] = "macOS"
    elif "linux" in ua_lower:
        result["os"] = "Linux"
    elif "android" in ua_lower:
        result["os"] = "Android"
    elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
        result["os"] = "iOS"
    
    # Device detection
    if any(term in ua_lower for term in ["mobile", "phone", "android"]):
        result["device"] = "Mobile"
    elif any(term in ua_lower for term in ["tablet", "ipad"]):
        result["device"] = "Tablet"
    else:
        result["device"] = "Desktop"
    
    return result


def load_environment():
    """Load and validate environment variables"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv not available, use system env vars
    
    # Check for required environment variables
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password:
        raise EnvironmentError("ADMIN_PASSWORD environment variable is required")
    
    if len(admin_password) < 8:
        raise ValueError("ADMIN_PASSWORD must be at least 8 characters long")
    
    return True


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input"""
    if not value:
        return ""
    
    # Remove null bytes and control characters
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\t\n\r')
    
    # Limit length
    return sanitized[:max_length].strip()


def create_error_response(error_type: str, message: str, details: Optional[Dict] = None) -> Dict[str, Any]:
    """Create standardized error response"""
    response = {
        "error": True,
        "error_type": error_type,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if details:
        response["details"] = details
    
    return response


def create_success_response(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    """Create standardized success response"""
    response = {
        "success": True,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if data is not None:
        response["data"] = data
    
    return response