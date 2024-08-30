/**
 * Description:
 * The `ProxyManager` class is a versatile proxy server manager that creates and manages HTTP and HTTPS proxy servers.
 * It provides caching capabilities using an LRU (Least Recently Used) cache, inspects incoming traffic, handles
 * direct and CONNECT requests, and supports SSL/TLS for secure connections.
 *
 * Purpose of the File:
 * - Create and manage HTTP and HTTPS proxy servers.
 * - Inspect and log incoming traffic details.
 * - Cache responses to reduce load and speed up repeated requests.
 * - Handle CONNECT requests to allow proxying of HTTPS traffic.
 * - Support SSL/TLS for secure proxying with HTTPS.
 * - Provide error handling and server lifecycle management (start, close).
 */

const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const EventEmitter = require('events');
const LRUCache = require('lru-cache'); // Library for caching

class ProxyManager extends EventEmitter {
    constructor() {
        super();
        this.servers = [];
        this.cache = new LRUCache({max: 500, ttl: 1000 * 60 * 5}); // 5 minutes cache
    }

    validateSslOptions(sslOptions) {
        if (!sslOptions.key || !sslOptions.cert) {
            throw new Error('SSL options must include both key and cert.');
        }
    }

    createHttpProxy(port = 8080, targetHost = 'localhost', targetPort = 80) {
        const server = http.createServer((req, res) => {
            this.inspectTraffic(req); // Inspect and log incoming request

            const cacheKey = `${req.method}:${req.url}`;
            const cachedResponse = this.cache.get(cacheKey);

            if (cachedResponse) {
                console.log(`Cache hit for ${cacheKey}`);
                res.writeHead(cachedResponse.statusCode, cachedResponse.headers);
                res.end(cachedResponse.body);
                return;
            }

            const options = {
                hostname: targetHost,
                port: targetPort,
                path: req.url,
                method: req.method,
                headers: req.headers,
            };

            const proxy = http.request(options, (proxyRes) => {
                const chunks = [];
                proxyRes.on('data', (chunk) => chunks.push(chunk));
                proxyRes.on('end', () => {
                    const body = Buffer.concat(chunks);

                    this.cache.set(cacheKey, {
                        statusCode: proxyRes.statusCode,
                        headers: proxyRes.headers,
                        body,
                    });

                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    res.end(body);
                });
            });

            req.pipe(proxy, {end: true});

            proxy.on('error', (err) => {
                this.emit('proxyError', err);
                res.writeHead(500);
                res.end('Proxy error: ' + err.message);
            });
        });

        server.on('connect', (req, clientSocket, head) => {
            const {port, hostname} = url.parse(`//${req.url}`, false, true);

            const serverSocket = net.connect(port || 80, hostname, () => {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
                serverSocket.write(head);
                serverSocket.pipe(clientSocket);
                clientSocket.pipe(serverSocket);
            });

            serverSocket.on('error', (err) => {
                this.emit('connectError', err);
                clientSocket.write('HTTP/1.1 500 Connection Error\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
                clientSocket.end('Proxy error: ' + err.message);
            });
        });

        server.listen(port, () => {
            console.log(`HTTP Proxy server is running on port ${port}`);
            this.servers.push(server);
            this.emit('started', port);
        });

        return server;
    }

    createHttpsProxy(port = 8443, targetHost = 'localhost', targetPort = 443, sslOptions = {}) {
        try {
            this.validateSslOptions(sslOptions);
        } catch (err) {
            this.emit('sslError', err);
            throw err;
        }

        const server = https.createServer(sslOptions, (req, res) => {
            this.inspectTraffic(req); // Inspect and log incoming request

            const cacheKey = `${req.method}:${req.url}`;
            const cachedResponse = this.cache.get(cacheKey);

            if (cachedResponse) {
                console.log(`Cache hit for ${cacheKey}`);
                res.writeHead(cachedResponse.statusCode, cachedResponse.headers);
                res.end(cachedResponse.body);
                return;
            }

            const options = {
                hostname: targetHost,
                port: targetPort,
                path: req.url,
                method: req.method,
                headers: req.headers,
                rejectUnauthorized: false, // For development purposes
            };

            const proxy = https.request(options, (proxyRes) => {
                const chunks = [];
                proxyRes.on('data', (chunk) => chunks.push(chunk));
                proxyRes.on('end', () => {
                    const body = Buffer.concat(chunks);

                    this.cache.set(cacheKey, {
                        statusCode: proxyRes.statusCode,
                        headers: proxyRes.headers,
                        body,
                    });

                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    res.end(body);
                });
            });

            req.pipe(proxy, {end: true});

            proxy.on('error', (err) => {
                this.emit('proxyError', err);
                res.writeHead(500);
                res.end('Proxy error: ' + err.message);
            });
        });

        server.on('connect', (req, clientSocket, head) => {
            const {port, hostname} = url.parse(`//${req.url}`, false, true);

            const serverSocket = net.connect(port || 443, hostname, () => {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
                serverSocket.write(head);
                serverSocket.pipe(clientSocket);
                clientSocket.pipe(serverSocket);
            });

            serverSocket.on('error', (err) => {
                this.emit('connectError', err);
                clientSocket.write('HTTP/1.1 500 Connection Error\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
                clientSocket.end('Proxy error: ' + err.message);
            });
        });

        server.listen(port, () => {
            console.log(`HTTPS Proxy server is running on port ${port}`);
            this.servers.push(server);
            this.emit('started', port);
        });

        return server;
    }

    inspectTraffic(req) {
        console.log(`Incoming request: ${req.method} ${req.url}`);
        console.log('Headers:', req.headers);
    }

    async closeAll() {
        await Promise.all(this.servers.map((server) => {
            return new Promise((resolve) => {
                server.close(() => {
                    console.log(`Server on port ${server.address().port} closed`);
                    this.emit('closed', server.address().port);
                    resolve();
                });
            });
        }));
        this.servers = [];
    }

    listActiveProxies() {
        return this.servers.map(server => ({
            port: server.address().port,
            address: server.address().address,
        }));
    }
}

module.exports = ProxyManager;
