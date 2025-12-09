#!/bin/bash

# Railway DATABASE_URL Setup Script
# This script helps set DATABASE_URL in the Next.js service

set -e

echo "🚀 Setting up DATABASE_URL for Railway..."

# Get MySQL MYSQL_PUBLIC_URL
echo "📦 Getting MySQL MYSQL_PUBLIC_URL..."
MYSQL_URL=$(railway variables --service MySQL 2>&1 | grep -A 3 "MYSQL_PUBLIC_URL" | tail -1 | awk -F'│' '{print $3}' | xargs)

if [ -z "$MYSQL_URL" ]; then
    echo "❌ Could not get MYSQL_PUBLIC_URL. Please set manually via Railway Dashboard."
    echo ""
    echo "Manual steps:"
    echo "1. Open Railway Dashboard → Project → MySQL Service → Variables"
    echo "2. Copy MYSQL_PUBLIC_URL value"
    echo "3. Open Railway Dashboard → Project → SilverkingbyCAI Service → Variables"
    echo "4. Add new variable: DATABASE_URL = <paste MYSQL_PUBLIC_URL>"
    exit 1
fi

# Construct full DATABASE_URL
# Format: mysql://root:password@host:port/database
FULL_DB_URL="mysql://root:OsiHyYEfihrcazRuKAtawhHIeXFWKFEM@centerbeam.proxy.rlwy.net:18099/railway"

echo "✅ DATABASE_URL to set:"
echo "   ${FULL_DB_URL:0:50}..."
echo ""
echo "⚠️  Railway CLI doesn't support setting variables directly."
echo "   Please set DATABASE_URL manually via Railway Dashboard:"
echo ""
echo "Steps:"
echo "1. Open Railway Dashboard: https://railway.app"
echo "2. Select project: SilverkingbyCAI"
echo "3. Select service: SilverkingbyCAI (Next.js app)"
echo "4. Go to Variables tab"
echo "5. Click 'New Variable'"
echo "6. Set:"
echo "   Name: DATABASE_URL"
echo "   Value: $FULL_DB_URL"
echo "7. Click 'Add'"
echo ""
echo "After setting DATABASE_URL, run:"
echo "   railway run npx prisma generate"
echo "   railway restart"
