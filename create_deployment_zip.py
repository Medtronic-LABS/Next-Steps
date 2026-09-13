import os
import shutil
import zipfile

base = r'c:\Users\devil\Desktop\next-steps'
pkg_dir = os.path.join(base, 'next_steps_ec2_deployment')
if os.path.exists(pkg_dir):
    shutil.rmtree(pkg_dir)
os.makedirs(pkg_dir, exist_ok=True)

print("Packaging Next-Steps Production EC2 Deployment...")

# 1. Backend Service
b_dir = os.path.join(pkg_dir, 'backend')
os.makedirs(b_dir, exist_ok=True)
shutil.copytree(os.path.join(base, 'backend', 'dist'), os.path.join(b_dir, 'dist'))
shutil.copy(os.path.join(base, 'backend', 'package.json'), os.path.join(b_dir, 'package.json'))
shutil.copy(os.path.join(base, 'backend', '.env'), os.path.join(b_dir, '.env'))
print("1. Backend packaged")

# 2. Web Admin Panel (Desktop / Web Portal)
shutil.copytree(os.path.join(base, 'admin panel', 'dist'), os.path.join(pkg_dir, 'admin-panel'))
print("2. Admin Panel packaged")

# 3. Mobile Web App (Responsive Frontline Field App with Relative Base)
shutil.copytree(os.path.join(base, 'mobile app', 'dist'), os.path.join(pkg_dir, 'mobile-web'))
print("3. Mobile Web App packaged")

# 4. Android APK
apk_src = os.path.join(base, 'NextSteps-MaternalCare.apk')
if os.path.exists(apk_src):
    shutil.copy(apk_src, os.path.join(pkg_dir, 'NextSteps-MaternalCare.apk'))
    print("4. NextSteps-MaternalCare.apk packaged")

# 5. docker-compose
shutil.copy(os.path.join(base, 'docker-compose.yml'), os.path.join(pkg_dir, 'docker-compose.yml'))

# 6. HTTP Nginx Virtual Hosts Config (Fallback / initial before SSL)
nginx_conf = """# ==============================================================================
# Next Steps Unified Host & Subdomains Configuration (HTTP Fallback)
# Target: 13.232.251.63 (AWS EC2)
# Co-hosts safely alongside VDA (vda-admin.mdtlabs.org & vda-api.mdtlabs.org)
# ==============================================================================

server {
    listen 80;
    server_name nextsteps.mdtlabs.org nextsteps-admin.mdtlabs.org 13.232.251.63 localhost;

    client_max_body_size 50M;

    # Admin Panel (Web based desktop / supervisor portal)
    location / {
        root /var/www/next-steps/admin-panel;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Redirect /admin to root
    location = /admin {
        return 301 /;
    }

    # Redirect /app to /app/ for relative asset resolution
    location = /app {
        return 301 /app/;
    }

    # Frontline Mobile Web App (Responsive PWA / Field Application)
    location /app/ {
        alias /var/www/next-steps/mobile-web/;
        index index.html;
        try_files $uri $uri/ /app/index.html;
    }

    # Direct Android APK Download links for frontline workers
    location = /apk {
        alias /var/www/next-steps/NextSteps-MaternalCare.apk;
        add_header Content-Disposition 'attachment; filename="NextSteps-MaternalCare.apk"';
        default_type application/vnd.android.package-archive;
    }

    location = /download {
        alias /var/www/next-steps/NextSteps-MaternalCare.apk;
        add_header Content-Disposition 'attachment; filename="NextSteps-MaternalCare.apk"';
        default_type application/vnd.android.package-archive;
    }

    # Backend API Proxy (Port 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend Health Check
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    server_name nextsteps-api.mdtlabs.org;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
"""
with open(os.path.join(pkg_dir, 'nginx.conf'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(nginx_conf)

# 7. HTTPS Nginx Virtual Hosts Config (Active when Let's Encrypt certificates exist)
nginx_ssl_conf = """# ==============================================================================
# Next Steps Unified Host & Subdomains Configuration (HTTPS & HTTP)
# Target: 13.232.251.63 (AWS EC2)
# Co-hosts safely alongside VDA (vda-admin.mdtlabs.org & vda-api.mdtlabs.org)
# ==============================================================================

# 1. HTTP Server Block (Port 80)
# Handles health check, redirects registered domains to HTTPS, and provides direct IP fallback
server {
    listen 80;
    server_name nextsteps-admin.mdtlabs.org nextsteps.mdtlabs.org nextsteps-api.mdtlabs.org 13.232.251.63 localhost;

    client_max_body_size 50M;

    # Backend Health Check on HTTP IP (e.g. http://13.232.251.63/health)
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host $host;
    }

    # Redirect domain visitors to HTTPS
    if ($host = "nextsteps-admin.mdtlabs.org") {
        return 301 https://$host$request_uri;
    }
    if ($host = "nextsteps.mdtlabs.org") {
        return 301 https://$host$request_uri;
    }
    if ($host = "nextsteps-api.mdtlabs.org") {
        return 301 https://$host$request_uri;
    }

    # Direct IP Fallback (http://13.232.251.63/):
    location / {
        root /var/www/next-steps/admin-panel;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location = /admin {
        return 301 /;
    }

    location = /app {
        return 301 /app/;
    }

    location /app/ {
        alias /var/www/next-steps/mobile-web/;
        index index.html;
        try_files $uri $uri/ /app/index.html;
    }

    location = /apk {
        alias /var/www/next-steps/NextSteps-MaternalCare.apk;
        add_header Content-Disposition 'attachment; filename="NextSteps-MaternalCare.apk"';
        default_type application/vnd.android.package-archive;
    }

    location = /download {
        alias /var/www/next-steps/NextSteps-MaternalCare.apk;
        add_header Content-Disposition 'attachment; filename="NextSteps-MaternalCare.apk"';
        default_type application/vnd.android.package-archive;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 2. HTTPS Server Block: Admin Web Portal & Frontline Mobile Web
server {
    listen 443 ssl;
    server_name nextsteps-admin.mdtlabs.org nextsteps.mdtlabs.org;

    ssl_certificate /etc/letsencrypt/live/nextsteps-admin.mdtlabs.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextsteps-admin.mdtlabs.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    # Admin Panel (Web desktop / supervisor portal)
    location / {
        root /var/www/next-steps/admin-panel;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location = /admin {
        return 301 /;
    }

    location = /app {
        return 301 /app/;
    }

    # Frontline Mobile Web App (Responsive PWA / Field Application)
    location /app/ {
        alias /var/www/next-steps/mobile-web/;
        index index.html;
        try_files $uri $uri/ /app/index.html;
    }

    # Direct Android APK Download links
    location = /apk {
        alias /var/www/next-steps/NextSteps-MaternalCare.apk;
        add_header Content-Disposition 'attachment; filename="NextSteps-MaternalCare.apk"';
        default_type application/vnd.android.package-archive;
    }

    location = /download {
        alias /var/www/next-steps/NextSteps-MaternalCare.apk;
        add_header Content-Disposition 'attachment; filename="NextSteps-MaternalCare.apk"';
        default_type application/vnd.android.package-archive;
    }

    # Backend API Proxy (Port 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend Health Check
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host $host;
    }
}

# 3. HTTPS Server Block: Dedicated Next Steps API Subdomain
server {
    listen 443 ssl;
    server_name nextsteps-api.mdtlabs.org;

    ssl_certificate /etc/letsencrypt/live/nextsteps-admin.mdtlabs.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextsteps-admin.mdtlabs.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
"""
with open(os.path.join(pkg_dir, 'nginx-ssl.conf'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(nginx_ssl_conf)

# 8. PM2 Ecosystem config
pm2_conf = """module.exports = {
  apps: [
    {
      name: 'next-steps-backend',
      script: './backend/dist/server.js',
      cwd: '/var/www/next-steps',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        SQLITE_DB_PATH: './data/nextsteps.db',
        CCE_KEYCLOAK_TOKEN_URL: 'https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token',
        CCE_CLIENT_ID: 'nextstep-emitter',
        CCE_CLIENT_SECRET: 'ZsFq3nfpMefiN82WteylKeLECwS3Z4sw',
        CCE_GATEWAY_URL: 'https://api.cce.mdtlabs.org/v1/events',
        CCE_SOURCE_SYSTEM: 'nextsteps/rewa-district',
      },
    },
  ],
};
"""
with open(os.path.join(pkg_dir, 'ecosystem.config.cjs'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(pm2_conf)

# 9. deploy.sh
deploy_sh = """#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 Deploying Next-Steps Platform on Ubuntu EC2 (13.232.251.63)"
echo "=========================================================="

TARGET_DIR="/var/www/next-steps"
sudo mkdir -p $TARGET_DIR/data
sudo chown -R $USER:$USER $TARGET_DIR
chmod 755 $TARGET_DIR/data

# Clean existing web bundles (keep data directory intact)
rm -rf $TARGET_DIR/admin-panel $TARGET_DIR/mobile-web $TARGET_DIR/backend/dist

# Copy updated application files
cp -r backend admin-panel mobile-web ecosystem.config.cjs nginx.conf nginx-ssl.conf NextSteps-MaternalCare.apk $TARGET_DIR/

# Install backend dependencies
cd $TARGET_DIR/backend
echo "📦 Installing backend production dependencies..."
npm install --omit=dev

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# Cleanly restart backend with PM2
cd $TARGET_DIR
echo "🔄 Starting Next-Steps Backend with PM2..."
pm2 delete next-steps-backend 2>/dev/null || true
sudo fuser -k 4000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
sleep 3
pm2 status

echo "🔍 Verifying backend health locally on port 4000..."
curl -s http://127.0.0.1:4000/health || (echo "⚠️ Backend not responding on 4000! Displaying PM2 logs:" && pm2 logs next-steps-backend --lines 25 --nostream)

# Configure Nginx virtual hosts
if command -v nginx &> /dev/null; then
    echo "🌐 Configuring Nginx reverse proxy..."
    sudo rm -f /etc/nginx/sites-enabled/nextsteps.conf /etc/nginx/sites-available/nextsteps.conf

    # Check if Let's Encrypt certificates exist
    if sudo test -f /etc/letsencrypt/live/nextsteps-admin.mdtlabs.org/fullchain.pem; then
        echo "🔒 Active Let's Encrypt certificate found! Enabling HTTPS virtual host..."
        sudo cp $TARGET_DIR/nginx-ssl.conf /etc/nginx/sites-available/next-steps
    else
        echo "ℹ️ SSL certificate not found yet. Enabling HTTP virtual host..."
        sudo cp $TARGET_DIR/nginx.conf /etc/nginx/sites-available/next-steps
    fi

    sudo ln -sf /etc/nginx/sites-available/next-steps /etc/nginx/sites-enabled/next-steps
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully."
fi

PUB_IP=$(curl -s ifconfig.me 2>/dev/null || echo '13.232.251.63')
echo "=========================================================="
echo "✅ Next-Steps Platform Deployment Complete!"
echo "🖥️ Admin Web Portal:       https://nextsteps-admin.mdtlabs.org/ (or http://$PUB_IP/)"
echo "📱 Mobile Frontline Web:   https://nextsteps-admin.mdtlabs.org/app/ (or http://$PUB_IP/app/)"
echo "📲 Download Android APK:   https://nextsteps-admin.mdtlabs.org/apk"
echo "📡 Backend Health:         https://nextsteps-api.mdtlabs.org/health (or http://$PUB_IP/health)"
echo "⚡ Live CCE Status API:    https://nextsteps-api.mdtlabs.org/api/cce/status"
echo "=========================================================="
"""
with open(os.path.join(pkg_dir, 'deploy.sh'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(deploy_sh)

# 10. Create ZIP archive
zip_path = os.path.join(base, 'next_steps_ec2_deployment.zip')
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(pkg_dir):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, pkg_dir)
            zf.write(full, rel)

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"SUCCESS! Deployment bundle created at {zip_path} (Size: {size_mb:.2f} MB)")
