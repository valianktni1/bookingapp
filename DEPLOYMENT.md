# Weddings By Mark - Self-Hosted Deployment Guide

## For TrueNAS with Dockge & Nginx Proxy Manager

### Prerequisites
- TrueNAS SCALE with Docker support
- Dockge installed (or Docker Compose)
- Nginx Proxy Manager installed
- Domain: booking.perfectweddingsbymark.uk pointing to your TrueNAS IP

### Volume Paths to Create
Before deploying, create these directories on TrueNAS:

```bash
# App data
mkdir -p /mnt/apps/appdata/weddings-by-mark/mongodb
mkdir -p /mnt/apps/appdata/weddings-by-mark/backend

# Customer data backups
mkdir -p /mnt/weddings_backups/bookings_data
mkdir -p /mnt/weddings_backups/bookings_data/invoices
mkdir -p /mnt/weddings_backups/bookings_data/contracts
mkdir -p /mnt/weddings_backups/bookings_data/exports
```

### Quick Start with Dockge

1. **Copy the application to TrueNAS**
   ```bash
   # Copy the entire /app folder to your TrueNAS
   # e.g., /mnt/apps/stacks/weddings-by-mark/
   ```

2. **In Dockge:**
   - Create a new stack named `weddings-by-mark`
   - Paste contents of `dockge-compose.yaml`
   - Click Deploy

3. **Or with Docker Compose:**
   ```bash
   cd /mnt/apps/stacks/weddings-by-mark
   docker-compose up -d
   ```

### Port Configuration
- **Frontend:** Port 3005 (changed from default 3000)
- **Backend API:** Port 8001
- **MongoDB:** Internal only (not exposed)

### Configure Nginx Proxy Manager

Add a new Proxy Host:

**Details Tab:**
- Domain Names: `booking.perfectweddingsbymark.uk`
- Scheme: `http`
- Forward Hostname/IP: Your TrueNAS IP (e.g., `192.168.1.100`)
- Forward Port: `3005`
- Cache Assets: ON
- Block Common Exploits: ON
- Websockets Support: ON

**SSL Tab:**
- SSL Certificate: Request new Let's Encrypt certificate
- Force SSL: ON
- HTTP/2 Support: ON

**Advanced Tab:**
```nginx
location /api {
    proxy_pass http://192.168.1.100:8001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
(Replace `192.168.1.100` with your TrueNAS IP)

### Access URLs
- Admin Dashboard: https://booking.perfectweddingsbymark.uk
- Client Portal: https://booking.perfectweddingsbymark.uk/portal/{token}
- Enquiry Form: https://booking.perfectweddingsbymark.uk/enquiry

### Data Storage

| Path | Purpose |
|------|---------|
| `/mnt/apps/appdata/weddings-by-mark/mongodb` | MongoDB database files |
| `/mnt/apps/appdata/weddings-by-mark/backend` | Backend app logs, temp files |
| `/mnt/weddings_backups/bookings_data` | Customer data for backup |
| `/mnt/weddings_backups/bookings_data/invoices` | Invoice PDFs |
| `/mnt/weddings_backups/bookings_data/contracts` | Signed contracts |
| `/mnt/weddings_backups/bookings_data/exports` | Data exports |

### Backup MongoDB

```bash
# Create backup
docker exec wbm-mongodb mongodump --out /data/backup

# Copy backup to backup location
docker cp wbm-mongodb:/data/backup /mnt/weddings_backups/bookings_data/mongodb-$(date +%Y%m%d)

# Restore from backup
docker cp /mnt/weddings_backups/bookings_data/mongodb-YYYYMMDD wbm-mongodb:/data/backup
docker exec wbm-mongodb mongorestore /data/backup
```

### Accounts Integration

The CRM includes an **"Sync to Accounts"** toggle on each invoice:
- **ON (default):** Invoice will sync to accounts.weddingsbymark.co.uk
- **OFF:** Invoice won't sync (for existing bookings already in accounts)

This is admin-only and not visible on client invoices.

### Environment Variables

Edit `docker-compose.yml` or `dockge-compose.yaml`:

```yaml
backend:
  environment:
    - MONGO_URL=mongodb://mongodb:27017
    - DB_NAME=weddings_by_mark
    - CORS_ORIGINS=https://booking.perfectweddingsbymark.uk
    - BACKUP_PATH=/data/backups
    - PDF_PATH=/data/backups/invoices

frontend:
  build:
    args:
      - REACT_APP_BACKEND_URL=https://booking.perfectweddingsbymark.uk
```

### Updating the Application

```bash
cd /mnt/apps/stacks/weddings-by-mark
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Troubleshooting

1. **Check container logs:**
   ```bash
   docker logs wbm-backend
   docker logs wbm-frontend
   docker logs wbm-mongodb
   ```

2. **Check container status:**
   ```bash
   docker ps -a | grep wbm
   ```

3. **Restart all services:**
   ```bash
   docker-compose restart
   ```

4. **Reset database (WARNING: deletes all data):**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### File Structure
```
/mnt/apps/stacks/weddings-by-mark/
├── docker-compose.yml      # Standard compose
├── dockge-compose.yaml     # Dockge-optimized
├── DEPLOYMENT.md           # This file
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/

/mnt/apps/appdata/weddings-by-mark/
├── mongodb/                # Database files
└── backend/                # App data

/mnt/weddings_backups/bookings_data/
├── invoices/               # Invoice PDFs
├── contracts/              # Signed contracts
└── exports/                # Data exports
```
