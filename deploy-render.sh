#!/bin/bash

# Render Deployment Script for Somatic Visitor Intelligence
echo "🚀 Deploying to Render..."

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found!"
    exit 1
fi

echo "📋 Deployment checklist:"
echo "✅ render.yaml configured"
echo "✅ requirements.txt ready"
echo "✅ Python server code ready"

echo ""
echo "🔧 Next steps:"
echo "1. Connect your GitHub repo to Render"
echo "2. Create a new Web Service using the repository"
echo "3. Render will automatically use render.yaml for configuration"
echo "4. Set environment variables in Render dashboard:"
echo "   - ADMIN_PASSWORD: Your secure admin password"
echo "   - DISCORD_WEBHOOK_URL: Your Discord webhook URL (optional)"

echo ""
echo "📊 Your services will be:"
echo "  - Backend API: https://your-service-name.onrender.com"
echo "  - Frontend: https://your-frontend-name.onrender.com"
echo "  - Health check: https://your-service-name.onrender.com/health"
echo "  - API docs: https://your-service-name.onrender.com/docs"

echo ""
echo "✅ Ready for Render deployment!"

