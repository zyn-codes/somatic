"""
Comprehensive Security System for Somatic Python Server
Advanced rate limiting, authentication, and threat protection
"""

import os
import time
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, deque
import ipaddress

from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import bcrypt
from jose import JWTError, jwt

from models import *
from logger_config import logger


class SecurityManager:
    """Comprehensive security management system"""
    
    def __init__(self):
        self.failed_attempts = defaultdict(deque)
        self.blocked_ips = set()
        self.suspicious_patterns = {}
        self.rate_limiter = self._create_rate_limiter()
        self.auth_attempts = defaultdict(lambda: {"count": 0, "last_attempt": 0})
        
        # Security thresholds
        self.max_failed_attempts = 5
        self.lockout_duration = 900  # 15 minutes
        self.suspicious_threshold = 10
        
        # Rate limiting configurations
        self.rate_limits = {
            "api": "50/5minutes",
            "general": "100/15minutes",
            "admin": "10/minute",
            "websocket": "5/minute"
        }
    
    def _create_rate_limiter(self) -> Limiter:
        """Create rate limiter with custom key function"""
        def get_client_identifier(request: Request) -> str:
            """Enhanced client identification for rate limiting"""
            # Get real IP through proxies
            client_ip = get_client_ip(request)
            
            # For authenticated users, use user ID
            if hasattr(request.state, "user_id"):
                return f"user:{request.state.user_id}"
            
            # Use IP + User-Agent combination for better granularity
            user_agent = request.headers.get("user-agent", "")
            ua_hash = hashlib.md5(user_agent.encode()).hexdigest()[:8]
            
            return f"ip:{client_ip}:ua:{ua_hash}"
        
        return Limiter(key_func=get_client_identifier)
    
    def apply_rate_limiting(self, app):
        """Apply rate limiting to FastAPI app"""
        app.state.limiter = self.rate_limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        app.add_middleware(SlowAPIMiddleware)
        
        return app
    
    async def check_ip_security(self, request: Request) -> Dict[str, any]:
        """Comprehensive IP security check"""
        client_ip = get_client_ip(request)
        
        security_info = {
            "ip": client_ip,
            "blocked": False,
            "suspicious": False,
            "risk_score": 0.0,
            "checks": {}
        }
        
        try:
            # Check if IP is blocked
            if await self._is_ip_blocked(client_ip):
                security_info["blocked"] = True
                security_info["risk_score"] = 1.0
                return security_info
            
            # Check for suspicious patterns
            suspicious_score = await self._check_suspicious_patterns(client_ip, request)
            security_info["checks"]["suspicious_patterns"] = suspicious_score
            
            # Check against threat intelligence
            threat_score = await self._check_threat_intelligence(client_ip)
            security_info["checks"]["threat_intelligence"] = threat_score
            
            # Check for rapid requests
            rapid_requests_score = await self._check_rapid_requests(client_ip)
            security_info["checks"]["rapid_requests"] = rapid_requests_score
            
            # Check geolocation risk
            geo_risk_score = await self._check_geolocation_risk(client_ip)
            security_info["checks"]["geolocation_risk"] = geo_risk_score
            
            # Calculate overall risk score
            total_risk = (
                suspicious_score * 0.3 +
                threat_score * 0.4 +
                rapid_requests_score * 0.2 +
                geo_risk_score * 0.1
            )
            
            security_info["risk_score"] = min(total_risk, 1.0)
            security_info["suspicious"] = total_risk > 0.5
            
            # Log high-risk IPs
            if total_risk > 0.7:
                logger.warning(
                    "High-risk IP detected",
                    extra={
                        "client_ip": client_ip,
                        "risk_score": total_risk,
                        "checks": security_info["checks"]
                    }
                )
            
            return security_info
            
        except Exception as e:
            logger.error(f"Error in IP security check: {e}")
            return security_info
    
    async def _is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is in blocked list"""
        return ip in self.blocked_ips
    
    async def _check_suspicious_patterns(self, ip: str, request: Request) -> float:
        """Check for suspicious request patterns"""
        try:
            user_agent = request.headers.get("user-agent", "")
            
            risk_score = 0.0
            
            # Check for bot-like user agents
            bot_indicators = [
                'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
                'python', 'java', 'postman', 'test', 'monitor'
            ]
            
            if any(indicator in user_agent.lower() for indicator in bot_indicators):
                risk_score += 0.3
            
            # Check for missing/suspicious headers
            if not user_agent:
                risk_score += 0.2
            
            if not request.headers.get("accept"):
                risk_score += 0.1
            
            if not request.headers.get("accept-language"):
                risk_score += 0.1
            
            # Check for proxy headers
            proxy_headers = [
                'x-forwarded-for', 'x-real-ip', 'via', 'forwarded'
            ]
            if any(header in request.headers for header in proxy_headers):
                risk_score += 0.2
            
            return min(risk_score, 1.0)
            
        except Exception as e:
            logger.warning(f"Error checking suspicious patterns: {e}")
            return 0.0
    
    async def _check_threat_intelligence(self, ip: str) -> float:
        """Check IP against threat intelligence feeds"""
        try:
            risk_score = 0.0
            
            # Check if IP is private/local (lower risk)
            try:
                ip_obj = ipaddress.ip_address(ip)
                if ip_obj.is_private or ip_obj.is_loopback:
                    return 0.0
            except ValueError:
                return 0.5  # Invalid IP format
            
            # Here you would integrate with real threat intelligence APIs
            # For now, use basic heuristics
            
            # Check for common malicious IP patterns
            malicious_patterns = [
                r'\.tor\.',
                r'proxy',
                r'vpn',
                r'hosting'
            ]
            
            # This would be replaced with actual TI API calls
            # risk_score = await self._query_threat_intel_apis(ip)
            
            return risk_score
            
        except Exception as e:
            logger.warning(f"Error checking threat intelligence: {e}")
            return 0.0
    
    async def _check_rapid_requests(self, ip: str) -> float:
        """Check for rapid request patterns"""
        try:
            current_time = time.time()
            window = 60  # 1 minute window
            
            # Clean old entries
            if ip in self.failed_attempts:
                self.failed_attempts[ip] = deque([
                    timestamp for timestamp in self.failed_attempts[ip]
                    if current_time - timestamp < window
                ])
            
            # Count recent requests
            recent_count = len(self.failed_attempts[ip])
            
            # Calculate risk based on request frequency
            if recent_count > 30:  # More than 30 requests per minute
                return 0.8
            elif recent_count > 20:
                return 0.6
            elif recent_count > 10:
                return 0.4
            elif recent_count > 5:
                return 0.2
            
            return 0.0
            
        except Exception as e:
            logger.warning(f"Error checking rapid requests: {e}")
            return 0.0
    
    async def _check_geolocation_risk(self, ip: str) -> float:
        """Check geolocation-based risk factors"""
        try:
            # This would integrate with geolocation services
            # For now, return low risk
            return 0.0
            
        except Exception as e:
            logger.warning(f"Error checking geolocation risk: {e}")
            return 0.0
    
    def record_failed_attempt(self, ip: str):
        """Record failed authentication attempt"""
        current_time = time.time()
        self.failed_attempts[ip].append(current_time)
        
        # Clean old attempts
        window = 900  # 15 minutes
        self.failed_attempts[ip] = deque([
            timestamp for timestamp in self.failed_attempts[ip]
            if current_time - timestamp < window
        ])
        
        # Block IP if too many failed attempts
        if len(self.failed_attempts[ip]) >= self.max_failed_attempts:
            self.blocked_ips.add(ip)
            logger.warning(f"IP blocked due to failed attempts: {ip}")
    
    def is_ip_rate_limited(self, ip: str) -> bool:
        """Check if IP should be rate limited"""
        current_time = time.time()
        
        # Check authentication attempts
        auth_info = self.auth_attempts[ip]
        if current_time - auth_info["last_attempt"] > 300:  # Reset after 5 minutes
            auth_info["count"] = 0
        
        return auth_info["count"] >= 5
    
    def record_auth_attempt(self, ip: str, success: bool):
        """Record authentication attempt"""
        current_time = time.time()
        auth_info = self.auth_attempts[ip]
        
        if success:
            auth_info["count"] = 0  # Reset on success
        else:
            auth_info["count"] += 1
            self.record_failed_attempt(ip)
        
        auth_info["last_attempt"] = current_time


class AuthenticationManager:
    """Handle authentication for admin access"""
    
    def __init__(self):
        self.admin_password = os.getenv("ADMIN_PASSWORD")
        if not self.admin_password:
            raise ValueError("ADMIN_PASSWORD environment variable not set")
        
        # JWT settings
        self.secret_key = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
    
    def verify_password(self, plain_password: str) -> bool:
        """Verify admin password"""
        return plain_password == self.admin_password
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None


# Security dependencies
security_manager = SecurityManager()
auth_manager = AuthenticationManager()
security_scheme = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = auth_manager.verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


def verify_admin_password(
    password: Optional[str] = None,
    authorization: Optional[HTTPAuthorizationCredentials] = None
) -> bool:
    """Verify admin password from query param or authorization header"""
    if password:
        return auth_manager.verify_password(password)
    
    if authorization:
        # Try as direct password first
        if auth_manager.verify_password(authorization.credentials):
            return True
        
        # Try as JWT token
        payload = auth_manager.verify_token(authorization.credentials)
        return payload is not None
    
    return False


async def security_check_dependency(request: Request):
    """Security check dependency for endpoints"""
    try:
        # Perform comprehensive security check
        security_info = await security_manager.check_ip_security(request)
        
        # Block if IP is blocked
        if security_info["blocked"]:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )
        
        # Warn if high risk
        if security_info["risk_score"] > 0.8:
            logger.warning(
                "High-risk request allowed",
                extra={
                    "client_ip": security_info["ip"],
                    "risk_score": security_info["risk_score"],
                    "endpoint": str(request.url.path)
                }
            )
        
        # Add security info to request state
        request.state.security_info = security_info
        
        return security_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Security check failed: {e}")
        # Don't block on security check failures
        return {"ip": "unknown", "blocked": False, "suspicious": False, "risk_score": 0.0}


class InputValidator:
    """Advanced input validation and sanitization"""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not value:
            return ""
        
        # Remove null bytes and control characters
        sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\t\n\r')
        
        # Limit length
        return sanitized[:max_length]
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Enhanced email validation"""
        import re
        
        if not email or len(email) > 254:
            return False
        
        # RFC 5322 compliant regex (simplified)
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(pattern, email):
            return False
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'\.{2,}',  # Multiple consecutive dots
            r'^\.|\.$',  # Starting or ending with dot
            r'[<>"\[\]]',  # HTML/script characters
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, email):
                return False
        
        return True
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Enhanced phone validation"""
        if not phone:
            return False
        
        # Remove formatting
        digits_only = ''.join(c for c in phone if c.isdigit())
        
        # Check length (international format)
        if len(digits_only) < 7 or len(digits_only) > 15:
            return False
        
        return True
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Enhanced URL validation"""
        if not url:
            return False
        
        try:
            from urllib.parse import urlparse
            result = urlparse(url)
            
            # Must have scheme and netloc
            if not result.scheme or not result.netloc:
                return False
            
            # Only allow HTTP/HTTPS
            if result.scheme not in ['http', 'https']:
                return False
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'javascript:',
                r'data:',
                r'vbscript:',
                r'file:',
                r'ftp:',
            ]
            
            url_lower = url.lower()
            for pattern in suspicious_patterns:
                if pattern in url_lower:
                    return False
            
            return True
            
        except Exception:
            return False


class WebApplicationFirewall:
    """Basic WAF functionality"""
    
    def __init__(self):
        self.attack_patterns = [
            # SQL Injection
            r'(\b(union|select|insert|update|delete|drop|exec|execute)\b)',
            r'(--|\/\*|\*\/)',
            r'(\b(or|and)\b\s+\d+\s*=\s*\d+)',
            
            # XSS
            r'(<script|</script>|javascript:|onload=|onerror=)',
            r'(alert\s*\(|confirm\s*\(|prompt\s*\()',
            
            # Path Traversal
            r'(\.\./|\.\.\\|/etc/passwd|/etc/shadow)',
            
            # Command Injection
            r'(\b(cat|ls|pwd|id|whoami|uname)\b)',
            r'(;|\||&|\$\(|\`)',
            
            # LDAP Injection
            r'(\*\)|\(\|)',
        ]
    
    def check_request(self, request: Request) -> Dict[str, any]:
        """Check request for malicious patterns"""
        threats = []
        
        try:
            # Check URL path
            if self._contains_attack_pattern(str(request.url.path)):
                threats.append("Malicious URL pattern")
            
            # Check query parameters
            for key, value in request.query_params.items():
                if self._contains_attack_pattern(f"{key}={value}"):
                    threats.append(f"Malicious query parameter: {key}")
            
            # Check headers
            for name, value in request.headers.items():
                if self._contains_attack_pattern(f"{name}: {value}"):
                    threats.append(f"Malicious header: {name}")
            
            return {
                "blocked": len(threats) > 0,
                "threats": threats,
                "risk_score": min(len(threats) * 0.3, 1.0)
            }
            
        except Exception as e:
            logger.warning(f"WAF check error: {e}")
            return {"blocked": False, "threats": [], "risk_score": 0.0}
    
    def _contains_attack_pattern(self, text: str) -> bool:
        """Check if text contains attack patterns"""
        import re
        
        text_lower = text.lower()
        
        for pattern in self.attack_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False


# Initialize WAF
waf = WebApplicationFirewall()


async def waf_check_dependency(request: Request):
    """WAF check dependency"""
    try:
        waf_result = waf.check_request(request)
        
        if waf_result["blocked"]:
            logger.warning(
                "Request blocked by WAF",
                extra={
                    "client_ip": get_client_ip(request),
                    "threats": waf_result["threats"],
                    "url": str(request.url)
                }
            )
            
            raise HTTPException(
                status_code=403,
                detail="Request blocked by security filter"
            )
        
        request.state.waf_result = waf_result
        return waf_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WAF check failed: {e}")
        return {"blocked": False, "threats": [], "risk_score": 0.0}

