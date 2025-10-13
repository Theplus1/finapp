# CI/CD Setup Guide

This project uses **GitHub Actions** for automated deployment to VPS.

## How It Works

Every push to `main` branch automatically:
1. ✅ Pulls latest code on VPS
2. ✅ Builds Docker image
3. ✅ Deploys application
4. ✅ Verifies deployment

---

## Initial Setup

### Step 1: Prepare Your VPS

SSH into your VPS and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/apps/finapp-server
sudo chown -R $USER:$USER /opt/apps/finapp-server
```

**Note:** 
- Git is NOT required on VPS. GitHub Actions uses `rsync` to sync files directly.
- `.env` file will be automatically created from GitHub Secrets during deployment.

### Step 2: Generate SSH Key for GitHub Actions

On your **local machine** (not VPS), generate a new SSH key:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions-vps
```

This creates:
- `~/.ssh/github-actions-vps` (private key) - for GitHub Secrets
- `~/.ssh/github-actions-vps.pub` (public key) - for VPS

### Step 3: Add Public Key to VPS

Copy the public key to your VPS:

```bash
# View public key
cat ~/.ssh/github-actions-vps.pub

# Copy it, then SSH to VPS and add it
ssh your-user@your-vps-ip

# On VPS:
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key, save and exit

# Set proper permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Configure GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

#### **Infrastructure Secrets:**

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VPS_SSH_KEY` | Private key content | Content of `~/.ssh/github-actions-vps` |
| `VPS_HOST` | VPS IP or domain | `123.45.67.89` or `vps.example.com` |
| `VPS_USER` | SSH username | `devtool` or `ubuntu` |
| `APP_DIR` | App directory path | `/opt/apps/finapp-server` |

#### **Application Secrets:**

| Secret Name | Value | Example |
|-------------|-------|---------|
| `BOT_TOKEN` | Telegram bot token | `8177728781:AAF1H1tstHFEgu1x6xSK...` |
| `MODE` | Bot mode | `polling` or `webhook` |
| `WEBHOOK_URL` | Webhook URL (if webhook mode) | `https://yourdomain.com` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster...` |
| `NOTIFICATION_CRON` | Cron schedule | `0 9 * * *` |
| `SLASH_API_KEY` | Slash API key | `bf072dbbed557a6953bc08d...` |
| `SLASH_BASE_URL` | Slash API URL | `https://api.joinslash.com` |
| `SLASH_TIMEOUT` | API timeout | `30000` |
| `SLASH_WEBHOOK_SECRET` | Webhook secret | `your_webhook_secret_here` |

**To get private key content:**
```bash
cat ~/.ssh/github-actions-vps
```

Copy **everything** including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

**Benefits of using GitHub Secrets:**
- ✅ Centralized secret management
- ✅ Easy to update without SSH to VPS
- ✅ Secrets never committed to repository
- ✅ Industry standard for CI/CD

### Step 5: Test Deployment

Push to main branch:

```bash
git add .
git commit -m "feat: setup CI/CD"
git push origin main
```

Watch the deployment:
- Go to **Actions** tab in GitHub
- Click on the running workflow
- Monitor the deployment progress

---

## Usage

### Automatic Deployment

Simply push to `main`:
```bash
git push origin main
```

### Manual Deployment

Trigger manually from GitHub:
1. Go to **Actions** tab
2. Select **Deploy to VPS** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

---

## Monitoring

### View Deployment Status

Check GitHub Actions tab for:
- ✅ Build status
- ✅ Deployment logs
- ✅ Error messages

### View Application Logs

SSH to VPS:
```bash
ssh your-user@your-vps-ip
cd /opt/apps/finapp-server
docker-compose -f docker-compose.prod.yml logs -f
```

### Check Container Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

---

## Troubleshooting

### Deployment Failed: SSH Connection

**Error:** `Permission denied (publickey)`

**Solution:**
1. Verify public key is in VPS `~/.ssh/authorized_keys`
2. Check VPS SSH config allows key authentication
3. Verify `VPS_SSH_KEY` secret contains correct private key

### Deployment Failed: Rsync Error

**Error:** `rsync: command not found`

**Solution:**
```bash
# Rsync is usually pre-installed on Ubuntu/Debian
# If missing, install it:
sudo apt install rsync -y
```

### Deployment Failed: Docker Permission

**Error:** `permission denied while trying to connect to Docker`

**Solution:**
```bash
# On VPS
sudo usermod -aG docker $USER
# Logout and login again
```

### Container Not Starting

**Check logs:**
```bash
cd /opt/apps/finapp-server
docker-compose -f docker-compose.prod.yml logs
```

**Common issues:**
- Missing environment variables in `.env`
- Invalid MongoDB Atlas connection string
- Port 3000 already in use

---

## Security Best Practices

### 1. Protect SSH Keys
- ✅ Never commit private keys to repository
- ✅ Use dedicated SSH key for CI/CD (not your personal key)
- ✅ Rotate keys periodically

### 2. Secure GitHub Secrets
- ✅ Use GitHub Secrets for sensitive data
- ✅ Never hardcode credentials in workflow files
- ✅ Limit repository access

### 3. VPS Security
```bash
# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### 4. Environment Variables
- ✅ Keep `.env` file secure on VPS
- ✅ Never commit `.env` to repository
- ✅ Use strong passwords and API keys

---

## Advanced Configuration

### Deploy to Multiple Environments

Create separate workflows for staging/production:

**`.github/workflows/deploy-staging.yml`**
```yaml
on:
  push:
    branches:
      - develop
```

**`.github/workflows/deploy-production.yml`**
```yaml
on:
  push:
    branches:
      - main
```

Use different secrets for each environment:
- `STAGING_VPS_HOST`, `STAGING_VPS_USER`, etc.
- `PROD_VPS_HOST`, `PROD_VPS_USER`, etc.

### Add Slack/Discord Notifications

Add notification step to workflow:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Add Health Check

Add health check endpoint to your app, then verify:

```yaml
- name: Health Check
  run: |
    sleep 10
    curl -f http://${{ secrets.VPS_HOST }}:3000/health || exit 1
```

---

## Rollback Strategy

If deployment fails, rollback to previous version:

```bash
# SSH to VPS
ssh your-user@your-vps-ip
cd /opt/apps/finapp-server

# Rollback to previous commit
git log --oneline -n 5  # Find previous commit hash
git reset --hard <previous-commit-hash>

# Redeploy
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Cost

**GitHub Actions:**
- ✅ Free for public repositories
- ✅ 2,000 minutes/month for private repositories (free tier)
- ✅ This workflow uses ~2-3 minutes per deployment

**Estimated usage:** 60-90 minutes/month (30 deployments)

---

## Next Steps

- [ ] Setup CI/CD ✅
- [ ] Configure GitHub Secrets
- [ ] Test first deployment
- [ ] Setup monitoring (optional)
- [ ] Configure notifications (optional)
- [ ] Add health check endpoint (optional)

---

## Quick Reference

```bash
# View logs on VPS
docker-compose -f docker-compose.prod.yml logs -f

# Restart application
docker-compose -f docker-compose.prod.yml restart

# Check status
docker-compose -f docker-compose.prod.yml ps

# Manual redeploy
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

For VPS initial setup, see [VPS-DEPLOYMENT-GUIDE.md](./VPS-DEPLOYMENT-GUIDE.md)
