# Deployment Checklist - ORDER 2025 System

## ✅ What's Been Done

### 1. Frontend (Complete)

- Built with Alpine.js + Tailwind CSS
- All local resources (no CDN dependencies)
- Single HTML file with embedded templates
- LocalStorage persistence for offline support
- Mock data for demo mode

### 2. Backend API (Complete)

- Cloudflare Workers API ready
- Endpoints:
  - POST /api/v1/auth/login
  - POST /api/v1/auth/logout
  - GET /api/v1/auth/me
  - GET /api/v1/orders (CRUD)
  - GET /api/v1/vendors (CRUD)
  - GET /api/v1/orders/stats (dashboard)
  - GET /api/v1/vendors/search

### 3. Database (Schema Ready)

- D1 schema with tables: users, vendors, orders, audit_logs
- Indexes for performance
- Sample data included

## 📋 Deployment Steps

### Step 1: Deploy Cloudflare Workers API

```bash
cd workers
npx wrangler login
npx wrangler deploy
```

Note the deployment URL (e.g., `order-2025-api.<username>.workers.dev`)

### Step 2: Setup D1 Database

```bash
# Create database (if not exists)
npx wrangler d1 create order-2025-db

# Apply schema
npx wrangler d1 execute order-2025-db --file=../database/schema.sql --remote
```

### Step 3: Update Frontend API URL

Edit `src/app.js` and set:

```javascript
const API_BASE_URL = "https://your-workers-api.workers.dev";
```

### Step 4: Deploy Frontend to Cloudflare Pages

**Option A: Using Wrangler CLI**

```bash
npx wrangler pages deploy . --project-name=order-2025
```

**Option B: Using Git Integration**

1. Push code to GitHub
2. Connect repo in Cloudflare Dashboard
3. Set build settings (no build needed for static HTML)

**Option C: Manual Upload**

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Upload all files from current folder

## 🔧 Configuration

### Environment Variables (Optional)

For production, set these in Cloudflare Workers:

- `JWT_SECRET`: Secret key for token generation
- `ENVIRONMENT`: 'production' or 'development'

### CORS Settings

The API allows all origins (\*) for development. In production, update `workers/src/index.js` to restrict:

```javascript
'Access-Control-Allow-Origin': 'https://your-pages-domain.pages.dev'
```

## 🧪 Testing

### Local Development

```bash
# Start local server
npx serve -p 3000

# Access: http://localhost:3000
# Login: admin@dlh.com / admin
```

### API Testing

```bash
# Health check
curl https://your-api.workers.dev/health

# Login
curl -X POST https://your-api.workers.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dlh.com","password":"admin"}'
```

## 📁 Files Ready for Deployment

```
├── index.html              ✅ Ready
├── src/
│   ├── app.js              ✅ Ready (update API URL)
│   ├── alpine.js           ✅ Ready
│   └── tailwind.js         ✅ Ready
├── workers/                ✅ Ready
├── database/schema.sql     ✅ Ready
├── package.json            ✅ Ready
└── deploy-pages.sh         ✅ Ready
```

## 🚨 Troubleshooting

### "Failed to fetch" errors

- Check if API URL is correct in src/app.js
- Verify CORS headers in workers/src/index.js
- Check browser console for details

### Database errors

- Ensure D1 database is created and schema applied
- Check wrangler.toml for correct database binding
- Verify database ID in wrangler.toml matches actual D1 database

### Login failures

- Ensure default admin user exists in database
- Password hash in schema: SHA-256 of 'admin'
- Check API logs in Cloudflare dashboard

## 📞 Support

- Cloudflare Docs: https://developers.cloudflare.com/
- Workers: https://developers.cloudflare.com/workers/
- D1: https://developers.cloudflare.com/d1/
- Pages: https://developers.cloudflare.com/pages/
