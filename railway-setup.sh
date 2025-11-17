#!/bin/bash

# Railway Deployment Setup Script
# Pastikan sudah login: railway login

echo "🚀 Setting up Railway deployment..."

# 1. Link project (jika belum)
echo "📦 Linking project to Railway..."
railway link

# 2. Setup MySQL Service Environment Variables
echo "🗄️  Setting up MySQL service variables..."
railway service mysql

# MySQL akan auto-generate DATABASE_URL, tapi kita bisa set manual jika perlu
# railway variables set DATABASE_URL="mysql://root:password@mysql.railway.internal:3306/silverkingbycai" --service mysql

# 3. Setup GitHub Service (Next.js App) Environment Variables
echo "⚙️  Setting up GitHub service (Next.js) variables..."

# Switch ke GitHub service
railway service silverkingbycai

# Get MySQL service DATABASE_URL reference
MYSQL_DB_URL=$(railway variables --service mysql | grep DATABASE_URL | awk '{print $2}')

# Set environment variables untuk Next.js app
railway variables set DATABASE_URL="$MYSQL_DB_URL" --service silverkingbycai
railway variables set NEXTAUTH_URL="https://silverkingbycai-production.up.railway.app" --service silverkingbycai
railway variables set NEXTAUTH_SECRET="silverking-secret-change-in-production-2024" --service silverkingbycai
railway variables set NEXT_PUBLIC_APP_URL="https://silverkingbycai-production.up.railway.app" --service silverkingbycai
railway variables set NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS="false" --service silverkingbycai

# Optional: Set Node environment
railway variables set NODE_ENV="production" --service silverkingbycai

echo "✅ Environment variables set successfully!"
echo ""
echo "📋 Summary:"
echo "  - MySQL Service: DATABASE_URL configured"
echo "  - GitHub Service: All environment variables configured"
echo ""
echo "🚀 Ready to deploy! Run: railway up"



