"""
Simplified Logging Configuration for Somatic Python Server
Basic structured logging for serverless deployment
"""

import os
import sys
from pathlib import Path

try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    LOGURU_AVAILABLE = False

def setup_logger():
    """Setup simplified logging system"""
    
    if LOGURU_AVAILABLE:
        # Remove default handler
        logger.remove()
        
        # Console logging
        logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
            level="INFO",
            colorize=True
        )
        
        # File logging (if possible)
        try:
            logs_dir = Path("logs")
            logs_dir.mkdir(exist_ok=True)
            
            logger.add(
                logs_dir / "somatic_{time:YYYY-MM-DD}.log",
                rotation="1 day",
                retention="7 days",
                level="DEBUG",
                format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}"
            )
        except Exception:
            # Skip file logging in serverless environments
            pass
        
        logger.info("Loguru logging initialized")
        
    else:
        # Fallback to standard logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s | %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        # Create logger-compatible object
        class LoggerAdapter:
            def __init__(self):
                self._logger = logging.getLogger("somatic")
            
            def info(self, message, **kwargs):
                self._logger.info(message)
            
            def warning(self, message, **kwargs):
                self._logger.warning(message)
            
            def error(self, message, **kwargs):
                self._logger.error(message)
            
            def debug(self, message, **kwargs):
                self._logger.debug(message)
        
        global logger
        logger = LoggerAdapter()
        logger.info("Standard logging initialized")
    
    return logger

# Initialize logger
if LOGURU_AVAILABLE:
    logger = setup_logger()
else:
    setup_logger()