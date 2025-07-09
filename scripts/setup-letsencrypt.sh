#!/bin/bash

# Let's Encrypt Certificate Setup for CentOS 9
# This script sets up Certbot and obtains SSL certificates for Web Ripper

set -e  # Exit on any error

echo "🔐 Setting up Let's Encrypt SSL Certificate on CentOS 9"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-localhost}"
EMAIL="${2:-admin@${DOMAIN}}"
WEBROOT_PATH="/var/www/html"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
APP_CERT_PATH="./certs"

print_step() {
    echo -e "${BLUE}📋 Step: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Validate domain parameter
if [[ "$DOMAIN" == "localhost" ]]; then
    print_error "Please provide a valid domain name"
    echo "Usage: sudo bash setup-letsencrypt.sh your-domain.com your-email@domain.com"
    echo "Example: sudo bash setup-letsencrypt.sh webritper.com admin@webritper.com"
    exit 1
fi

print_step "Updating system packages"
dnf update -y
print_success "System packages updated"

print_step "Installing EPEL repository"
dnf install -y epel-release
print_success "EPEL repository installed"

print_step "Installing Certbot and Nginx plugin"
dnf install -y certbot python3-certbot-nginx
print_success "Certbot installed"

print_step "Installing Nginx (if not already installed)"
if ! command -v nginx &> /dev/null; then
    dnf install -y nginx
    systemctl enable nginx
    print_success "Nginx installed and enabled"
else
    print_success "Nginx already installed"
fi

print_step "Configuring firewall for HTTP and HTTPS"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    print_success "Firewall configured"
else
    print_warning "Firewall not found, make sure ports 80 and 443 are open"
fi

print_step "Creating Nginx configuration for domain verification"
cat > /etc/nginx/conf.d/${DOMAIN}.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root ${WEBROOT_PATH};
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

print_step "Creating webroot directory"
mkdir -p ${WEBROOT_PATH}
chown -R nginx:nginx ${WEBROOT_PATH}
print_success "Webroot directory created"

print_step "Testing Nginx configuration"
nginx -t
if [[ $? -eq 0 ]]; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

print_step "Starting and enabling Nginx"
systemctl start nginx
systemctl enable nginx
print_success "Nginx started and enabled"

print_step "Obtaining Let's Encrypt certificate"
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "Webroot: ${WEBROOT_PATH}"

# Obtain certificate using webroot method
certbot certonly \
    --webroot \
    --webroot-path=${WEBROOT_PATH} \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --domains ${DOMAIN},www.${DOMAIN} \
    --non-interactive

if [[ $? -eq 0 ]]; then
    print_success "SSL certificate obtained successfully!"
else
    print_error "Failed to obtain SSL certificate"
    echo "Common issues:"
    echo "1. Domain not pointing to this server"
    echo "2. Firewall blocking port 80"
    echo "3. Another service using port 80"
    exit 1
fi

print_step "Updating Nginx configuration with SSL"
cat > /etc/nginx/conf.d/${DOMAIN}.conf << EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server for Web Ripper
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # SSL Configuration
    ssl_certificate ${CERT_PATH}/fullchain.pem;
    ssl_certificate_key ${CERT_PATH}/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Proxy to Web Ripper Node.js app
    location / {
        proxy_pass http://127.0.0.1:3001;
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
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Let's Encrypt renewal
    location /.well-known/acme-challenge/ {
        root ${WEBROOT_PATH};
    }
}
EOF

print_step "Testing updated Nginx configuration"
nginx -t
if [[ $? -eq 0 ]]; then
    print_success "Updated Nginx configuration is valid"
else
    print_error "Updated Nginx configuration test failed"
    exit 1
fi

print_step "Reloading Nginx with new configuration"
systemctl reload nginx
print_success "Nginx reloaded with SSL configuration"

print_step "Creating certificate directory for Web Ripper"
mkdir -p ${APP_CERT_PATH}
print_success "Certificate directory created"

print_step "Copying certificates for Web Ripper"
cp ${CERT_PATH}/fullchain.pem ${APP_CERT_PATH}/server.crt
cp ${CERT_PATH}/privkey.pem ${APP_CERT_PATH}/server.key
chown $(logname):$(logname) ${APP_CERT_PATH}/server.crt ${APP_CERT_PATH}/server.key
chmod 644 ${APP_CERT_PATH}/server.crt
chmod 600 ${APP_CERT_PATH}/server.key
print_success "Certificates copied to Web Ripper directory"

print_step "Setting up automatic certificate renewal"
# Create renewal script
cat > /usr/local/bin/renew-webritper-cert.sh << 'EOF'
#!/bin/bash
# Web Ripper Certificate Renewal Script

DOMAIN="DOMAIN_PLACEHOLDER"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
APP_CERT_PATH="APP_CERT_PATH_PLACEHOLDER"

# Renew certificate
certbot renew --quiet

# Check if renewal was successful
if [[ $? -eq 0 ]]; then
    # Copy new certificates
    cp ${CERT_PATH}/fullchain.pem ${APP_CERT_PATH}/server.crt
    cp ${CERT_PATH}/privkey.pem ${APP_CERT_PATH}/server.key
    
    # Set permissions
    chown $(logname):$(logname) ${APP_CERT_PATH}/server.crt ${APP_CERT_PATH}/server.key
    chmod 644 ${APP_CERT_PATH}/server.crt
    chmod 600 ${APP_CERT_PATH}/server.key
    
    # Reload Nginx
    systemctl reload nginx
    
    echo "$(date): Certificate renewed and Web Ripper updated" >> /var/log/webritper-cert-renewal.log
fi
EOF

# Replace placeholders
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /usr/local/bin/renew-webritper-cert.sh
sed -i "s|APP_CERT_PATH_PLACEHOLDER|${PWD}/${APP_CERT_PATH}|g" /usr/local/bin/renew-webritper-cert.sh

chmod +x /usr/local/bin/renew-webritper-cert.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/renew-webritper-cert.sh") | crontab -

print_success "Automatic renewal configured"

print_step "Verifying SSL certificate"
echo | openssl s_client -servername ${DOMAIN} -connect ${DOMAIN}:443 2>/dev/null | openssl x509 -noout -dates

echo ""
echo "🎉 Let's Encrypt SSL Certificate Setup Complete!"
echo "=============================================="
echo ""
echo "📋 Certificate Details:"
echo "   Domain: ${DOMAIN}"
echo "   Certificate: ${CERT_PATH}/fullchain.pem"
echo "   Private Key: ${CERT_PATH}/privkey.pem"
echo "   Valid for: 90 days (auto-renewal configured)"
echo ""
echo "📁 Web Ripper Certificates:"
echo "   Certificate: ${APP_CERT_PATH}/server.crt"
echo "   Private Key: ${APP_CERT_PATH}/server.key"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update your .env file:"
echo "      USE_HTTP2=true"
echo "      CORS_ORIGIN=https://${DOMAIN}"
echo ""
echo "   2. Start Web Ripper with HTTPS:"
echo "      npm run server:http2"
echo ""
echo "   3. Access your site:"
echo "      https://${DOMAIN}"
echo ""
echo "🔄 Automatic Renewal:"
echo "   - Certificates will auto-renew via cron job"
echo "   - Check renewal status: certbot certificates"
echo "   - Manual renewal: certbot renew"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check Nginx status: systemctl status nginx"
echo "   - Check certificate: certbot certificates"
echo "   - View logs: tail -f /var/log/nginx/error.log"
echo "   - Test SSL: https://www.ssllabs.com/ssltest/"