#!/usr/bin/env python3
"""
Simple startup test for Somatic Python Server
"""

import sys
import os
from pathlib import Path

# Add python_server to path
sys.path.insert(0, str(Path("python_server").resolve()))

def test_basic_imports():
    """Test basic imports"""
    try:
        print("Testing FastAPI...")
        import fastapi
        print("✅ FastAPI available")
        
        print("Testing Pydantic...")
        import pydantic
        print("✅ Pydantic available")
        
        print("Testing our modules...")
        os.environ["ADMIN_PASSWORD"] = "test123456"
        
        from python_server.models import VisitorData, VisitRequest
        print("✅ Models imported")
        
        from python_server.utils import generate_visit_id
        print("✅ Utils imported")
        
        from python_server.logger_config import logger
        print("✅ Logger imported")
        
        # Test basic functionality
        visit_id = generate_visit_id()
        print(f"✅ Generated visit ID: {visit_id}")
        
        visitor_data = VisitorData(
            url="https://test.com",
            client_ip="127.0.0.1", 
            user_agent="Test Agent"
        )
        print("✅ Created visitor data object")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_server_creation():
    """Test server creation"""
    try:
        print("\nTesting server creation...")
        from python_server.main import app
        print("✅ FastAPI app created successfully")
        
        # Test routes
        routes = [route.path for route in app.routes if hasattr(route, 'path')]
        print(f"✅ Found {len(routes)} routes")
        for route in routes[:5]:  # Show first 5 routes
            print(f"   - {route}")
        
        return True
        
    except Exception as e:
        print(f"❌ Server creation error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing Somatic Python Server Startup\n")
    
    success1 = test_basic_imports()
    success2 = test_server_creation()
    
    if success1 and success2:
        print("\n🎉 All tests passed! Server is ready.")
        print("\n🚀 To start the server:")
        print("   cd python_server")
        print("   python main.py")
    else:
        print("\n❌ Tests failed. Please fix the issues above.")
        sys.exit(1)

