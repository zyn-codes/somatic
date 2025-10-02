#!/bin/bash

# Vercel Deployment Script for Somatic Visitor Intelligence
echo "🚀 Deploying to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build frontend
echo "🔨 Building frontend..."
npm install
npm run build

# Set environment variables in Vercel
echo "🔧 Setting environment variables..."
echo "Please set these environment variables in your Vercel dashboard:"
echo "  - ADMIN_PASSWORD: Your secure admin password"
echo "  - DISCORD_WEBHOOK_URL: Your Discord webhook URL (optional)"

# Deploy
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📊 Your app should be available at your Vercel domain"
echo "🔗 API docs will be at: https://your-domain.vercel.app/docs"

