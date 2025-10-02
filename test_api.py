#!/usr/bin/env python3
"""
Test the Somatic API endpoints
"""

import requests
import json
import time

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get("http://localhost:5000/health")
        print(f"Health Check: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_api_info():
    """Test API info endpoint"""
    try:
        response = requests.get("http://localhost:5000/")
        print(f"API Info: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"API info failed: {e}")
        return False

def test_log_visit():
    """Test visit logging"""
    try:
        visit_data = {
            "url": "https://test.example.com",
            "referrer": "https://google.com",
            "form_submission": False,
            "technical_data": {
                "screen": {"width": 1920, "height": 1080},
                "browser": "Chrome",
                "os": "Windows"
            },
            "behavioral_data": {
                "mouseMovements": 50,
                "timeOnPage": 30.5
            }
        }
        
        response = requests.post(
            "http://localhost:5000/api/log-visit",
            json=visit_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Log Visit: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
        
    except Exception as e:
        print(f"Log visit failed: {e}")
        return False

def test_log_form_submission():
    """Test form submission logging"""
    try:
        form_data = {
            "url": "https://test.example.com/contact",
            "form_submission": True,
            "form_data": {
                "personal_info": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "email": "john@example.com"
                },
                "contact_info": {
                    "phone": "+1234567890",
                    "message": "Test message"
                },
                "form_id": "contact-form"
            },
            "technical_data": {
                "screen": {"width": 1920, "height": 1080},
                "browser": "Firefox",
                "os": "macOS"
            }
        }
        
        response = requests.post(
            "http://localhost:5000/api/log-visit",
            json=form_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Log Form: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
        
    except Exception as e:
        print(f"Log form failed: {e}")
        return False

def test_get_visits():
    """Test getting all visits"""
    try:
        response = requests.get("http://localhost:5000/api/clicks")
        print(f"Get Visits: {response.status_code}")
        visits = response.json()
        print(f"Found {len(visits)} visits")
        
        if visits:
            print("Latest visit:")
            print(json.dumps(visits[-1], indent=2))
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"Get visits failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Somatic API Endpoints\n")
    
    tests = [
        ("Health Check", test_health),
        ("API Info", test_api_info),
        ("Log Visit", test_log_visit),
        ("Log Form Submission", test_log_form_submission),
        ("Get Visits", test_get_visits),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Testing: {test_name}")
        print('='*50)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"Test failed: {e}")
            results.append((test_name, False))
        
        time.sleep(1)  # Brief pause between tests
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} {status}")
        if result:
            passed += 1
    
    print(f"\nPassed: {passed}/{len(results)} tests")
    
    if passed == len(results):
        print("🎉 All API tests passed!")
    else:
        print("⚠️  Some tests failed")

