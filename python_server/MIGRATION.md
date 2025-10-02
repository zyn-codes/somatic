# 🔄 Migration Guide: Node.js to Python

This document outlines the migration from the Node.js/Express backend to the new Python/FastAPI backend.

## 🎯 Migration Overview

### What Changed
- **Backend Framework**: Express.js → FastAPI
- **Language**: JavaScript/Node.js → Python 3.8+
- **Database**: JSON files (same) + Optional PostgreSQL
- **WebSockets**: Socket.IO → FastAPI WebSockets
- **Logging**: Winston → Loguru
- **Validation**: Custom middleware → Pydantic models

### What Stayed the Same
- **Frontend**: React application (unchanged)
- **API Endpoints**: Same URLs and response formats
- **Data Storage**: JSON file backup maintained
- **Discord Integration**: Enhanced but compatible
- **Admin Panel**: Same WebSocket communication

## 🚀 Quick Migration Steps

### 1. Prerequisites
```bash
# Install Python 3.8+
# Install pip/poetry
# Ensure Node.js/npm for frontend build
```

### 2. Setup Python Environment
```bash
cd python_server
pip install -r requirements.txt
cp env_example.txt .env
# Edit .env with your configuration
```

### 3. Environment Variables
```bash
# Required
ADMIN_PASSWORD=your_secure_password

# Optional
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 4. Data Migration
The Python server automatically reads existing `server/data/clicks.json` and migrates it to the new database format. No manual data migration required.

### 5. Start New Server
```bash
# Option 1: Direct start
cd python_server
python start_server.py

# Option 2: Use npm scripts
npm run start:python

# Option 3: Docker
docker-compose up --build
```

## 📊 API Compatibility

### Endpoints (100% Compatible)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/health` | GET | ✅ Enhanced |
| `/api/log-visit` | POST | ✅ Enhanced |
| `/api/clicks` | GET | ✅ Compatible |
| `/admin/visit/:id` | GET | ✅ Compatible |
| `/admin` WebSocket | WS | ✅ Enhanced |

### Request/Response Format
All API endpoints maintain the same request and response formats, ensuring frontend compatibility.

### Enhanced Features
- **Better validation** with Pydantic models
- **Improved error handling** with detailed error responses
- **Enhanced security** with advanced rate limiting
- **Better logging** with structured logs
- **Performance improvements** with async/await

## 🔧 Configuration Mapping

### Environment Variables
| Node.js | Python | Notes |
|---------|--------|-------|
| `ADMIN_PASSWORD` | `ADMIN_PASSWORD` | Same |
| `NODE_ENV` | `NODE_ENV` | Same |
| `PORT` | `PORT` | Same |
| `DISCORD_WEBHOOK_URL` | `DISCORD_WEBHOOK_URL` | Same |
| - | `DATABASE_URL` | New: PostgreSQL support |
| - | `JWT_SECRET` | New: Enhanced auth |

### File Structure
```
Old:
server/
├── index.js
├── middleware/
├── utils/
└── data/

New:
python_server/
├── main.py
├── models.py
├── data_collector.py
├── security.py
├── database.py
└── data/
```

## 🛡️ Security Enhancements

### New Security Features
1. **Web Application Firewall**: Automatic attack pattern detection
2. **Enhanced Rate Limiting**: Multiple algorithms and smart client detection
3. **Advanced VPN Detection**: Multi-vector analysis
4. **ML-based Anomaly Detection**: Behavioral analysis
5. **Comprehensive Input Validation**: Pydantic model validation

### Threat Detection Improvements
- **Better Bot Detection**: Enhanced user agent analysis
- **Fraud Scoring**: Advanced risk calculation
- **Real-time Monitoring**: Enhanced Discord alerts
- **Audit Logging**: Comprehensive security event logging

## 📈 Performance Improvements

### Speed Enhancements
- **Async/Await**: Full asynchronous processing
- **Database Connection Pooling**: Efficient database operations
- **Better Caching**: In-memory and persistent caching
- **Optimized Logging**: Structured and efficient logging

### Scalability
- **Multi-worker Support**: Horizontal scaling capability
- **Database Flexibility**: SQLite to PostgreSQL migration path
- **Container Ready**: Docker and orchestration support
- **Health Monitoring**: Built-in health checks and metrics

## 🔍 Data Collection Enhancements

### New Data Points
- **Enhanced Device Fingerprinting**: More hardware characteristics
- **Behavioral Analysis**: Mouse patterns, keystroke timing
- **Network Intelligence**: Advanced proxy/VPN detection
- **ML Features**: Machine learning feature extraction
- **Threat Intelligence**: External threat feed integration

### Improved Accuracy
- **Better Geolocation**: Enhanced IP geolocation
- **Device Classification**: Improved device type detection
- **Risk Assessment**: More accurate fraud scoring
- **Behavioral Patterns**: Advanced pattern recognition

## 🚨 Breaking Changes

### None for Frontend
The frontend requires no changes and will work seamlessly with the new Python backend.

### Deployment Changes
- **Different Runtime**: Python instead of Node.js
- **New Dependencies**: Python packages instead of npm
- **Container Updates**: New Dockerfile for Python

## 🐛 Troubleshooting

### Common Issues

**Import Errors**:
```bash
# Install missing packages
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.8+
```

**Database Issues**:
```bash
# Check database URL format
DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# For SQLite (default)
# Leave DATABASE_URL empty or set to sqlite+aiosqlite:///./data/somatic.db
```

**Permission Errors**:
```bash
# Ensure directories are writable
mkdir -p data logs
chmod 755 data logs
```

**Port Conflicts**:
```bash
# Change port if needed
export PORT=8000
python start_server.py
```

### Rollback Plan
If needed, you can rollback to the Node.js server:
1. Keep the `server/` directory backup
2. Restore the original `package.json` scripts
3. Run `npm run start` to use Node.js server

## 📚 Additional Resources

- **Python Server Documentation**: `python_server/README.md`
- **API Documentation**: http://localhost:5000/docs
- **Health Monitoring**: http://localhost:5000/health
- **Docker Deployment**: `docker-compose.yml`

## ✅ Migration Checklist

- [ ] Python 3.8+ installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Environment variables configured (`.env` file)
- [ ] Data directories created (`data/`, `logs/`)
- [ ] Frontend built (`npm run build`)
- [ ] Server started successfully
- [ ] Health check passes (`/health`)
- [ ] Admin panel accessible
- [ ] Discord notifications working (if configured)
- [ ] Form submissions tested
- [ ] Real-time updates verified

## 🎉 Post-Migration Benefits

After migration, you'll have:
- **Enhanced Security**: Advanced threat detection and prevention
- **Better Performance**: Async processing and optimized operations
- **Improved Monitoring**: Comprehensive logging and real-time alerts
- **Scalability**: Multi-worker and database scaling options
- **Modern Architecture**: Type-safe models and automated documentation
- **ML Capabilities**: Machine learning-based fraud detection
- **Production Ready**: Docker, health checks, and deployment automation

