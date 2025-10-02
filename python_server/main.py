"""
Simplified Somatic Python Server - Maximum Visitor Data Collection
Focus on comprehensive visitor and device data collection
Optimized for Vercel and Render deployment
"""

import os
import sys
import asyncio
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path

# FastAPI imports
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import ValidationError

# Local imports
from models import *
from data_collector import VisitorDataCollector
from logger_config import logger
from discord_integration import DiscordNotifier
from websocket_manager import WebSocketManager
from database import DatabaseManager
from utils import *

# Initialize FastAPI app
app = FastAPI(
    title="Somatic Visitor Intelligence",
    description="Maximum visitor data collection and monitoring system",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize components
data_collector = VisitorDataCollector()
discord_notifier = DiscordNotifier()
websocket_manager = WebSocketManager()
database_manager = DatabaseManager()

# Global variables for metrics
server_metrics = ServerMetrics()
startup_time = datetime.now(timezone.utc)

# CORS configuration for Vercel/Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """Basic request tracking middleware"""
    start_time = datetime.now(timezone.utc)
    request_id = generate_request_id()
    
    # Add request tracking
    request.state.request_id = request_id
    request.state.start_time = start_time
    
    # Update metrics
    server_metrics.total_requests += 1
    server_metrics.last_minute_requests.append(start_time.timestamp())
    
    # Clean old minute data
    minute_ago = start_time.timestamp() - 60
    server_metrics.last_minute_requests = [
        t for t in server_metrics.last_minute_requests if t > minute_ago
    ]
    
    response = await call_next(request)
    
    # Calculate duration
    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    server_metrics.total_response_time += duration
    
    return response

@app.on_event("startup")
async def startup_event():
    """Initialize all systems on startup"""
    try:
        logger.info("Starting Somatic Python Server")
        
        # Initialize database
        await database_manager.initialize()
        
        # Initialize Discord notifier
        await discord_notifier.initialize()
        
        # Initialize data collector
        await data_collector.initialize()
        
        logger.info("Server startup completed successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        # Don't exit on startup failure for serverless

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown of all systems"""
    logger.info("Shutting down Somatic Python Server")
    await database_manager.close()
    await discord_notifier.close()

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check with server metrics"""
    uptime = (datetime.now(timezone.utc) - startup_time).total_seconds()
    requests_per_minute = len([
        t for t in server_metrics.last_minute_requests 
        if t > datetime.now(timezone.utc).timestamp() - 60
    ])
    
    avg_response_time = (
        server_metrics.total_response_time / server_metrics.total_requests
        if server_metrics.total_requests > 0 else 0
    )
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc),
        uptime=uptime,
        metrics=HealthMetrics(
            total_requests=server_metrics.total_requests,
            total_visits=server_metrics.total_visits,
            total_form_submissions=server_metrics.total_form_submissions,
            active_connections=websocket_manager.active_connections,
            requests_per_minute=requests_per_minute,
            average_response_time=avg_response_time,
            top_browsers=server_metrics.browser_stats,
            top_countries=server_metrics.country_stats,
        )
    )

# Main visitor data collection endpoint
@app.post("/api/log-visit", response_model=VisitResponse)
async def log_visit(
    visit_data: VisitRequest,
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Comprehensive visitor data collection endpoint
    """
    try:
        # Collect comprehensive visitor data
        visitor_data = await data_collector.collect_comprehensive_data(
            visit_data, request
        )
        
        # Update server metrics
        server_metrics.total_visits += 1
        
        if visitor_data.is_form_submission:
            server_metrics.total_form_submissions += 1
            
        # Update browser and country stats
        if visitor_data.browser_info and visitor_data.browser_info.name:
            browser = visitor_data.browser_info.name
            server_metrics.browser_stats[browser] = server_metrics.browser_stats.get(browser, 0) + 1
            
        if visitor_data.geolocation and visitor_data.geolocation.country:
            country = visitor_data.geolocation.country
            server_metrics.country_stats[country] = server_metrics.country_stats.get(country, 0) + 1
        
        # Store in database
        visit_id = await database_manager.store_visit(visitor_data)
        
        # Send real-time notification to admin panel
        await websocket_manager.broadcast_to_admins("visit", visitor_data.dict())
        
        # Queue Discord notification
        background_tasks.add_task(
            discord_notifier.send_visit_notification, visitor_data
        )
        
        logger.info(
            "Visit logged successfully",
            extra={
                "visit_id": visit_id,
                "is_form_submission": visitor_data.is_form_submission,
                "client_ip": visitor_data.client_ip,
            }
        )
        
        return VisitResponse(
            success=True,
            visit_id=visit_id,
            timestamp=visitor_data.timestamp
        )
        
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        logger.error(f"Error logging visit: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Get all visits (for admin panel)
@app.get("/api/clicks", response_model=List[VisitorData])
async def get_visits():
    """Retrieve all stored visits"""
    try:
        visits = await database_manager.get_all_visits()
        return visits
    except Exception as e:
        logger.error(f"Error retrieving visits: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Admin endpoint to get detailed visit
@app.get("/admin/visit/{visit_id}")
async def get_visit_details(
    visit_id: str,
    password: str = None
):
    """Get detailed visit information (admin only)"""
    try:
        # Verify admin password
        admin_password = os.getenv("ADMIN_PASSWORD")
        if not password or password != admin_password:
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        visit = await database_manager.get_visit_by_id(visit_id)
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
            
        return visit
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving visit details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# WebSocket endpoint for admin panel
@app.websocket("/admin")
async def admin_websocket(websocket):
    """WebSocket connection for admin panel"""
    await websocket_manager.handle_admin_connection(websocket)

# API info endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Somatic Visitor Intelligence API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "log_visit": "POST /api/log-visit",
            "get_visits": "GET /api/clicks",
            "admin_websocket": "WS /admin"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    # Load environment variables
    load_environment()
    
    # Start server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        reload=os.getenv("NODE_ENV") == "development",
        access_log=True
    )