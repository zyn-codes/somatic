"""
Simplified Discord Integration for Visitor Notifications
Focus on visitor data alerts without complex risk analysis
"""

import os
import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional, Any

import aiohttp
from pydantic import BaseModel

from models import *
from logger_config import logger


class DiscordEmbed(BaseModel):
    """Discord embed structure"""
    title: str
    description: Optional[str] = None
    color: int
    fields: list = []
    footer: Optional[Dict[str, str]] = None
    timestamp: Optional[str] = None


class DiscordNotifier:
    """Simplified Discord notification system"""
    
    def __init__(self):
        self.webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
        self.enabled = bool(self.webhook_url)
        self.session = None
        
        # Color scheme
        self.colors = {
            "visit": 0x3498DB,        # Blue
            "form": 0x2ECC71,        # Green
            "info": 0x3498DB,        # Blue
        }
    
    async def initialize(self):
        """Initialize Discord notifier"""
        if not self.enabled:
            logger.warning("Discord webhook URL not configured")
            return
        
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10)
        )
        
        # Send startup notification
        await self.send_system_notification(
            "🚀 Somatic Server Started",
            "Visitor intelligence system is now online"
        )
        
        logger.info("Discord notifier initialized")
    
    async def close(self):
        """Close Discord notifier"""
        if self.session:
            await self.session.close()
    
    async def send_visit_notification(self, visitor_data: VisitorData):
        """Send visitor notification to Discord"""
        try:
            if visitor_data.is_form_submission:
                embed = self._create_form_submission_embed(visitor_data)
            else:
                embed = self._create_visit_embed(visitor_data)
            
            await self._send_embed(embed)
            
        except Exception as e:
            logger.error(f"Error sending visit notification: {e}")
    
    async def send_system_notification(self, title: str, message: str):
        """Send system notification to Discord"""
        try:
            embed = DiscordEmbed(
                title=title,
                description=message,
                color=self.colors["info"],
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
            await self._send_embed(embed)
            
        except Exception as e:
            logger.error(f"Error sending system notification: {e}")
    
    def _create_visit_embed(self, visitor_data: VisitorData) -> DiscordEmbed:
        """Create Discord embed for site visit"""
        fields = []
        
        # Basic info
        fields.append({
            "name": "🌐 Visitor Info",
            "value": f"**IP:** {visitor_data.client_ip}\n**Page:** {visitor_data.url}",
            "inline": False
        })
        
        # Location
        if visitor_data.geolocation:
            location_text = f"{visitor_data.geolocation.city or 'Unknown'}, {visitor_data.geolocation.country or 'Unknown'}"
            fields.append({
                "name": "📍 Location",
                "value": location_text,
                "inline": True
            })
        
        # Device info
        if visitor_data.browser_info and visitor_data.os_info:
            device_text = f"**Browser:** {visitor_data.browser_info.name or 'Unknown'}\n**OS:** {visitor_data.os_info.name or 'Unknown'}"
            fields.append({
                "name": "💻 Device",
                "value": device_text,
                "inline": True
            })
        
        return DiscordEmbed(
            title="👀 New Site Visit",
            color=self.colors["visit"],
            fields=fields,
            timestamp=visitor_data.timestamp.isoformat(),
            footer={"text": f"Visit ID: {visitor_data.visit_id}"}
        )
    
    def _create_form_submission_embed(self, visitor_data: VisitorData) -> DiscordEmbed:
        """Create Discord embed for form submission"""
        fields = []
        
        # Form data
        if visitor_data.form_data and visitor_data.form_data.personal_info:
            personal = visitor_data.form_data.personal_info
            fields.append({
                "name": "👤 Contact Information",
                "value": f"**Name:** {personal.first_name} {personal.last_name}\n**Email:** {personal.email}",
                "inline": False
            })
        
        if visitor_data.form_data and visitor_data.form_data.contact_info and visitor_data.form_data.contact_info.phone:
            fields.append({
                "name": "📱 Phone",
                "value": visitor_data.form_data.contact_info.phone,
                "inline": True
            })
        
        # Location
        if visitor_data.geolocation:
            location_text = f"{visitor_data.geolocation.city or 'Unknown'}, {visitor_data.geolocation.country or 'Unknown'}"
            fields.append({
                "name": "📍 Location",
                "value": location_text,
                "inline": True
            })
        
        return DiscordEmbed(
            title="📝 New Form Submission",
            color=self.colors["form"],
            fields=fields,
            timestamp=visitor_data.timestamp.isoformat(),
            footer={"text": f"Form ID: {visitor_data.form_data.form_id if visitor_data.form_data else 'unknown'}"}
        )
    
    async def _send_embed(self, embed: DiscordEmbed):
        """Send embed to Discord"""
        if not self.enabled or not self.session:
            return
        
        payload = {
            "username": "Somatic Intelligence",
            "embeds": [embed.dict(exclude_none=True)]
        }
        
        try:
            async with self.session.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 204:
                    logger.debug("Discord notification sent successfully")
                else:
                    logger.warning(f"Discord webhook returned status {response.status}")
                    
        except Exception as e:
            logger.error(f"Error sending Discord webhook: {e}")