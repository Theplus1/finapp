#!/bin/bash
set -euo pipefail

# =============================================================================
# Staging VPS Setup Script for finapp
# 
# Prerequisites:
#   - Fresh Ubuntu 22.04+ VPS
#   - Run as root: sudo bash setup-staging-vps.sh
#
# What this installs:
#   - Docker (for finapp-server)
#   - Node.js 20 (for admin-web)
#   - PM2 (process manager for admin-web)
#   - rsync (for admin-web file sync from CI/CD)
#
# After running this script, you need to:
#   1. Add the GitHub Actions SSH public key to the deploy user's authorized_keys
#   2. Configure GitHub Environment secrets/variables for "staging"
# =============================================================================

# --- Configuration ---
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SERVER_APP_DIR="${SERVER_APP_DIR:-/home/$DEPLOY_USER/apps/finapp-server}"
ADMIN_APP_DIR="${ADMIN_APP_DIR:-/home/$DEPLOY_USER/apps/admin-web}"

echo "========================================="
echo "  finapp Staging VPS Setup"
echo "========================================="
echo ""
echo "Deploy user:    $DEPLOY_USER"
echo "Server app dir: $SERVER_APP_DIR"
echo "Admin app dir:  $ADMIN_APP_DIR"
echo ""

# --- System Updates ---
echo "📦 Updating system packages..."
apt-get update -y
# apt-get upgrade -y

# --- Install essential packages ---
echo "📦 Installing essential packages..."
apt-get install -y \
  curl \
  wget \
  git \
  rsync \
  ufw \
  fail2ban \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release

# --- Install Docker ---
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed: $(docker --version)"
else
  echo "Docker already installed: $(docker --version)"
fi

# --- Install Node.js 20 ---
echo "📗 Installing Node.js 20..."
if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
  # Remove old Node.js and conflicting packages to avoid dpkg overwrite errors
  apt-get remove -y nodejs libnode-dev libnode72 2>/dev/null || true
  apt-get autoremove -y
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "Node.js installed: $(node -v)"
else
  echo "Node.js already installed: $(node -v)"
fi

# --- Install PM2 ---
echo "🔄 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  echo "PM2 installed: $(pm2 -v)"
else
  echo "PM2 already installed: $(pm2 -v)"
fi

# --- Create deploy user ---
echo "👤 Setting up deploy user: $DEPLOY_USER"
if ! id "$DEPLOY_USER" &> /dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  echo "User '$DEPLOY_USER' created"
else
  echo "User '$DEPLOY_USER' already exists"
fi

# Add deploy user to docker group (so they can run docker without sudo)
usermod -aG docker "$DEPLOY_USER"

# --- Setup SSH for deploy user ---
echo "🔑 Setting up SSH for deploy user..."
DEPLOY_HOME="/home/$DEPLOY_USER"
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
touch "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"

# --- Create application directories ---
echo "📁 Creating application directories..."
mkdir -p "$SERVER_APP_DIR/public/exports"
mkdir -p "$ADMIN_APP_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SERVER_APP_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ADMIN_APP_DIR"

# --- Setup PM2 startup for deploy user ---
echo "🔄 Setting up PM2 startup..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$DEPLOY_USER" --hp "$DEPLOY_HOME"

# --- Setup firewall ---
echo "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
# Add your app ports here (uncomment/modify as needed)
# ufw allow 3000/tcp  # finapp-server
# ufw allow 3001/tcp  # admin-web
ufw --force enable
echo "Firewall configured"

# --- Setup fail2ban ---
# echo "🛡️ Configuring fail2ban..."
# systemctl enable fail2ban
# systemctl start fail2ban

# --- Print summary ---
echo ""
echo "========================================="
echo "  ✅ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Add your GitHub Actions SSH public key:"
echo "   echo 'YOUR_PUBLIC_KEY' >> /home/$DEPLOY_USER/.ssh/authorized_keys"
echo ""
echo "2. Open firewall ports for your apps:"
echo "   ufw allow <SERVER_PORT>/tcp"
echo "   ufw allow <ADMIN_PORT>/tcp"
echo ""
echo "3. Configure GitHub Environment 'staging' with these variables:"
echo "   VPS_HOST      = <this-server-ip>"
echo "   VPS_USER      = $DEPLOY_USER"
echo "   SERVER_APP_DIR = $SERVER_APP_DIR"
echo "   ADMIN_APP_DIR  = $ADMIN_APP_DIR"
echo ""
echo "4. Test SSH connection from your local machine:"
echo "   ssh $DEPLOY_USER@<this-server-ip>"
echo ""
echo "5. Test Docker access as deploy user:"
echo "   su - $DEPLOY_USER -c 'docker ps'"
echo ""
