#!/usr/bin/env python3
"""
Somatic Python Server Startup Script
Production-ready startup with comprehensive configuration
"""

import os
import sys
import asyncio
import signal
import multiprocessing
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from logger_config import logger
from utils import load_environment


class SomaticServer:
    """Production server management"""
    
    def __init__(self):
        self.server = None
        self.shutdown_event = asyncio.Event()
        
    async def startup(self):
        """Server startup sequence"""
        try:
            # Load environment
            load_environment()
            
            # Log startup
            logger.info("Starting Somatic Python Server")
            logger.info(f"Environment: {os.getenv('NODE_ENV', 'production')}")
            logger.info(f"Port: {os.getenv('PORT', '5000')}")
            logger.info(f"Workers: {self.get_worker_count()}")
            
            # Setup signal handlers
            self.setup_signal_handlers()
            
            return True
            
        except Exception as e:
            logger.error(f"Startup failed: {e}")
            return False
    
    def setup_signal_handlers(self):
        """Setup graceful shutdown signal handlers"""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating graceful shutdown...")
            self.shutdown_event.set()
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def get_worker_count(self) -> int:
        """Calculate optimal worker count"""
        try:
            workers = int(os.getenv('MAX_WORKERS', '0'))
            if workers > 0:
                return workers
            
            # Auto-calculate based on CPU count
            cpu_count = multiprocessing.cpu_count()
            
            if os.getenv('NODE_ENV') == 'development':
                return 1
            else:
                # Production: 2 * CPU + 1 (but max 4 for memory usage)
                return min(4, (2 * cpu_count) + 1)
                
        except Exception:
            return 1
    
    def get_uvicorn_config(self) -> dict:
        """Get Uvicorn configuration"""
        return {
            "app": "main:app",
            "host": os.getenv("HOST", "0.0.0.0"),
            "port": int(os.getenv("PORT", 5000)),
            "workers": self.get_worker_count(),
            "log_level": os.getenv("LOG_LEVEL", "info").lower(),
            "access_log": True,
            "reload": os.getenv("NODE_ENV") == "development",
            "reload_dirs": ["./"] if os.getenv("NODE_ENV") == "development" else None,
            "loop": "asyncio",
            "http": "httptools",
            "ws": "websockets",
            "lifespan": "on",
            "use_colors": True,
            "server_header": False,  # Security: don't expose server info
            "date_header": True,
        }
    
    async def run(self):
        """Run the server"""
        if not await self.startup():
            sys.exit(1)
        
        config = self.get_uvicorn_config()
        
        try:
            if config["workers"] > 1:
                # Multi-worker mode
                logger.info(f"Starting server with {config['workers']} workers")
                uvicorn.run(**config)
            else:
                # Single worker mode with graceful shutdown
                server = uvicorn.Server(uvicorn.Config(**config))
                
                # Start server in background
                server_task = asyncio.create_task(server.serve())
                
                # Wait for shutdown signal
                await self.shutdown_event.wait()
                
                # Graceful shutdown
                logger.info("Initiating graceful shutdown...")
                server.should_exit = True
                await server_task
                
        except Exception as e:
            logger.error(f"Server error: {e}")
            sys.exit(1)
        
        logger.info("Server shutdown complete")


def check_requirements():
    """Check system requirements"""
    try:
        import fastapi
        import uvicorn
        import sqlmodel
        import aiofiles
        import aiohttp
        import loguru
        
        # Check Python version
        if sys.version_info < (3, 8):
            logger.error("Python 3.8+ is required")
            return False
        
        # Check required directories
        Path("data").mkdir(exist_ok=True)
        Path("logs").mkdir(exist_ok=True)
        
        return True
        
    except ImportError as e:
        logger.error(f"Missing required package: {e}")
        logger.error("Run: pip install -r requirements.txt")
        return False
    except Exception as e:
        logger.error(f"System check failed: {e}")
        return False


def main():
    """Main entry point"""
    print("🚀 Somatic Python Server")
    print("=" * 50)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Load environment variables
    load_dotenv()
    
    # Create and run server
    server = SomaticServer()
    
    try:
        if sys.platform == "win32":
            # Windows-specific event loop policy
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        asyncio.run(server.run())
        
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

