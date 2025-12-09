#!/bin/bash

# Railway Database Setup Script
# This script ensures DATABASE_URL is correctly set in the Next.js service

set -e

echo "🚀 Setting up Railway database connection..."

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

# Link to project if not already linked
echo "📦 Checking Railway project link..."
if ! railway status &> /dev/null; then
    echo "   Linking to Railway project..."
    railway link
fi

# Get MySQL service DATABASE_URL
echo "🔍 Fetching MySQL service DATABASE_URL..."
MYSQL_PUBLIC_URL=$(railway variables --service MySQL 2>/dev/null | grep "MYSQL_PUBLIC_URL" | awk -F'│' '{print $3}' | xargs)

if [ -z "$MYSQL_PUBLIC_URL" ]; then
    echo "⚠️  MYSQL_PUBLIC_URL not found. Trying MYSQL_URL..."
    MYSQL_PUBLIC_URL=$(railway variables --service MySQL 2>/dev/null | grep "MYSQL_URL" | awk -F'│' '{print $3}' | xargs)
fi

if [ -z "$MYSQL_PUBLIC_URL" ]; then
    echo "❌ Could not find MySQL DATABASE_URL. Please check Railway MySQL service variables."
    exit 1
fi

echo "✅ Found MySQL URL: ${MYSQL_PUBLIC_URL:0:30}..."

# Switch to Next.js service (SilverkingbyCAI)
echo "🔄 Switching to Next.js service..."
railway service SilverkingbyCAI 2>/dev/null || railway service silverkingbycai 2>/dev/null || {
    echo "⚠️  Could not switch service. Please run manually:"
    echo "   railway service SilverkingbyCAI"
    echo "   railway variables set DATABASE_URL=\"$MYSQL_PUBLIC_URL\""
    exit 1
}

# Set DATABASE_URL in Next.js service
echo "⚙️  Setting DATABASE_URL in Next.js service..."
railway variables set "DATABASE_URL=$MYSQL_PUBLIC_URL"

# Verify it was set
CURRENT_DB_URL=$(railway variables 2>/dev/null | grep "DATABASE_URL" | awk -F'│' '{print $3}' | xargs)
if [ -n "$CURRENT_DB_URL" ]; then
    echo "✅ DATABASE_URL set successfully: ${CURRENT_DB_URL:0:30}..."
else
    echo "⚠️  DATABASE_URL might not be set. Please verify manually:"
    echo "   railway variables"
fi

# Regenerate Prisma client
echo "🔄 Regenerating Prisma client..."
railway run npx prisma generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart your Railway service: railway restart"
echo "   2. Verify database connection: railway run npx prisma migrate status"
echo "   3. Create a new batch in production: /admin/products/page2/create"
echo "   4. Test root key verification with the new batch"
