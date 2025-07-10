# Let's Encrypt SSL Certificate Setup for CentOS 9

This guide shows how to obtain and configure Let's Encrypt SSL certificates for Web Ripper on CentOS 9.

## Prerequisites

- CentOS 9 server with root access
- Domain name pointing to your server's IP address
- Ports 80 and 443 open in firewall

## Method 1: Full Setup with Nginx Proxy (Recommended)

This method sets up Nginx as a reverse proxy with automatic SSL termination.

```bash
# Make script executable
chmod +x scripts/setup-letsencrypt.sh

# Run the setup script
sudo bash scripts/setup-letsencrypt.sh your-domain.com your-email@domain.com
```

### What this script does:

1. **Updates system packages**
2. **Installs EPEL repository**
3. **Installs Certbot and Nginx**
4. **Configures firewall** (opens ports 80, 443)
5. **Creates Nginx configuration** for domain verification
6. **Obtains SSL certificate** from Let's Encrypt
7. **Configures Nginx** as HTTPS reverse proxy
8. **Sets up automatic renewal** via cron job
9. **Copies certificates** to Web Ripper directory

### After setup:

1. Update your `.env` file:
```env
USE_HTTP2=true
CORS_ORIGIN=https://your-domain.com
```

2. Start Web Ripper:
```bash
npm run server:http2
```

3. Access your site at `https://your-domain.com`

## Method 2: Quick Setup (Standalone)

For simple setups without Nginx proxy:

```bash
# Make script executable
chmod +x scripts/quick-letsencrypt.sh

# Run quick setup
sudo bash scripts/quick-letsencrypt.sh your-domain.com your-email@domain.com
```

This method:
- Uses Certbot's standalone mode
- Temporarily stops other web servers
- Copies certificates directly to Web Ripper
- Requires manual renewal setup

## Method 3: Manual Commands

If you prefer to run commands manually:

### Step 1: Install Certbot

```bash
# Update system
sudo dnf update -y

# Install EPEL repository
sudo dnf install -y epel-release

# Install Certbot
sudo dnf install -y certbot
```

### Step 2: Configure Firewall

```bash
# Open HTTP and HTTPS ports
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Step 3: Obtain Certificate

**Option A: Standalone (stops other web servers)**
```bash
sudo certbot certonly \
    --standalone \
    --email your-email@domain.com \
    --agree-tos \
    --no-eff-email \
    --domains your-domain.com \
    --non-interactive
```

**Option B: Webroot (if you have a web server running)**
```bash
# Create webroot directory
sudo mkdir -p /var/www/html

# Get certificate
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email your-email@domain.com \
    --agree-tos \
    --no-eff-email \
    --domains your-domain.com \
    --non-interactive
```

### Step 4: Copy Certificates to Web Ripper

```bash
# Create certificate directory
mkdir -p ./certs

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/server.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/server.key

# Set proper permissions
sudo chown $USER:$USER ./certs/server.crt ./certs/server.key
chmod 644 ./certs/server.crt
chmod 600 ./certs/server.key
```

### Step 5: Configure Web Ripper

Update your `.env` file:
```env
USE_HTTP2=true
CORS_ORIGIN=https://your-domain.com
```

Start the server:
```bash
npm run server:http2
```

## Certificate Renewal

### Automatic Renewal (Method 1 only)

The full setup script configures automatic renewal via cron job.

### Manual Renewal

```bash
# Renew certificates
sudo certbot renew

# Copy new certificates to Web Ripper
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/server.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/server.key

# Restart Web Ripper
npm run server:http2
```

### Check Certificate Status

```bash
# List all certificates
sudo certbot certificates

# Check expiration
sudo certbot certificates | grep "Expiry Date"

# Test renewal (dry run)
sudo certbot renew --dry-run
```

## Troubleshooting

### Common Issues

1. **Domain not pointing to server**
   ```bash
   # Check DNS resolution
   nslookup your-domain.com
   dig your-domain.com
   ```

2. **Firewall blocking ports**
   ```bash
   # Check firewall status
   sudo firewall-cmd --list-all
   
   # Open ports if needed
   sudo firewall-cmd --permanent --add-port=80/tcp
   sudo firewall-cmd --permanent --add-port=443/tcp
   sudo firewall-cmd --reload
   ```

3. **Port 80 already in use**
   ```bash
   # Check what's using port 80
   sudo netstat -tlnp | grep :80
   
   # Stop conflicting services
   sudo systemctl stop httpd
   sudo systemctl stop nginx
   ```

4. **Certificate validation failed**
   ```bash
   # Check certificate
   openssl x509 -in ./certs/server.crt -text -noout
   
   # Verify certificate chain
   openssl verify -CAfile ./certs/server.crt ./certs/server.crt
   ```

### Log Files

- **Certbot logs**: `/var/log/letsencrypt/letsencrypt.log`
- **Nginx logs**: `/var/log/nginx/error.log`
- **Web Ripper renewal**: `/var/log/webritper-cert-renewal.log`

### Testing SSL Configuration

```bash
# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Online SSL test
# Visit: https://www.ssllabs.com/ssltest/
```

## Security Best Practices

1. **Keep certificates secure**
   ```bash
   chmod 600 ./certs/server.key
   chmod 644 ./certs/server.crt
   ```

2. **Regular updates**
   ```bash
   sudo dnf update -y
   ```

3. **Monitor certificate expiration**
   - Let's Encrypt certificates expire every 90 days
   - Set up monitoring alerts
   - Test renewal process regularly

4. **Use strong SSL configuration**
   - The Nginx configuration includes modern SSL settings
   - HSTS headers for security
   - Secure cipher suites

## Production Deployment

For production deployment:

1. Use Method 1 (Nginx proxy) for better performance
2. Set up monitoring for certificate expiration
3. Configure log rotation
4. Set up backup procedures for certificates
5. Use a process manager like PM2 for Web Ripper
6. Configure proper DNS records (A, AAAA, CNAME)
7. Set up CDN if needed (Cloudflare, etc.)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review log files for error messages
3. Verify DNS configuration
4. Test with a simple domain first
5. Consider using staging certificates for testing:
   ```bash
   certbot certonly --staging --standalone -d your-domain.com
   ```