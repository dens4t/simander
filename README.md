# ORDER 2025 System

Sistem Manajemen Order berbasis web untuk mengelola pengadaan barang/jasa pemerintah.

## Fitur

- **Dashboard**: Ringkasan statistik order dan quick actions
- **Order Management**: CRUD order dengan status tracking
- **Vendor Management**: Kelola database vendor/penyedia
- **Responsive Design**: Tampilan optimal di desktop dan mobile
- **Local Data Persistence**: Data tersimpan di browser

## Tech Stack

- **Frontend**: Alpine.js + Vanilla JavaScript + Tailwind CSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Hosting**: Cloudflare Pages
- **No Build Required**: Static HTML/JS, langsung bisa dibuka di browser

## Installation

1. Clone repository:

```bash
git clone <repository-url>
cd order-2025-system
```

2. Start development server:

```bash
npx serve -p 3000
```

3. Buka browser di `http://localhost:3000`

## Demo Login

```
Email: admin@dlh.com
Password: admin
```

## Deployment

### 1. Setup Cloudflare D1 Database

```bash
# Login ke Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create order-2025-db

# Update wrangler.toml dengan database ID
```

### 2. Apply Database Schema

```bash
# Apply schema ke database
npx wrangler d1 execute order-2025-db --file=./database/schema.sql --remote
```

### 3. Deploy Workers API

```bash
cd workers
npx wrangler deploy
```

### 4. Deploy Frontend ke Pages

Static files siap diupload ke Cloudflare Pages atau hosting apapun.

## Project Structure

```
order-2025-system/
├── index.html              # Main HTML dengan Alpine.js templates
├── src/
│   ├── app.js              # Alpine.js application logic
│   ├── alpine.js           # Alpine.js library (local)
│   ├── tailwind.js         # Tailwind CSS library (local)
│   └── assets/
│       └── main.css        # Custom styles
├── workers/                # Cloudflare Workers API
│   ├── src/
│   │   ├── handlers/       # API handlers (auth, orders, vendors)
│   │   └── index.js        # Worker entry point
│   └── wrangler.toml       # Workers config
├── database/
│   └── schema.sql          # D1 database schema
└── package.json
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Orders

- `GET /api/v1/orders` - List orders (with query params: search, status, page, limit)
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:id` - Get order detail
- `PUT /api/v1/orders/:id` - Update order
- `DELETE /api/v1/orders/:id` - Delete order
- `GET /api/v1/orders/stats` - Dashboard statistics (no auth required)

### Vendors

- `GET /api/v1/vendors` - List vendors (with query params: search, status, page, limit)
- `POST /api/v1/vendors` - Create vendor
- `GET /api/v1/vendors/:id` - Get vendor detail
- `PUT /api/v1/vendors/:id` - Update vendor
- `DELETE /api/v1/vendors/:id` - Delete vendor
- `GET /api/v1/vendors/search` - Search vendors (with query param: q)

## Frontend Deployment ke Cloudflare Pages

1. Build (atau langsung upload folder):

```bash
# Upload folder ke Cloudflare Pages
npx wrangler pages deploy . --project-name=order-2025
```

2. Atau gunakan Git integration di Cloudflare Dashboard

3. Set API URL di app.js sesuai dengan Workers deployment URL

## Offline Mode

Aplikasi menggunakan mock data untuk demo. Untuk production, koneksikan ke Cloudflare Workers API.

## License

MIT
