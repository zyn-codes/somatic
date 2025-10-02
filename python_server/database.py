"""
Simplified Database Management for Visitor Data
Optimized for serverless deployment with JSON fallback
"""

import os
import json
import asyncio
import aiofiles
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

try:
    from sqlmodel import SQLModel, create_engine, Session, select
    from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    DATABASE_AVAILABLE = True
except ImportError:
    DATABASE_AVAILABLE = False

from models import *
from logger_config import logger


class DatabaseManager:
    """Simplified database management system"""
    
    def __init__(self):
        self.database_url = self._get_database_url()
        self.engine = None
        self.async_session = None
        
        # Data directory for file-based storage
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)
        
        # JSON file fallback
        self.json_file = self.data_dir / "visits.json"
    
    def _get_database_url(self) -> Optional[str]:
        """Get database URL from environment"""
        database_url = os.getenv("DATABASE_URL")
        
        if database_url and DATABASE_AVAILABLE:
            # Convert postgres:// to postgresql+asyncpg://
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
            return database_url
        else:
            # Use JSON file storage for serverless
            return None
    
    async def initialize(self):
        """Initialize database connection"""
        try:
            if self.database_url and DATABASE_AVAILABLE:
                logger.info(f"Initializing database: {self.database_url}")
                
                # Create async engine
                self.engine = create_async_engine(
                    self.database_url,
                    echo=False,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
                
                # Create session factory
                self.async_session = sessionmaker(
                    self.engine,
                    class_=AsyncSession,
                    expire_on_commit=False
                )
                
                # Create tables
                async with self.engine.begin() as conn:
                    await conn.run_sync(SQLModel.metadata.create_all)
                
                logger.info("Database initialized successfully")
            else:
                logger.info("Using JSON file storage")
            
        except Exception as e:
            logger.warning(f"Database initialization failed, using JSON fallback: {e}")
            self.engine = None
    
    async def close(self):
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()
    
    async def store_visit(self, visitor_data: VisitorData) -> str:
        """Store visitor data"""
        try:
            if self.engine:
                return await self._store_in_database(visitor_data)
            else:
                return await self._store_in_json(visitor_data)
                
        except Exception as e:
            logger.error(f"Error storing visit data: {e}")
            # Fallback to JSON
            return await self._store_in_json(visitor_data)
    
    async def _store_in_database(self, visitor_data: VisitorData) -> str:
        """Store visitor data in SQL database"""
        async with self.async_session() as session:
            visit_record = VisitRecord(
                visit_id=visitor_data.visit_id,
                timestamp=visitor_data.timestamp,
                visit_type=visitor_data.visit_type.value,
                client_ip=visitor_data.client_ip,
                country=visitor_data.geolocation.country if visitor_data.geolocation else None,
                is_form_submission=visitor_data.is_form_submission,
                visitor_data=visitor_data.dict(),
                form_data=visitor_data.form_data.dict() if visitor_data.form_data else None,
                technical_data={
                    "browser": visitor_data.browser_info.dict() if visitor_data.browser_info else None,
                    "device": visitor_data.device_info.dict() if visitor_data.device_info else None,
                    "screen": visitor_data.screen_info.dict() if visitor_data.screen_info else None,
                    "network": visitor_data.network_info.dict() if visitor_data.network_info else None,
                }
            )
            
            session.add(visit_record)
            await session.commit()
            
            return visitor_data.visit_id
    
    async def _store_in_json(self, visitor_data: VisitorData) -> str:
        """Store visitor data in JSON file"""
        try:
            # Convert to JSON-serializable format
            data = visitor_data.dict()
            data["timestamp"] = data["timestamp"].isoformat() if isinstance(data["timestamp"], datetime) else data["timestamp"]
            
            # Append to JSON file
            async with aiofiles.open(self.json_file, "a", encoding="utf-8") as f:
                await f.write(json.dumps(data, default=str) + "\n")
            
            return visitor_data.visit_id
            
        except Exception as e:
            logger.error(f"Error storing in JSON file: {e}")
            raise
    
    async def get_all_visits(self, limit: int = 1000) -> List[VisitorData]:
        """Get all stored visits"""
        try:
            if self.engine:
                return await self._get_from_database(limit)
            else:
                return await self._get_from_json(limit)
                
        except Exception as e:
            logger.error(f"Error retrieving visits: {e}")
            return []
    
    async def _get_from_database(self, limit: int) -> List[VisitorData]:
        """Get visits from SQL database"""
        async with self.async_session() as session:
            stmt = select(VisitRecord).order_by(VisitRecord.timestamp.desc()).limit(limit)
            result = await session.execute(stmt)
            records = result.scalars().all()
            
            visits = []
            for record in records:
                try:
                    visitor_data = VisitorData(**record.visitor_data)
                    visits.append(visitor_data)
                except Exception as e:
                    logger.warning(f"Error parsing visit record {record.visit_id}: {e}")
                    continue
            
            return visits
    
    async def _get_from_json(self, limit: int) -> List[VisitorData]:
        """Get visits from JSON file"""
        visits = []
        
        try:
            if not self.json_file.exists():
                return visits
            
            async with aiofiles.open(self.json_file, "r", encoding="utf-8") as f:
                lines = await f.readlines()
            
            # Parse JSON lines in reverse order (newest first)
            for line in reversed(lines[-limit:]):
                if not line.strip():
                    continue
                
                try:
                    data = json.loads(line.strip())
                    # Convert timestamp string back to datetime
                    if isinstance(data.get("timestamp"), str):
                        data["timestamp"] = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
                    
                    visitor_data = VisitorData(**data)
                    visits.append(visitor_data)
                    
                except Exception as e:
                    logger.warning(f"Error parsing JSON line: {e}")
                    continue
            
            return visits
            
        except Exception as e:
            logger.error(f"Error reading JSON file: {e}")
            return visits
    
    async def get_visit_by_id(self, visit_id: str) -> Optional[VisitorData]:
        """Get specific visit by ID"""
        try:
            if self.engine:
                return await self._get_by_id_from_database(visit_id)
            else:
                return await self._get_by_id_from_json(visit_id)
                
        except Exception as e:
            logger.error(f"Error retrieving visit {visit_id}: {e}")
            return None
    
    async def _get_by_id_from_database(self, visit_id: str) -> Optional[VisitorData]:
        """Get visit by ID from database"""
        async with self.async_session() as session:
            stmt = select(VisitRecord).where(VisitRecord.visit_id == visit_id)
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()
            
            if record:
                return VisitorData(**record.visitor_data)
            return None
    
    async def _get_by_id_from_json(self, visit_id: str) -> Optional[VisitorData]:
        """Get visit by ID from JSON file"""
        try:
            if not self.json_file.exists():
                return None
            
            async with aiofiles.open(self.json_file, "r", encoding="utf-8") as f:
                async for line in f:
                    if not line.strip():
                        continue
                    
                    try:
                        data = json.loads(line.strip())
                        if data.get("visit_id") == visit_id:
                            # Convert timestamp
                            if isinstance(data.get("timestamp"), str):
                                data["timestamp"] = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
                            return VisitorData(**data)
                    except Exception:
                        continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error searching JSON file: {e}")
            return None