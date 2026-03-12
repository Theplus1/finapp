#!/bin/bash
set -euo pipefail

# =============================================================================
# Nginx + SSL Setup Script for finapp
# 
# Prerequisites:
#   - VPS already setup with setup-staging-vps.sh
#   - Domain DNS A records pointing to this server
#   - Run as root: sudo bash setup-nginx-ssl.sh
#
# What this does:
#   - Installs Nginx
#   - Installs Certbot for Let's Encrypt SSL
#   - Configures Nginx reverse proxy for server + admin-web
#   - Obtains SSL certificates
#   - Sets up auto-renewal
# =============================================================================

# --- Configuration ---
# You can override these via environment variables
SERVER_DOMAIN="${SERVER_DOMAIN:-api.example.com}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.example.com}"
SERVER_PORT="${SERVER_PORT:-3000}"
ADMIN_PORT="${ADMIN_PORT:-3001}"
EMAIL="${EMAIL:-admin@example.com}"

echo "========================================="
echo "  Nginx + SSL Setup for finapp"
echo "========================================="
echo ""
echo "Server domain: $SERVER_DOMAIN -> localhost:$SERVER_PORT"
echo "Admin domain:  $ADMIN_DOMAIN -> localhost:$ADMIN_PORT"
echo "Email:         $EMAIL"
echo ""
read -p "Continue with these settings? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted. Set environment variables and try again:"
  echo "  SERVER_DOMAIN=api.yourdomain.com ADMIN_DOMAIN=admin.yourdomain.com EMAIL=you@email.com bash setup-nginx-ssl.sh"
  exit 1
fi

# --- Install Nginx ---
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
  apt-get update -y
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
  echo "Nginx installed: $(nginx -v 2>&1)"
else
  echo "Nginx already installed: $(nginx -v 2>&1)"
fi

# --- Install Certbot ---
echo "🔒 Installing Certbot..."
if ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx
  echo "Certbot installed: $(certbot --version)"
else
  echo "Certbot already installed: $(certbot --version)"
fi

# --- Configure Nginx for Server (API) ---
echo "⚙️  Configuring Nginx for $SERVER_DOMAIN..."
cat > /etc/nginx/sites-available/finapp-server << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_DOMAIN;

    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS (will be added after SSL setup)
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration (will be auto-configured by certbot)
EOF

# --- Configure Nginx for Admin Web ---
echo "⚙️  Configuring Nginx for $ADMIN_DOMAIN..."
cat > /etc/nginx/sites-available/finapp-admin << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $ADMIN_DOMAIN;

    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS (will be added after SSL setup)
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration (will be auto-configured by certbot)
EOF

# --- Enable sites ---
echo "🔗 Enabling Nginx sites..."
ln -sf /etc/nginx/sites-available/finapp-server /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/finapp-admin /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# --- Obtain SSL Certificates ---
echo "🔒 Obtaining SSL certificates..."
echo ""
echo "This will obtain certificates for:"
echo "  - $SERVER_DOMAIN"
echo "  - $ADMIN_DOMAIN"
echo ""

# Obtain certificate for server domain
certbot --nginx -d "$SERVER_DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

# Obtain certificate for admin domain
certbot --nginx -d "$ADMIN_DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

# --- Update Nginx configs with reverse proxy ---
echo "⚙️  Updating Nginx configs with reverse proxy settings..."

# Server (API) config
cat > /etc/nginx/sites-available/finapp-server << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$SERVER_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$SERVER_DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Increase client body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Telegram webhook endpoint (no buffering)
    location /webhook {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    # Access and error logs
    access_log /var/log/nginx/finapp-server.access.log;
    error_log /var/log/nginx/finapp-server.error.log;
}
EOF

# Admin Web config
cat > /etc/nginx/sites-available/finapp-admin << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $ADMIN_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $ADMIN_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$ADMIN_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$ADMIN_DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Increase client body size
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:$ADMIN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Access and error logs
    access_log /var/log/nginx/finapp-admin.access.log;
    error_log /var/log/nginx/finapp-admin.error.log;
}
EOF

# Test and reload Nginx
nginx -t
systemctl reload nginx

# --- Setup auto-renewal ---
echo "🔄 Setting up SSL auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
certbot renew --dry-run

# --- Open firewall ports ---
echo "🔥 Ensuring firewall allows HTTP/HTTPS..."
ufw allow 'Nginx Full'

echo ""
echo "========================================="
echo "  ✅ Nginx + SSL Setup Complete!"
echo "========================================="
echo ""
echo "Your sites are now available at:"
echo "  🌐 https://$SERVER_DOMAIN (API)"
echo "  🌐 https://$ADMIN_DOMAIN (Admin)"
echo ""
echo "SSL certificates will auto-renew via certbot.timer"
echo ""
echo "Useful commands:"
echo "  - Check Nginx status:    systemctl status nginx"
echo "  - Test Nginx config:     nginx -t"
echo "  - Reload Nginx:          systemctl reload nginx"
echo "  - View access logs:      tail -f /var/log/nginx/finapp-*.access.log"
echo "  - View error logs:       tail -f /var/log/nginx/finapp-*.error.log"
echo "  - Check SSL renewal:     certbot renew --dry-run"
echo "  - List certificates:     certbot certificates"
echo ""
echo "Next steps:"
echo "  1. Update your GitHub Environment variables:"
echo "     WEBHOOK_URL = https://$SERVER_DOMAIN/webhook"
echo "     SERVER_BASE_URL = https://$SERVER_DOMAIN"
echo "     RESOURCE_BASE_URL = https://$SERVER_DOMAIN"
echo ""
echo "  2. Make sure your apps are running:"
echo "     docker ps (check finapp-server)"
echo "     pm2 list (check admin-web)"
echo ""
