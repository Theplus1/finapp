# Deployment Workflows

This directory contains GitHub Actions workflows for deploying applications to VPS.

## Workflows

### 1. Deploy Server (`deploy-server.yml`)
Deploys the NestJS backend server using Docker.

**Triggers:**
- Push to `main` branch with changes in `apps/server/**` or `packages/**`
- Manual workflow dispatch

**Required GitHub Secrets:**
- `VPS_SSH_KEY` - SSH private key for VPS access
- `BOT_TOKEN` - Telegram bot token
- `MONGO_URI` - MongoDB connection string
- `SLASH_API_KEY` - Slash API key
- `SLASH_WEBHOOK_SECRET` - Slash webhook secret

**Required GitHub Variables:**
- `VPS_HOST` - VPS hostname or IP
- `VPS_USER` - VPS username
- `SERVER_APP_DIR` - Server deployment directory on VPS (e.g., `/var/www/finapp-server`)
- `MODE` - Application mode (e.g., `production`)
- `WEBHOOK_URL` - Webhook URL for the bot
- `PORT` - Server port
- `NOTIFICATION_CRON` - Cron expression for notifications
- `SLASH_BASE_URL` - Slash API base URL
- `SLASH_TIMEOUT` - Slash API timeout

**Deployment Method:** Docker Compose

---

### 2. Deploy Admin Web (`deploy-admin-web.yml`)
Deploys the Next.js admin dashboard.

**Triggers:**
- Push to `main` branch with changes in `apps/admin-web/**` or `packages/**`
- Manual workflow dispatch

**Required GitHub Secrets:**
- `VPS_SSH_KEY` - SSH private key for VPS access

**Required GitHub Variables:**
- `VPS_HOST` - VPS hostname or IP
- `VPS_USER` - VPS username
- `ADMIN_APP_DIR` - Admin web deployment directory on VPS (e.g., `/var/www/finapp-admin`)
- `ADMIN_PORT` - Port for admin web (e.g., `3002`)
- `ADMIN_API_URL` - API URL for admin app
- `ADMIN_APP_NAME` - Application name (e.g., `FinApp Admin`)

**Deployment Method:** PM2 (Node.js process manager)

---

## Setup Instructions

### 1. Configure GitHub Secrets
Go to your repository → Settings → Secrets and variables → Actions

Add all required secrets listed above.

### 2. Configure GitHub Variables
Go to your repository → Settings → Secrets and variables → Actions → Variables tab

Add all required variables listed above.

### 3. VPS Prerequisites

#### For Server (Docker):
```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER

# Create deployment directory
sudo mkdir -p /var/www/finapp-server
sudo chown $USER:$USER /var/www/finapp-server

# Ensure docker-compose.prod.yml exists in the server directory
```

#### For Admin Web (PM2):
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Create deployment directory
sudo mkdir -p /var/www/finapp-admin
sudo chown $USER:$USER /var/www/finapp-admin
```

### 4. SSH Key Setup
```bash
# Generate SSH key pair (if not exists)
ssh-keygen -t ed25519 -C "github-actions"

# Add public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@vps-host

# Copy private key content to GitHub Secrets as VPS_SSH_KEY
cat ~/.ssh/id_ed25519
```

---

## Manual Deployment

To manually trigger a deployment:
1. Go to Actions tab in GitHub
2. Select the workflow (Deploy Server or Deploy Admin Web)
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

---

## Deployment Architecture

```
VPS Server
├── /var/www/finapp-server/          # Server (Docker)
│   ├── docker-compose.prod.yml
│   ├── Dockerfile
│   ├── .env
│   └── [server files]
│
└── /var/www/finapp-admin/           # Admin Web (PM2)
    ├── .next/
    ├── package.json
    ├── .env.production
    └── [admin-web files]
```

---

## Monitoring

### Server (Docker)
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### Admin Web (PM2)
```bash
# View logs
pm2 logs admin-web

# Check status
pm2 status

# Restart
pm2 restart admin-web

# Monitor
pm2 monit
```
