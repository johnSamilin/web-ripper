#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const certDir = './certs';
const keyFile = path.join(certDir, 'server.key');
const certFile = path.join(certDir, 'server.crt');
const configFile = path.join(certDir, 'server.conf');

console.log('🔐 Generating self-signed SSL certificate for Web Ripper...\n');

// Create certs directory
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log(`📁 Created directory: ${certDir}`);
}

// Create OpenSSL config file
const opensslConfig = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Development
L = Local
O = Web Ripper
OU = Development
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

fs.writeFileSync(configFile, opensslConfig);
console.log(`📝 Created OpenSSL config: ${configFile}`);

try {
  // Generate private key and certificate
  const command = `openssl req -x509 -newkey rsa:4096 -keyout "${keyFile}" -out "${certFile}" -days 365 -nodes -config "${configFile}"`;
  
  console.log('🔑 Generating private key and certificate...');
  execSync(command, { stdio: 'pipe' });
  
  console.log('✅ SSL certificate generated successfully!\n');
  
  // Display certificate info
  console.log('📋 Certificate Details:');
  console.log(`   Private Key: ${keyFile}`);
  console.log(`   Certificate: ${certFile}`);
  console.log(`   Valid for: 365 days`);
  console.log(`   Domains: localhost, *.localhost`);
  console.log(`   IPs: 127.0.0.1, ::1\n`);
  
  // Verify certificate
  try {
    const certInfo = execSync(`openssl x509 -in "${certFile}" -text -noout | grep -A 1 "Subject:"`, { encoding: 'utf8' });
    console.log('🔍 Certificate verification:');
    console.log(certInfo);
  } catch (error) {
    // Verification failed, but certificate was created
  }
  
  console.log('🚀 To start the server with HTTP/2:');
  console.log('   1. Set USE_HTTP2=true in your .env file');
  console.log('   2. Run: npm run server');
  console.log('   3. Access: https://localhost:3001\n');
  
  console.log('⚠️  Browser Security Warning:');
  console.log('   Your browser will show a security warning for self-signed certificates.');
  console.log('   Click "Advanced" → "Proceed to localhost (unsafe)" to continue.\n');
  
  console.log('🔒 For production, use certificates from a trusted CA like Let\'s Encrypt.');
  
  // Clean up config file
  fs.unlinkSync(configFile);
  
} catch (error) {
  console.error('❌ Failed to generate certificate:', error.message);
  console.error('\n💡 Make sure OpenSSL is installed:');
  console.error('   macOS: brew install openssl');
  console.error('   Ubuntu/Debian: sudo apt-get install openssl');
  console.error('   Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
  process.exit(1);
}