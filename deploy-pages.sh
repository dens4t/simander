#!/bin/bash

# Deploy script for ORDER 2025 System to Cloudflare Pages

echo "🚀 Deploying ORDER 2025 System to Cloudflare Pages..."

# Check if wrangler is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Deploy to Cloudflare Pages
echo "📦 Uploading files to Cloudflare Pages..."
npx wrangler pages deploy . --project-name=order-2025

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set API URL in src/app.js to point to your Cloudflare Workers API"
    echo "2. Deploy Workers API: cd workers && npx wrangler deploy"
    echo "3. Setup D1 database: npx wrangler d1 execute order-2025-db --file=./database/schema.sql --remote"
    echo ""
    echo "🌐 Your app will be available at: https://order-2025.pages.dev"
else
    echo ""
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi
