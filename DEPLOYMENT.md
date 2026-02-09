# Weddings By Mark - Self-Hosted Deployment Guide

## For TrueNAS with Nginx Proxy Manager

### Prerequisites
- TrueNAS with Docker/Portainer support
- Nginx Proxy Manager installed
- Domain: booking.perfectweddingsbymark.uk pointing to your TrueNAS IP

### Quick Start

1. **Copy the application to TrueNAS**
   ```bash
   # Copy the entire /app folder to your TrueNAS
   # e.g., /mnt/pool/docker/weddings-by-mark/
   ```

2. **Start the containers**
   ```bash
   cd /mnt/pool/docker/weddings-by-mark
   docker-compose up -d
   ```

3. **Configure Nginx Proxy Manager**
   
   Add a new Proxy Host:
   - **Domain Names:** booking.perfectweddingsbymark.uk
   - **Scheme:** http
   - **Forward Hostname/IP:** wbm-frontend (or your TrueNAS IP)
   - **Forward Port:** 3000
   - **Enable:** Websockets Support, Block Common Exploits
   - **SSL:** Request a new SSL certificate with Force SSL

4. **Access your CRM**
   - Admin: https://booking.perfectweddingsbymark.uk
   - Client Portal: https://booking.perfectweddingsbymark.uk/portal/{token}
   - Enquiry Form: https://booking.perfectweddingsbymark.uk/enquiry

### Environment Variables

Edit `docker-compose.yml` to customize:

```yaml
backend:
  environment:
    - MONGO_URL=mongodb://mongodb:27017
    - DB_NAME=weddings_by_mark
    - CORS_ORIGINS=https://booking.perfectweddingsbymark.uk

frontend:
  build:
    args:
      - REACT_APP_BACKEND_URL=https://booking.perfectweddingsbymark.uk
```

### Backup MongoDB Data

```bash
# Backup
docker exec wbm-mongodb mongodump --out /data/backup

# Copy backup from container
docker cp wbm-mongodb:/data/backup ./mongodb-backup

# Restore
docker cp ./mongodb-backup wbm-mongodb:/data/backup
docker exec wbm-mongodb mongorestore /data/backup
```

### Updating the Application

```bash
cd /mnt/pool/docker/weddings-by-mark
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Troubleshooting

1. **Check container logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

2. **Restart services:**
   ```bash
   docker-compose restart
   ```

3. **Reset database:**
   ```bash
   docker-compose down -v  # Warning: deletes all data
   docker-compose up -d
   ```

### Nginx Proxy Manager Settings

For the proxy host configuration:

**Details Tab:**
- Domain Names: booking.perfectweddingsbymark.uk
- Scheme: http
- Forward Hostname/IP: 192.168.x.x (your TrueNAS IP) or wbm-frontend
- Forward Port: 3000
- Cache Assets: ON
- Block Common Exploits: ON
- Websockets Support: ON

**SSL Tab:**
- SSL Certificate: Request new Let's Encrypt certificate
- Force SSL: ON
- HTTP/2 Support: ON

**Advanced Tab (optional):**
```nginx
location /api {
    proxy_pass http://192.168.x.x:8001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### File Structure for TrueNAS
```
/mnt/pool/docker/weddings-by-mark/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
```
