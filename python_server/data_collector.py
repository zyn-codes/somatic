"""
Simplified Visitor Data Collection System
Focus on maximum visitor and device data collection without risk analysis
"""

import asyncio
import json
import time
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse
import ipaddress

# Third-party imports with fallbacks
try:
    import geoip2.database
    import geoip2.errors
    GEOIP_AVAILABLE = True
except ImportError:
    GEOIP_AVAILABLE = False

try:
    from user_agents import parse as parse_user_agent
    USER_AGENTS_AVAILABLE = True
except ImportError:
    USER_AGENTS_AVAILABLE = False

# Local imports
from models import *
from logger_config import logger
from utils import get_client_ip


class VisitorDataCollector:
    """Comprehensive visitor data collection system"""
    
    def __init__(self):
        self.geoip_reader = None
        
    async def initialize(self):
        """Initialize data collection systems"""
        try:
            await self._load_geoip_database()
            logger.info("Data collector initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize data collector: {e}")
            # Don't raise - continue without GeoIP
    
    async def _load_geoip_database(self):
        """Load MaxMind GeoIP database"""
        if not GEOIP_AVAILABLE:
            logger.warning("GeoIP2 library not installed, skipping database load")
            return
            
        try:
            # Try to load GeoLite2 database
            db_paths = [
                "/usr/share/GeoIP/GeoLite2-City.mmdb",
                "./data/GeoLite2-City.mmdb",
                "../data/GeoLite2-City.mmdb"
            ]
            
            for path in db_paths:
                try:
                    self.geoip_reader = geoip2.database.Reader(path)
                    logger.info(f"Loaded GeoIP database from {path}")
                    return
                except FileNotFoundError:
                    continue
                    
            logger.warning("GeoIP database not found, geolocation will be limited")
            
        except Exception as e:
            logger.error(f"Error loading GeoIP database: {e}")
    
    async def collect_comprehensive_data(
        self, 
        visit_data: VisitRequest, 
        request
    ) -> VisitorData:
        """Collect maximum visitor intelligence"""
        try:
            # Extract basic information
            client_ip = get_client_ip(request)
            user_agent = request.headers.get("user-agent", "")
            
            # Create visitor data object
            visitor_data = VisitorData(
                url=visit_data.url,
                referrer=visit_data.referrer,
                client_ip=client_ip,
                user_agent=user_agent,
                is_form_submission=visit_data.form_submission,
                visit_type=VisitType.FORM_SUBMISSION if visit_data.form_submission else VisitType.PAGE_VISIT,
                request_headers=dict(request.headers),
                form_data=visit_data.form_data
            )
            
            # Collect all data types
            await asyncio.gather(
                self._collect_browser_info(visitor_data, user_agent, request),
                self._collect_device_info(visitor_data, user_agent, visit_data.technical_data),
                self._collect_network_info(visitor_data, request),
                self._collect_geolocation_data(visitor_data, client_ip),
                self._collect_technical_fingerprint(visitor_data, visit_data.technical_data),
                self._collect_behavioral_data(visitor_data, visit_data.behavioral_data),
                self._collect_screen_info(visitor_data, visit_data.technical_data),
                return_exceptions=True
            )
            
            return visitor_data
            
        except Exception as e:
            logger.error(f"Error collecting visitor data: {e}")
            raise
    
    async def _collect_browser_info(self, data: VisitorData, user_agent: str, request):
        """Collect detailed browser information"""
        try:
            browser_info = BrowserInfo(user_agent=user_agent)
            
            if USER_AGENTS_AVAILABLE:
                parsed_ua = parse_user_agent(user_agent)
                browser_info.name = parsed_ua.browser.family
                browser_info.version = parsed_ua.browser.version_string
                browser_info.major_version = str(parsed_ua.browser.version[0]) if parsed_ua.browser.version else None
                browser_info.engine = parsed_ua.browser.family
                browser_info.engine_version = parsed_ua.browser.version_string
            else:
                # Fallback to basic parsing
                from utils import parse_user_agent_basic
                parsed_ua_dict = parse_user_agent_basic(user_agent)
                browser_info.name = parsed_ua_dict['browser']
                browser_info.version = parsed_ua_dict['version']
            
            # Extract additional browser info from headers
            browser_info.language = request.headers.get('accept-language', '').split(',')[0] if request.headers.get('accept-language') else None
            browser_info.languages = request.headers.get('accept-language', '').split(',') if request.headers.get('accept-language') else None
            browser_info.platform = request.headers.get('sec-ch-ua-platform', '').strip('"') if request.headers.get('sec-ch-ua-platform') else None
            
            # Set OS info
            if USER_AGENTS_AVAILABLE:
                parsed_ua = parse_user_agent(user_agent)
                data.os_info = OperatingSystem(
                    name=parsed_ua.os.family,
                    version=parsed_ua.os.version_string,
                    platform=str(parsed_ua.device.family)
                )
            else:
                from utils import parse_user_agent_basic
                parsed_ua_dict = parse_user_agent_basic(user_agent)
                data.os_info = OperatingSystem(
                    name=parsed_ua_dict['os'],
                    platform=parsed_ua_dict['device']
                )
            
            data.browser_info = browser_info
            
        except Exception as e:
            logger.warning(f"Error collecting browser info: {e}")
    
    async def _collect_device_info(self, data: VisitorData, user_agent: str, technical_data: dict):
        """Collect comprehensive device information"""
        try:
            # Determine device type
            device_type = DeviceType.UNKNOWN
            is_mobile = False
            is_tablet = False
            
            if USER_AGENTS_AVAILABLE:
                parsed_ua = parse_user_agent(user_agent)
                if parsed_ua.is_mobile:
                    device_type = DeviceType.MOBILE
                    is_mobile = True
                elif parsed_ua.is_tablet:
                    device_type = DeviceType.TABLET
                    is_tablet = True
                elif parsed_ua.is_pc:
                    device_type = DeviceType.DESKTOP
            else:
                ua_lower = user_agent.lower()
                if any(term in ua_lower for term in ['mobile', 'android', 'iphone']):
                    device_type = DeviceType.MOBILE
                    is_mobile = True
                elif any(term in ua_lower for term in ['tablet', 'ipad']):
                    device_type = DeviceType.TABLET
                    is_tablet = True
                else:
                    device_type = DeviceType.DESKTOP
            
            device_info = DeviceInfo(
                type=device_type,
                is_mobile=is_mobile,
                is_tablet=is_tablet,
                is_touch=self._detect_touch_device(user_agent)
            )
            
            # Extract device info from technical data
            if technical_data:
                device_info.hardware_concurrency = technical_data.get('hardwareConcurrency')
                device_info.max_touch_points = technical_data.get('maxTouchPoints')
                device_info.memory = technical_data.get('deviceMemory')
                device_info.vendor = technical_data.get('vendor')
                device_info.renderer = technical_data.get('renderer')
                
                # Extract brand and model if available
                if USER_AGENTS_AVAILABLE:
                    parsed_ua = parse_user_agent(user_agent)
                    device_info.brand = parsed_ua.device.brand
                    device_info.model = parsed_ua.device.model
            
            data.device_info = device_info
            
        except Exception as e:
            logger.warning(f"Error collecting device info: {e}")
    
    def _detect_touch_device(self, user_agent: str) -> bool:
        """Detect if device supports touch"""
        touch_indicators = [
            'touch', 'mobile', 'android', 'iphone', 'ipad',
            'tablet', 'silk', 'kindle'
        ]
        return any(indicator in user_agent.lower() for indicator in touch_indicators)
    
    async def _collect_network_info(self, data: VisitorData, request):
        """Collect network and connection information"""
        try:
            network_info = NetworkInfo()
            
            # Extract network info from headers
            network_info.ip_type = "IPv6" if ":" in data.client_ip else "IPv4"
            
            # Connection type from headers
            if 'connection' in request.headers:
                network_info.connection_type = request.headers['connection']
            
            data.network_info = network_info
            
        except Exception as e:
            logger.warning(f"Error collecting network info: {e}")
    
    async def _collect_geolocation_data(self, data: VisitorData, ip: str):
        """Collect comprehensive geolocation data"""
        try:
            if not GEOIP_AVAILABLE or not self.geoip_reader:
                return
            
            # Skip private/local IPs
            try:
                ip_obj = ipaddress.ip_address(ip)
                if ip_obj.is_private or ip_obj.is_loopback:
                    return
            except ValueError:
                return
            
            response = self.geoip_reader.city(ip)
            
            data.geolocation = GeolocationData(
                country=response.country.name,
                country_code=response.country.iso_code,
                region=response.subdivisions.most_specific.name,
                region_code=response.subdivisions.most_specific.iso_code,
                city=response.city.name,
                postal_code=response.postal.code,
                latitude=float(response.location.latitude) if response.location.latitude else None,
                longitude=float(response.location.longitude) if response.location.longitude else None,
                timezone=response.location.time_zone,
                accuracy_radius=response.location.accuracy_radius
            )
            
            # Try to get ISP information
            try:
                isp_response = self.geoip_reader.isp(ip)
                data.geolocation.isp = isp_response.isp
                data.geolocation.organization = isp_response.organization
                data.geolocation.as_number = str(isp_response.autonomous_system_number)
            except:
                pass
            
        except Exception as e:
            logger.debug(f"Error collecting geolocation data for {ip}: {e}")
    
    async def _collect_technical_fingerprint(self, data: VisitorData, technical_data: dict):
        """Collect comprehensive technical fingerprints"""
        try:
            if not technical_data:
                return
                
            fingerprint = TechnicalFingerprint()
            
            # Canvas fingerprint
            fingerprint.canvas_fingerprint = technical_data.get('canvasFingerprint')
            
            # WebGL fingerprint
            fingerprint.webgl_fingerprint = technical_data.get('webglFingerprint')
            
            # Audio fingerprint
            fingerprint.audio_fingerprint = technical_data.get('audioFingerprint')
            
            # Font fingerprint
            fingerprint.font_fingerprint = technical_data.get('fontFingerprint')
            
            # Timezone fingerprint
            fingerprint.timezone_fingerprint = technical_data.get('timezoneFingerprint')
            
            # Plugin fingerprint
            fingerprint.plugin_fingerprint = technical_data.get('pluginFingerprint')
            
            # WebRTC fingerprint
            fingerprint.webrtc_fingerprint = technical_data.get('webrtcFingerprint')
            
            # Storage capabilities
            fingerprint.local_storage_enabled = technical_data.get('localStorageEnabled')
            fingerprint.session_storage_enabled = technical_data.get('sessionStorageEnabled')
            fingerprint.indexed_db_enabled = technical_data.get('indexedDbEnabled')
            
            # Privacy settings
            fingerprint.do_not_track = technical_data.get('doNotTrack')
            fingerprint.ad_blocker_detected = technical_data.get('adBlockerDetected')
            
            data.technical_fingerprint = fingerprint
            
        except Exception as e:
            logger.warning(f"Error collecting technical fingerprint: {e}")
    
    async def _collect_behavioral_data(self, data: VisitorData, behavioral_raw: dict):
        """Collect behavioral data"""
        try:
            if not behavioral_raw:
                return
            
            behavioral = BehavioralData()
            
            # Mouse movements
            if 'recent' in behavioral_raw:
                mouse_movements = [event for event in behavioral_raw['recent'] if event.get('type') == 'mousemove']
                behavioral.mouse_movements = mouse_movements
            
            # Keystrokes
            if 'recent' in behavioral_raw:
                keystrokes = [event for event in behavioral_raw['recent'] if event.get('type') == 'keydown']
                behavioral.keystrokes = keystrokes
            
            # Calculate metrics
            if behavioral.mouse_movements:
                behavioral.interaction_count = len(behavioral.mouse_movements) + len(behavioral.keystrokes or [])
            
            # Time metrics
            behavioral.time_on_page = behavioral_raw.get('timeOnPage')
            behavioral.form_completion_time = behavioral_raw.get('formCompletionTime')
            behavioral.page_load_time = behavioral_raw.get('pageLoadTime')
            
            data.behavioral_data = behavioral
            
        except Exception as e:
            logger.warning(f"Error collecting behavioral data: {e}")
    
    async def _collect_screen_info(self, data: VisitorData, technical_data: dict):
        """Collect comprehensive screen information"""
        try:
            if not technical_data:
                return
            
            screen_data = technical_data.get('screen', {})
            if not screen_data:
                return
            
            screen_info = ScreenInfo(
                width=screen_data.get('width', 0),
                height=screen_data.get('height', 0),
                color_depth=screen_data.get('colorDepth'),
                pixel_ratio=screen_data.get('pixelRatio'),
                available_width=screen_data.get('availWidth'),
                available_height=screen_data.get('availHeight'),
                orientation=screen_data.get('orientation'),
                inner_width=screen_data.get('innerWidth'),
                inner_height=screen_data.get('innerHeight')
            )
            
            data.screen_info = screen_info
            
        except Exception as e:
            logger.warning(f"Error collecting screen info: {e}")


# Function moved to utils.py