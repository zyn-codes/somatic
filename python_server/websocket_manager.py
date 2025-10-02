"""
Simplified WebSocket Management for Admin Panel
Real-time visitor data broadcasting
"""

import os
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from fastapi import WebSocket, WebSocketDisconnect

from models import *
from logger_config import logger


class WebSocketManager:
    """Simplified WebSocket management system"""
    
    def __init__(self):
        # Store active admin connections
        self.admin_connections: Dict[str, WebSocket] = {}
        self.active_connections = 0
    
    async def handle_admin_connection(self, websocket: WebSocket):
        """Handle admin WebSocket connection"""
        await websocket.accept()
        connection_id = f"admin_{uuid.uuid4().hex[:8]}"
        
        try:
            # Wait for authentication
            auth_data = await websocket.receive_json()
            admin_password = os.getenv("ADMIN_PASSWORD")
            
            if auth_data.get("token") != admin_password:
                await websocket.send_json({"error": "Authentication failed"})
                await websocket.close()
                return
            
            # Add to connections
            self.admin_connections[connection_id] = websocket
            self.active_connections += 1
            
            logger.info(f"Admin WebSocket connected: {connection_id}")
            
            # Send connection confirmation
            await websocket.send_json({
                "type": "connection_established",
                "data": {
                    "connection_id": connection_id,
                    "authenticated": True
                }
            })
            
            # Keep connection alive
            try:
                while True:
                    message = await websocket.receive_text()
                    # Handle ping/pong or other admin commands
                    if message == "ping":
                        await websocket.send_text("pong")
                        
            except WebSocketDisconnect:
                logger.info(f"Admin WebSocket disconnected: {connection_id}")
                
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            # Clean up
            if connection_id in self.admin_connections:
                del self.admin_connections[connection_id]
                self.active_connections -= 1
    
    async def broadcast_to_admins(self, message_type: str, data: Dict[str, Any]):
        """Broadcast message to all admin connections"""
        if not self.admin_connections:
            return
        
        message = {
            "type": message_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        disconnected = []
        
        for connection_id, websocket in self.admin_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to {connection_id}: {e}")
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            if connection_id in self.admin_connections:
                del self.admin_connections[connection_id]
                self.active_connections -= 1