#!/usr/bin/env bash
set -e

# ==============================================================================
# Next Steps & OpenPHC CCE Mock Automated Deployment Script for Ubuntu 24.04 LTS
# Target Server: AWS EC2 (13.232.251.63)
# Co-hosts alongside: vda-admin.mdtlabs.org & vda-api.mdtlabs.org
# Subdomains: nextsteps.mdtlabs.org & nextsteps-api.mdtlabs.org
# ==============================================================================

DOMAIN="${1:-nextsteps.mdtlabs.org}"
API_DOMAIN="${2:-nextsteps-api.mdtlabs.org}"
CCE_PORT="${CCE_PORT:-8088}"
APP_DIR="/var/www/next-steps"

echo "===================================================================="
echo " Starting Next Steps & CCE Deployment"
echo " Web UI Domain:   ${DOMAIN}"
echo " API Domain:      ${API_DOMAIN}"
echo " CCE Port:        ${CCE_PORT} (Isolated from existing VDA ports)"
echo " Server IP:       13.232.251.63"
echo "===================================================================="

# 1. Update system packages & ensure prerequisites
echo "[1/6] Checking system packages..."
sudo apt update -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# 2. Install Node.js 20 LTS (if not installed)
if ! command -v node &> /dev/null; then
    echo "[2/6] Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "[2/6] Node.js is already installed: $(node -v)"
fi

# 3. Clone or pull the repository (dev branch)
echo "[3/6] Setting up application repository at ${APP_DIR}..."
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
echo "[4/6] Installing dependencies and building production bundle..."
npm install
npm run build

# 5. Configure systemd service for CCE Mock Engine (Port 8088)
echo "[5/6] Configuring CCE Mock background service on port ${CCE_PORT}..."
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
Environment=PORT=${CCE_PORT}
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cce-mock
sudo systemctl restart cce-mock

# 6. Configure Nginx Virtual Host (Co-exists safely with vda-admin & vda-api)
echo "[6/6] Configuring isolated Nginx virtual host for Next Steps..."
sudo tee /etc/nginx/sites-available/nextsteps.conf > /dev/null <<EOF
# Next Steps Web Application & CCE Unified Host
server {
    listen 80;
    server_name ${DOMAIN};

    # CCE Mock Collector & API endpoints
    location /v1/ {
        proxy_pass http://127.0.0.1:${CCE_PORT}/v1/;
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

# Dedicated CCE API Subdomain (matches VDA architecture: vda-api.mdtlabs.org)
server {
    listen 80;
    server_name ${API_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${CCE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Safely enable only nextsteps.conf without touching any existing VDA virtual hosts
sudo ln -sf /etc/nginx/sites-available/nextsteps.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "===================================================================="
echo " Next Steps & CCE successfully configured on EC2!"
echo " Internal CCE Mock service: active on http://127.0.0.1:${CCE_PORT}"
echo " Web UI (HTTP):             http://${DOMAIN}"
echo " API Endpoint (HTTP):       http://${DOMAIN}/v1/health or http://${API_DOMAIN}/v1/health"
echo "===================================================================="
echo ""
echo "Once Raghu confirms the DNS entries point to 13.232.251.63, activate SSL with:"
echo "sudo certbot --nginx -d ${DOMAIN} -d ${API_DOMAIN}"
echo "===================================================================="
