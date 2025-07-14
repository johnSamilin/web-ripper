#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const certDir = './certs';
const keyFile = path.join(certDir, 'server.key');
const certFile = path.join(certDir, 'server.crt');
const configFile = path.join(certDir, 'server.conf');

console.log('🔐 Generating self-signed SSL certificate for Web Ripper HTTP/2...\n');

// Create certs directory
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log(`📁 Created directory: ${certDir}`);
}

// Remove existing certificates
if (fs.existsSync(keyFile)) {
  fs.unlinkSync(keyFile);
  console.log('🗑️  Removed existing private key');
}
if (fs.existsSync(certFile)) {
  fs.unlinkSync(certFile);
  console.log('🗑️  Removed existing certificate');
}

// Create comprehensive OpenSSL config file for HTTP/2 compatibility
const opensslConfig = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
default_bits = 2048

[req_distinguished_name]
C = US
ST = Development
L = Local
O = Web Ripper Development
OU = HTTP/2 Server
CN = localhost
emailAddress = dev@webritper.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment, keyAgreement
extendedKeyUsage = critical, serverAuth, clientAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
subjectAltName = @alt_names
issuerAltName = issuer:copy

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
DNS.4 = ::1
IP.1 = 127.0.0.1
IP.2 = ::1
`;

fs.writeFileSync(configFile, opensslConfig);
console.log(`📝 Created OpenSSL config: ${configFile}`);

try {
  // Check if OpenSSL is available
  try {
    execSync('openssl version', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('OpenSSL not found. Please install OpenSSL first.');
  }

  console.log('🔑 Generating RSA private key (2048-bit)...');
  
  // Generate private key separately for better control
  execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: 'pipe' });
  
  console.log('📜 Generating certificate with HTTP/2 compatible extensions...');
  
  // Generate certificate with the private key
  const certCommand = `openssl req -new -x509 -key "${keyFile}" -out "${certFile}" -days 365 -config "${configFile}" -extensions v3_req`;
  execSync(certCommand, { stdio: 'pipe' });
  
  console.log('✅ SSL certificate generated successfully!\n');
  
  // Verify the certificate has correct extensions
  console.log('🔍 Verifying certificate extensions...');
  try {
    const keyUsage = execSync(`openssl x509 -in "${certFile}" -text -noout | grep -A 5 "X509v3 Key Usage"`, { encoding: 'utf8' });
    console.log('Key Usage Extensions:');
    console.log(keyUsage);
    
    const extKeyUsage = execSync(`openssl x509 -in "${certFile}" -text -noout | grep -A 3 "X509v3 Extended Key Usage"`, { encoding: 'utf8' });
    console.log('Extended Key Usage:');
    console.log(extKeyUsage);
    
    const subjectAlt = execSync(`openssl x509 -in "${certFile}" -text -noout | grep -A 5 "X509v3 Subject Alternative Name"`, { encoding: 'utf8' });
    console.log('Subject Alternative Names:');
    console.log(subjectAlt);
  } catch (error) {
    console.log('⚠️  Could not verify extensions (certificate should still work)');
  }
  
  // Display certificate info
  console.log('\n📋 Certificate Details:');
  console.log(`   Private Key: ${keyFile}`);
  console.log(`   Certificate: ${certFile}`);
  console.log(`   Valid for: 365 days`);
  console.log(`   Key Size: 2048-bit RSA`);
  console.log(`   Domains: localhost, *.localhost`);
  console.log(`   IPs: 127.0.0.1, ::1`);
  console.log(`   Extensions: HTTP/2 compatible\n`);
  
  // Test certificate validity
  try {
    execSync(`openssl x509 -in "${certFile}" -noout -checkend 0`, { stdio: 'pipe' });
    console.log('✅ Certificate is valid and not expired');
  } catch (error) {
    console.log('❌ Certificate validation failed');
  }
  
  // Set proper file permissions (Unix-like systems)
  try {
    if (process.platform !== 'win32') {
      execSync(`chmod 600 "${keyFile}"`, { stdio: 'pipe' });
      execSync(`chmod 644 "${certFile}"`, { stdio: 'pipe' });
      console.log('🔒 Set secure file permissions');
    }
  } catch (error) {
    console.log('⚠️  Could not set file permissions (not critical)');
  }
  
  console.log('\n🚀 To start the server with HTTP/2:');
  console.log('   1. Set USE_HTTP2=true in your .env file, or');
  console.log('   2. Run: npm run server:http2');
  console.log('   3. Access: https://localhost:3001\n');
  
  console.log('⚠️  Browser Security Warning:');
  console.log('   Your browser will show a security warning for self-signed certificates.');
  console.log('   Click "Advanced" → "Proceed to localhost (unsafe)" to continue.');
  console.log('   This is normal for development certificates.\n');
  
  console.log('🔧 Troubleshooting:');
  console.log('   - If you still get SSL errors, try restarting your browser');
  console.log('   - Clear browser cache and SSL state');
  console.log('   - Make sure no other service is using port 3001\n');
  
  console.log('🔒 For production, use certificates from a trusted CA like Let\'s Encrypt.');
  
} catch (error) {
  console.error('❌ Failed to generate certificate:', error.message);
  console.error('\n💡 Installation instructions:');
  console.error('   macOS: brew install openssl');
  console.error('   Ubuntu/Debian: sudo apt-get install openssl');
  console.error('   CentOS/RHEL: sudo yum install openssl');
  console.error('   Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
  console.error('   Or use Windows Subsystem for Linux (WSL)');
  process.exit(1);
} finally {
  // Clean up config file
  if (fs.existsSync(configFile)) {
    fs.unlinkSync(configFile);
  }
}