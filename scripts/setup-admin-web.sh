#!/bin/bash

echo "🚀 Setting up VPS for FinApp Admin Web"

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p /opt/apps/finapp-admin
sudo chown -R $USER:$USER /opt/apps/finapp-admin
chmod 755 /opt/apps/finapp-admin

# Setup PM2 startup
echo "⚙️  Setting up PM2 startup..."
pm2 startup

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run the PM2 startup command shown above"
echo "2. Run: pm2 save"
echo "3. Configure GitHub Actions variables"
echo "4. Push to main branch to trigger deployment"