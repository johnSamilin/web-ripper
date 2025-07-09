# 🎯 WEB RIPPER - Content Destroyer

**Turn any webpage into a perfect archive in seconds.**

No more broken links, missing images, or cluttered ads. Just clean, beautiful content that lasts forever.

![Web Ripper Banner](https://via.placeholder.com/800x200/000000/FF0000?text=WEB+RIPPER+-+CONTENT+DESTROYER)

## 🚀 What is Web Ripper?

Web Ripper is a brutal content extraction tool that destroys ads, removes clutter, and creates self-contained HTML archives from any webpage. It's designed for researchers, journalists, professionals, and anyone who wants to build a permanent, searchable library of web content.

### ✨ Key Features

- **🎯 Clean Content Extraction** - Removes ads, popups, and clutter automatically
- **☁️ Cloud Storage Integration** - Saves to WebDAV with smart organization
- **🤖 AI-Powered Tagging** - Automatic categorization using OpenAI
- **📄 Self-Contained Archives** - HTML files with embedded images (no broken links)
- **📊 Source Analysis** - Discovers RSS feeds and newsletters from your saved sites
- **📥 Bulk Import** - Import entire Pocket libraries or bookmark collections
- **🧹 CSS Cleanup** - Remove styling for uniform, academic-ready content
- **👁️ Source Management** - Hide unwanted sources and organize by quality

### 🎭 Why Web Ripper?

**The Problem:**
- Websites are full of ads, popups, and distractions
- Bookmarks break when content moves or gets deleted
- No way to organize or search your saved content
- Reading lists become digital graveyards

**The Solution:**
- Extract pure, readable content from any website
- Create permanent archives that never break
- Automatic AI tagging for instant searchability
- Your data stays under your control

## 🏗️ Self-Hosting Guide

### Prerequisites

- **Node.js** 18+ and npm
- **WebDAV server** (optional, for cloud storage)
- **OpenAI API key** (optional, for AI tagging)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-ripper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=production
   
   # Database
   DATABASE_PATH=./database.sqlite
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key-here
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   AUTH_RATE_LIMIT_MAX=5
   
   # Content Extraction
   EXTRACTION_TIMEOUT=30000
   MAX_CONTENT_LENGTH=10mb
   
   # WebDAV (Optional)
   WEBDAV_BASE_PATH=/web-ripper
   ORGANIZE_BY_DATE=true
   
   # AI Tagging (Optional)
   OPENAI_API_KEY=your-openai-api-key-here
   
   # CORS
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Build and start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

5. **Access the application**
   - Open your browser to `http://localhost:5173`
   - The API runs on `http://localhost:3001`

### 🐳 Docker Deployment

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  web-ripper:
    build: .
    ports:
      - "3001:3001"
      - "5173:5173"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/database.sqlite
      - JWT_SECRET=your-super-secret-jwt-key
      - OPENAI_API_KEY=your-openai-api-key
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

### 🔧 Configuration Options

#### WebDAV Storage Setup

Web Ripper can save articles to any WebDAV-compatible service:

**Popular WebDAV Providers:**
- **Nextcloud/ownCloud** - Self-hosted cloud storage
- **Mail.ru Cloud** - `https://webdav.cloud.mail.ru/`
- **Yandex.Disk** - `https://webdav.yandex.ru/`
- **Box.com** - `https://dav.box.com/dav/`
- **4shared** - `https://webdav.4shared.com/`

**Configuration in Web Ripper:**
1. Create an account and log in
2. Go to Settings → WebDAV Storage
3. Enter your WebDAV URL, username, and password
4. Test the connection

#### AI Tagging Setup

For automatic content tagging:

1. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Add it to your `.env` file as `OPENAI_API_KEY`
3. Restart the application

Without an API key, Web Ripper uses fallback keyword extraction.

#### File Organization

Set `ORGANIZE_BY_DATE=true` to organize files by year/month:
```
/web-ripper/
  ├── 2024/
  │   ├── 01/
  │   ├── 02/
  │   └── ...
  └── metadata/
```

### 🔒 Security Considerations

- **Change the JWT secret** in production
- **Use HTTPS** for WebDAV connections
- **Set up rate limiting** appropriate for your usage
- **Regular backups** of your SQLite database
- **Firewall rules** to restrict access if needed

### 📊 Monitoring & Maintenance

#### Health Check
```bash
curl /api/health
```

#### Database Backup
```bash
# Backup SQLite database
cp database.sqlite database.backup.$(date +%Y%m%d).sqlite
```

#### Log Monitoring
Logs are output to console. In production, consider using:
- **PM2** for process management
- **Winston** for structured logging
- **Log rotation** for disk space management

### 🔧 Advanced Configuration

#### Custom Content Extraction

Modify `server/index.js` to customize content extraction:

```javascript
// Add custom selectors for specific sites
const customSelectors = {
  'example.com': '.article-content',
  'news-site.com': '.story-body'
};
```

#### Bulk Processing

For large-scale imports, increase timeouts:

```env
EXTRACTION_TIMEOUT=60000
MAX_CONTENT_LENGTH=50mb
```

#### Performance Tuning

- **Increase Node.js memory**: `node --max-old-space-size=4096`
- **Database optimization**: Regular VACUUM operations
- **WebDAV connection pooling**: Adjust client settings

## 🎯 Usage Examples

### Anonymous Mode
```bash
curl -X POST /api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

### With Authentication
```bash
# Register
curl -X POST /api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "email": "user@example.com", "password": "password"}'

# Extract with tags
curl -X POST /api/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url": "https://example.com/article", "tags": ["research", "ai"]}'
```

## 🛠️ Development

### Project Structure
```
web-ripper/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── styles/            # CSS styles
│   └── main.tsx           # App entry point
├── server/                # Backend Node.js app
│   ├── models/            # Database models
│   ├── services/          # Business logic
│   ├── routes/            # API routes
│   └── index.js           # Server entry point
├── package.json           # Dependencies
└── README.md             # This file
```

### Available Scripts

```bash
npm run dev          # Start development servers
npm run client       # Start frontend only
npm run server       # Start backend only
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Report bugs and request features on GitHub
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join discussions in GitHub Discussions

## 🎉 Acknowledgments

- **Cheerio** for HTML parsing
- **OpenAI** for AI-powered tagging
- **WebDAV** community for storage standards
- **React** and **Node.js** ecosystems

---

**Built with ❤️ for people who value their digital content.**

*Stop losing articles to broken links and cluttered websites. Start building your perfect content library today.*