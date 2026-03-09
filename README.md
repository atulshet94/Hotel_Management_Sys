# Sanman Lodge Hotel Management System

This workspace is now organized as a full React + Node + MySQL hotel system.

It includes:

- secure password-based login with owner and employee routing
- employee dashboard for check-in, check-out, billing, room status, and guest records
- owner dashboard for read-only occupancy and booking overview
- owner settings for lodge branding, GST, and billing configuration
- MySQL-backed rooms and bookings APIs
- scanned ID upload and browser camera guest photo capture

## Railway deployment

This repo is a monorepo, so deploying the repository root directly to Railway without a root app definition causes the error:

- `Script start.sh not found`
- `Railpack could not determine how to build the app`

The root [package.json](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/package.json) now fixes that by giving Railway a build target and start target:

- `npm run build` builds the React frontend
- `npm start` runs the Express backend
- the backend serves [lodge-frontend/dist](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-frontend/dist) in production

### Railway steps

1. Create one Railway service from this repository.
2. Deploy the repository root `SanmanLodge/`.
3. Add the required backend variables in Railway:

```env
PORT=5000
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=sanmanlodge
DEFAULT_OWNER_PASSWORD=Owner@123
DEFAULT_EMPLOYEE_PASSWORD=Emp@123
```

4. Set `CORS_ORIGIN` only if you want to restrict allowed browser origins. Leave it empty for same-service Railway deploys.
5. After the first successful deploy, open a Railway shell and run:

```bash
npm run set-passwords
```

If you prefer separate frontend and backend services, set each Railway service root directory to [lodge-frontend](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-frontend) and [lodge-backend](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-backend) instead of deploying the repo root as one app.

## Project structure

```text
SanmanLodge/
├─ database/
│  └─ schema.sql
├─ lodge-backend/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
│  ├─ .env.example
│  ├─ package.json
│  ├─ server.js
│  └─ setPassword.js
└─ lodge-frontend/
   ├─ src/
   │  ├─ components/
   │  │  ├─ auth/
   │  │  └─ layout/
   │  ├─ features/
   │  │  ├─ employee/
   │  │  └─ owner/
   │  ├─ services/
   │  ├─ styles/
   │  └─ utils/
   ├─ .env.example
   ├─ package.json
   └─ vite.config.js
```

## Local setup

### 1. Create the MySQL database

Use MySQL Workbench, phpMyAdmin, or the MySQL command line and run:

```sql
SOURCE path/to/SanmanLodge/database/schema.sql;
```

If you are using phpMyAdmin:

1. Create or select the `sanmanlodge` database.
2. Open the `Import` tab.
3. Import [schema.sql](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/database/schema.sql).

If you already created the database earlier, import the updated schema again so `system_settings` and the `gst_percentage` booking column are added.

### 2. Configure the backend

From [lodge-backend](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-backend):

1. Copy `.env.example` to `.env`.
2. Update the MySQL credentials in `.env`.
3. Install packages:

```bash
npm install
```

4. Seed the default passwords:

```bash
npm run set-passwords
```

5. Start the API:

```bash
npm run dev
```

The backend runs on `http://localhost:5000`.

Default passwords:

- Owner: `Owner@123`
- Employee: `Emp@123`

### 3. Configure the frontend

From [lodge-frontend](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-frontend):

1. Copy `.env.example` to `.env`.
2. Keep `VITE_API_URL=http://localhost:5000` for local development.
3. Install packages:

```bash
npm install
```

4. Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production deployment

This project needs a host that supports:

- static file hosting for the React build
- a persistent Node.js process for the backend API
- a MySQL database

Shared hosting without Node.js support is not a good fit for this codebase.

### Recommended production flow

### 1. Prepare the server

Install:

- Node.js 20+
- MySQL 8+
- Nginx or Apache
- PM2 for keeping the backend running

### 2. Deploy the database

Import [schema.sql](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/database/schema.sql) into the production MySQL server.

### 3. Deploy the backend

Upload [lodge-backend](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-backend) to the server, then run:

```bash
cd lodge-backend
npm install --omit=dev
cp .env.example .env
```

Edit `.env` with production values:

```env
PORT=5000
CORS_ORIGIN=https://yourdomain.com
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=sanmanlodge
DEFAULT_OWNER_PASSWORD=Owner@123
DEFAULT_EMPLOYEE_PASSWORD=Emp@123
```

Set the passwords once:

```bash
npm run set-passwords
```

Start the backend with PM2:

```bash
pm2 start server.js --name sanman-lodge-api
pm2 save
```

### 4. Deploy the frontend

Before building the frontend, set the production API URL.

If the frontend and backend are on the same domain behind a reverse proxy:

```env
VITE_API_URL=https://yourdomain.com
```

Then build:

```bash
cd lodge-frontend
npm install
npm run build
```

Upload the contents of [lodge-frontend/dist](/c:/Users/atuln/OneDrive/Desktop/HotelSystem/SanmanLodge/lodge-frontend/dist) to your web root such as `/var/www/sanman-lodge`.

### 5. Configure reverse proxy

Example Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/sanman-lodge;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /login {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
    }
}
```

After editing Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Notes

- The check-in screen supports uploading scanned ID images and browser camera capture.
- Direct low-level control of scanner or printer hardware is not available in a normal browser app. For that, you would need a desktop app or vendor-specific driver integration.
- Bills are designed for browser print and "Save as PDF" flow, so no extra PDF package is required.
