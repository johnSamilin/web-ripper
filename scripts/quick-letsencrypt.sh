#!/bin/bash

# Quick Let's Encrypt setup for CentOS 9
# Usage: sudo bash quick-letsencrypt.sh your-domain.com your-email@domain.com

DOMAIN="$1"
EMAIL="$2"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
    echo "❌ Usage: sudo bash quick-letsencrypt.sh your-domain.com your-email@domain.com"
    exit 1
fi

echo "🚀 Quick Let's Encrypt setup for $DOMAIN"

# Install Certbot
dnf install -y epel-release
dnf install -y certbot

# Stop any service on port 80
systemctl stop nginx 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true

# Get certificate using standalone method
certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domains "$DOMAIN" \
    --non-interactive

if [[ $? -eq 0 ]]; then
    echo "✅ Certificate obtained!"
    
    # Copy to Web Ripper directory
    mkdir -p ./certs
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ./certs/server.crt
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ./certs/server.key
    chmod 644 ./certs/server.crt
    chmod 600 ./certs/server.key
    
    echo "📁 Certificates copied to ./certs/"
    echo "🔧 Update .env: USE_HTTP2=true"
    echo "🚀 Start server: npm run server:http2"
else
    echo "❌ Certificate generation failed"
    exit 1
fi