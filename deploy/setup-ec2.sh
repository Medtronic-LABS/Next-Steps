#!/usr/bin/env bash
set -e

# ==============================================================================
# Next Steps & OpenPHC CCE Mock Automated Deployment Script for Ubuntu 24.04 LTS
# Target Server: AWS EC2 (13.232.251.63)
# Subdomain: nextsteps.mdtlabs.org
# ==============================================================================

DOMAIN="${1:-nextsteps.mdtlabs.org}"
APP_DIR="/var/www/next-steps"

echo "===================================================================="
echo " Starting Next Steps & CCE Deployment on domain: ${DOMAIN}"
echo "===================================================================="

# 1. Update system packages
sudo apt update -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx ufw

# 2. Install Node.js 20 LTS (if not installed)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Clone or pull the repository (dev branch)
sudo mkdir -p /var/www
if [ -d "${APP_DIR}/.git" ]; then
    echo "Repository exists. Pulling latest dev branch..."
    cd "${APP_DIR}"
    sudo git fetch origin dev
    sudo git checkout dev
    sudo git pull origin dev
else
    echo "Cloning Medtronic-LABS/Next-Steps (dev branch)..."
    sudo rm -rf "${APP_DIR}"
    sudo git clone -b dev https://github.com/Medtronic-LABS/Next-Steps.git "${APP_DIR}"
fi

sudo chown -R ubuntu:ubuntu "${APP_DIR}"
cd "${APP_DIR}"

# 4. Install dependencies and build production web bundle
echo "Installing NPM dependencies..."
npm install

echo "Building production Vite React distribution..."
npm run build

# 5. Configure systemd service for CCE Mock Engine (Port 8080)
echo "Configuring CCE Mock background service..."
sudo tee /etc/systemd/system/cce-mock.service > /dev/null <<EOF
[Unit]
Description=OpenPHC Care Coordination Engine (CCE) Mock Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${APP_DIR}
ExecStart=$(which node) ${APP_DIR}/cce-local-mock.cjs
Restart=always
RestartSec=5
Environment=PORT=8080
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cce-mock
sudo systemctl restart cce-mock

# 6. Configure Nginx Reverse Proxy
echo "Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/nextsteps > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # CCE Mock Collector & API endpoints
    location /v1/ {
        proxy_pass http://127.0.0.1:8080/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Next Steps Web Application (SPA)
    location / {
        root ${APP_DIR}/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/nextsteps /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. Check if DNS is pointing before running certbot
echo "===================================================================="
echo "Deployment complete!"
echo "HTTP is live at: http://${DOMAIN}"
echo "CCE Health check: http://${DOMAIN}/v1/health"
echo ""
echo "Once Raghu / IT points DNS (${DOMAIN} -> 13.232.251.63), enable HTTPS by running:"
echo "sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}"
echo "===================================================================="
