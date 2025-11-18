const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// Enhanced MIME types for demo
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
    // CORS headers for demo sharing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    let filePath;
    
    // Route handling for demo
    if (req.url === '/' || req.url === '/index.html') {
        filePath = path.join(__dirname, 'apps/web/business.html');
    } else if (req.url === '/demo' || req.url === '/platform') {
        filePath = path.join(__dirname, 'apps/web/index.html');
    } else if (req.url === '/business') {
        filePath = path.join(__dirname, 'apps/web/business.html');
    } else if (req.url === '/readme') {
        filePath = path.join(__dirname, 'DEMO-README.md');
    } else if (req.url === '/architecture') {
        filePath = path.join(__dirname, 'docs/architecture.md');
    } else if (req.url === '/compliance') {
        filePath = path.join(__dirname, 'docs/compliance.md');
    } else {
        filePath = path.join(__dirname, req.url);
    }
    
    // Security check
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Serve demo page for unknown routes
                fs.readFile(path.join(__dirname, 'apps/web/index.html'), (err, content) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Demo Server Error - Please check file paths');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Demo Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('🎯 PeopleTrustPay DEMO Server - Ready for Buyers!');
    console.log('='.repeat(50));
    console.log(`🌐 Demo URL: http://localhost:${PORT}`);
    console.log(`📱 Main Dashboard: http://localhost:${PORT}`);
    console.log(`📊 Architecture: http://localhost:${PORT}/architecture`);
    console.log(`⚖️  Compliance: http://localhost:${PORT}/compliance`);
    console.log(`📋 Demo Guide: http://localhost:${PORT}/demo`);
    console.log('='.repeat(50));
    console.log('');
    console.log('🎪 SHARING OPTIONS:');
    console.log('1. Local Demo: Share this folder + run "node demo-server.js"');
    console.log('2. Screen Share: Use http://localhost:3000 during video calls');
    console.log('3. Cloud Deploy: Upload to Heroku/Vercel/Netlify');
    console.log('4. ZIP Package: Create archive with DEMO-README.md instructions');
    console.log('');
    console.log('💼 Professional fintech demo ready for potential buyers!');
    console.log('Press Ctrl+C to stop the demo server');
});

// Enhanced error handling for demo
process.on('uncaughtException', (err) => {
    console.log('Demo Server Error:', err.message);
});

process.on('SIGINT', () => {
    console.log('\n👋 Demo session ended. Thank you for viewing PeopleTrustPay!');
    server.close(() => {
        console.log('✅ Demo server closed successfully');
        process.exit(0);
    });
});
