#!/usr/bin/env python3
"""
Simplified Somatic Server for Testing
Minimal dependencies version
"""

import os
import json
import time
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import uuid

# Global storage
visitors = []
server_stats = {
    "total_visits": 0,
    "total_form_submissions": 0,
    "start_time": time.time()
}

class SomaticHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        path = urlparse(self.path).path
        
        if path == "/health":
            self.send_health_response()
        elif path == "/api/clicks":
            self.send_visits_response()
        elif path == "/":
            self.send_api_info()
        else:
            self.send_404()
    
    def do_POST(self):
        """Handle POST requests"""
        path = urlparse(self.path).path
        
        if path == "/api/log-visit":
            self.handle_log_visit()
        else:
            self.send_404()
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def send_json_response(self, data, status_code=200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_health_response(self):
        """Send health check response"""
        uptime = time.time() - server_stats["start_time"]
        data = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime": uptime,
            "metrics": {
                "total_visits": server_stats["total_visits"],
                "total_form_submissions": server_stats["total_form_submissions"],
                "total_visitors": len(visitors)
            }
        }
        self.send_json_response(data)
    
    def send_visits_response(self):
        """Send all visits"""
        self.send_json_response(visitors[-100:])  # Last 100 visits
    
    def send_api_info(self):
        """Send API information"""
        data = {
            "name": "Somatic Visitor Intelligence API",
            "version": "2.0.0-simple",
            "endpoints": {
                "health": "GET /health",
                "log_visit": "POST /api/log-visit",
                "get_visits": "GET /api/clicks"
            },
            "status": "running"
        }
        self.send_json_response(data)
    
    def send_404(self):
        """Send 404 response"""
        self.send_json_response({"error": "Not found"}, 404)
    
    def handle_log_visit(self):
        """Handle visitor data logging"""
        try:
            # Get request data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            if post_data:
                visitor_data = json.loads(post_data.decode())
            else:
                visitor_data = {}
            
            # Extract visitor information
            client_ip = self.get_client_ip()
            user_agent = self.headers.get('User-Agent', '')
            
            # Create visitor record
            visit_record = {
                "visit_id": f"VISIT-{int(time.time())}-{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "client_ip": client_ip,
                "user_agent": user_agent,
                "url": visitor_data.get("url", ""),
                "referrer": visitor_data.get("referrer", ""),
                "is_form_submission": visitor_data.get("form_submission", False),
                "form_data": visitor_data.get("form_data"),
                "technical_data": visitor_data.get("technical_data", {}),
                "behavioral_data": visitor_data.get("behavioral_data", {}),
            }
            
            # Add to storage
            visitors.append(visit_record)
            server_stats["total_visits"] += 1
            
            if visit_record["is_form_submission"]:
                server_stats["total_form_submissions"] += 1
            
            # Limit storage to last 1000 visits
            if len(visitors) > 1000:
                visitors[:] = visitors[-1000:]
            
            # Save to file
            self.save_to_file(visit_record)
            
            # Log to console
            print(f"📊 New {'form submission' if visit_record['is_form_submission'] else 'visit'} from {client_ip}")
            
            # Send response
            response = {
                "success": True,
                "visit_id": visit_record["visit_id"],
                "timestamp": visit_record["timestamp"]
            }
            self.send_json_response(response)
            
        except Exception as e:
            print(f"❌ Error handling visit: {e}")
            self.send_json_response({"error": "Internal server error"}, 500)
    
    def get_client_ip(self):
        """Get client IP address"""
        # Try various headers for real IP
        forwarded_for = self.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = self.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return self.client_address[0]
    
    def save_to_file(self, visit_record):
        """Save visit to JSON file"""
        try:
            os.makedirs("data", exist_ok=True)
            with open("data/visits_simple.json", "a") as f:
                f.write(json.dumps(visit_record) + "\n")
        except Exception as e:
            print(f"⚠️  Could not save to file: {e}")
    
    def log_message(self, format, *args):
        """Override to reduce logging noise"""
        pass

def run_server(port=5000):
    """Run the simple server"""
    print(f"🚀 Starting Somatic Simple Server on port {port}")
    print(f"📊 Health check: http://localhost:{port}/health")
    print(f"📋 API info: http://localhost:{port}/")
    print(f"🔧 Admin password: {os.getenv('ADMIN_PASSWORD', 'test123456')}")
    print("Press Ctrl+C to stop\n")
    
    server = HTTPServer(('0.0.0.0', port), SomaticHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.shutdown()

if __name__ == "__main__":
    # Set default admin password if not set
    if not os.getenv("ADMIN_PASSWORD"):
        os.environ["ADMIN_PASSWORD"] = "test123456"
    
    port = int(os.getenv("PORT", 5000))
    run_server(port)

