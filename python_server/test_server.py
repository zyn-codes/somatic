#!/usr/bin/env python3
"""
Test script for Somatic Python Server
Validates all components and API endpoints
"""

import os
import sys
import asyncio
import json
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test all imports work correctly"""
    print("🧪 Testing imports...")
    
    try:
        # Test core imports
        from models import VisitorData, VisitRequest, HealthResponse
        print("✅ Models imported successfully")
        
        from utils import generate_visit_id, parse_user_agent_basic, load_environment
        print("✅ Utils imported successfully")
        
        from logger_config import logger
        print("✅ Logger imported successfully")
        
        from data_collector import VisitorDataCollector
        print("✅ Data collector imported successfully")
        
        from websocket_manager import WebSocketManager
        print("✅ WebSocket manager imported successfully")
        
        from discord_integration import DiscordNotifier
        print("✅ Discord integration imported successfully")
        
        from database import DatabaseManager
        print("✅ Database manager imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_environment():
    """Test environment configuration"""
    print("\n🔧 Testing environment...")
    
    try:
        # Set test environment variables
        os.environ["ADMIN_PASSWORD"] = "test_password_123"
        
        from utils import load_environment
        load_environment()
        print("✅ Environment loaded successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Environment error: {e}")
        return False

def test_models():
    """Test data models"""
    print("\n📊 Testing models...")
    
    try:
        from models import VisitorData, VisitRequest, PersonalInfo, ContactInfo
        
        # Test visit request
        visit_request = VisitRequest(
            url="https://test.com",
            form_submission=True,
            form_data={
                "personal_info": {
                    "firstName": "John",
                    "lastName": "Doe", 
                    "email": "john@example.com"
                },
                "form_id": "test-form"
            }
        )
        print("✅ VisitRequest model works")
        
        # Test visitor data
        visitor_data = VisitorData(
            url="https://test.com",
            client_ip="127.0.0.1",
            user_agent="Test Agent"
        )
        print("✅ VisitorData model works")
        
        # Test JSON serialization
        json_data = visitor_data.json()
        print("✅ JSON serialization works")
        
        return True
        
    except Exception as e:
        print(f"❌ Model error: {e}")
        return False

async def test_data_collector():
    """Test data collector"""
    print("\n🔍 Testing data collector...")
    
    try:
        from data_collector import VisitorDataCollector
        from models import VisitRequest
        
        collector = VisitorDataCollector()
        await collector.initialize()
        print("✅ Data collector initialized")
        
        # Mock request object
        class MockRequest:
            def __init__(self):
                self.headers = {
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "accept-language": "en-US,en;q=0.9"
                }
            
            @property
            def client(self):
                class Client:
                    host = "127.0.0.1"
                return Client()
        
        mock_request = MockRequest()
        
        visit_request = VisitRequest(
            url="https://test.com",
            user_agent="Test Agent",
            technical_data={
                "screen": {"width": 1920, "height": 1080}
            }
        )
        
        # Test data collection
        visitor_data = await collector.collect_comprehensive_data(visit_request, mock_request)
        print("✅ Data collection works")
        print(f"   Collected data for IP: {visitor_data.client_ip}")
        
        return True
        
    except Exception as e:
        print(f"❌ Data collector error: {e}")
        return False

async def test_database():
    """Test database functionality"""
    print("\n💾 Testing database...")
    
    try:
        from database import DatabaseManager
        from models import VisitorData
        
        db = DatabaseManager()
        await db.initialize()
        print("✅ Database initialized")
        
        # Test storing data
        visitor_data = VisitorData(
            url="https://test.com",
            client_ip="127.0.0.1",
            user_agent="Test Agent"
        )
        
        visit_id = await db.store_visit(visitor_data)
        print(f"✅ Data stored with ID: {visit_id}")
        
        # Test retrieving data
        visits = await db.get_all_visits(limit=1)
        print(f"✅ Retrieved {len(visits)} visits")
        
        await db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_fastapi_app():
    """Test FastAPI app creation"""
    print("\n🚀 Testing FastAPI app...")
    
    try:
        from main import app
        print("✅ FastAPI app created successfully")
        
        # Check routes
        routes = [route.path for route in app.routes]
        expected_routes = ["/health", "/api/log-visit", "/api/clicks"]
        
        for route in expected_routes:
            if any(r.startswith(route) for r in routes):
                print(f"✅ Route {route} found")
            else:
                print(f"⚠️  Route {route} not found")
        
        return True
        
    except Exception as e:
        print(f"❌ FastAPI error: {e}")
        return False

async def run_all_tests():
    """Run all tests"""
    print("🧪 Starting Somatic Python Server Tests\n")
    
    tests = [
        ("Imports", test_imports),
        ("Environment", test_environment), 
        ("Models", test_models),
        ("FastAPI App", test_fastapi_app),
        ("Data Collector", test_data_collector),
        ("Database", test_database)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n📋 Test Summary:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} {status}")
        if result:
            passed += 1
    
    print("=" * 50)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Server is ready to deploy.")
        return True
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        return False

if __name__ == "__main__":
    # Run tests
    success = asyncio.run(run_all_tests())
    
    if success:
        print("\n🚀 Ready to start server:")
        print("   python main.py")
        sys.exit(0)
    else:
        sys.exit(1)

