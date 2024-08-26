const https = require('https');
const url = require('url');
const fs = require('fs');
const {CookieJar} = require('tough-cookie');
const tls = require('tls');

class HttpsClient {
    // constructor(baseURL = '', sslOptions = {}) {
    //     this.baseURL = baseURL;
    //     this.headers = {
    //         'User-Agent': 'HttpsClient/1.0',
    //         'Content-Type': 'application/json',
    //     };
    //     this.cookieJar = new CookieJar();
    //     this.timeout = 0;
    //     this.maxRetries = 3;
    //     this.retryDelay = 1000; // in ms
    //     this.sslOptions = {
    //         minVersion: 'TLSv1.2',
    //         ciphers: sslOptions.ciphers || tls.getCiphers().join(':'),
    //         servername: sslOptions.servername || undefined,
    //         ...sslOptions,
    //     };
    //     this.maxRedirects = 5; // Maximum number of redirects to follow
    //     this.queue = [];
    //     this.concurrentRequests = 5; // Maximum number of concurrent requests
    //     this.runningRequests = 0;
    // }
    constructor(baseURL = '', sslOptions = {}) {
        this.baseURL = baseURL;
        this.headers = {
            'User-Agent': 'HttpsClient/1.0',
            'Content-Type': 'application/json',
        };
        this.cookieJar = new CookieJar();
        this.timeout = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // in ms

        // Load SSL options if provided
        this.sslOptions = {
            minVersion: 'TLSv1.2',
            ciphers: sslOptions.ciphers || tls.getCiphers().join(':'),
            servername: sslOptions.servername || undefined,
            ...sslOptions,
        };

        this.maxRedirects = 5; // Maximum number of redirects to follow
        this.queue = [];
        this.concurrentRequests = 5; // Maximum number of concurrent requests
        this.runningRequests = 0;
    }

    // static loadCerts(certPath, keyPath, caPath) {
    //     try {
    //         const sslOptions = {};
    //         if (certPath) sslOptions.cert = fs.readFileSync(certPath);
    //         if (keyPath) sslOptions.key = fs.readFileSync(keyPath);
    //         if (caPath) sslOptions.ca = fs.readFileSync(caPath);
    //         return sslOptions;
    //     } catch (error) {
    //         throw new Error(`Error loading SSL certificates: ${error.message}`);
    //     }
    // }
    static loadCerts(certPath, keyPath, caPath) {
        try {
            const sslOptions = {};
            if (certPath) sslOptions.cert = fs.readFileSync(certPath);
            if (keyPath) sslOptions.key = fs.readFileSync(keyPath);
            if (caPath) sslOptions.ca = fs.readFileSync(caPath);
            return sslOptions;
        } catch (error) {
            throw new Error(`Error loading SSL certificates: ${error.message}`);
        }
    }

    setHeader(name, value) {
        this.headers[name] = value;
    }

    removeHeader(name) {
        delete this.headers[name];
    }

    setAuthorization(token, type = 'Bearer') {
        this.headers['Authorization'] = `${type} ${token}`;
    }

    setCookie(name, value, url) {
        return this.cookieJar.setCookieSync(`${name}=${value}`, url);
    }

    setTimeout(timeout) {
        this.timeout = timeout;
    }

    setRetries(maxRetries, retryDelay = 1000) {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }

    updateSSLOptions(newSslOptions) {
        this.sslOptions = {...this.sslOptions, ...newSslOptions};
    }

    _buildOptions(method, path, additionalOptions = {}) {
        const parsedUrl = url.parse(`${this.baseURL}${path}`);
        const options = {
            method,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            headers: {...this.headers, ...additionalOptions.headers},
            timeout: this.timeout,
            ...this.sslOptions, // اعمال تنظیمات SSL/TLS
        };

        const cookieString = this.cookieJar.getCookieStringSync(parsedUrl.href);
        if (cookieString) {
            options.headers['Cookie'] = cookieString;
        }

        return {options};
    }

    _handleResponse(resolve, reject, res, method, path, body, additionalOptions, redirectCount) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            const bodyData = Buffer.concat(chunks);

            // ذخیره کوکی‌های جدید
            const parsedUrl = url.parse(`${this.baseURL}${path}`);
            this.cookieJar.setCookieSync(res.headers['set-cookie'], parsedUrl.href);

            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectCount < this.maxRedirects) {
                // Handle redirect
                const redirectUrl = res.headers.location;
                console.log(`Redirecting to: ${redirectUrl}`);
                this.request(method, redirectUrl, body, additionalOptions, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({status: res.statusCode, headers: res.headers, body: bodyData});
            } else {
                reject(new Error(`HTTPS error: ${res.statusCode} - ${bodyData.toString()}`));
            }
        });
    }

    _handleError(reject, error, attempt, method, path, body, additionalOptions) {
        if (attempt < this.maxRetries) {
            setTimeout(() => {
                this.request(method, path, body, additionalOptions, 0, attempt + 1)
                    .then(resolve)
                    .catch(reject);
            }, this.retryDelay);
        } else {
            reject(new Error(`Network error: ${error.message}`));
        }
    }

    async request(method, path, body = null, additionalOptions = {}, redirectCount = 0, attempt = 0) {
        if (this.runningRequests >= this.concurrentRequests) {
            return new Promise((resolve) => {
                this.queue.push(() => resolve(this.request(method, path, body, additionalOptions, redirectCount, attempt)));
            });
        }

        this.runningRequests += 1;

        return new Promise((resolve, reject) => {
            const {options} = this._buildOptions(method, path, additionalOptions);
            const req = https.request(options, (res) => this._handleResponse(resolve, reject, res, method, path, body, additionalOptions, redirectCount));
            req.on('error', (error) => this._handleError(reject, error, attempt, method, path, body, additionalOptions));
            if (this.timeout) req.setTimeout(this.timeout, () => req.abort());

            if (body) {
                req.write(body);
            }

            req.end();
        }).finally(() => {
            this.runningRequests -= 1;
            if (this.queue.length > 0) {
                const nextRequest = this.queue.shift();
                nextRequest();
            }
        });
    }

    get(path, additionalOptions = {}) {
        return this.request('GET', path, null, additionalOptions);
    }

    post(path, body, additionalOptions = {}) {
        return this.request('POST', path, body, additionalOptions);
    }

    put(path, body, additionalOptions = {}) {
        return this.request('PUT', path, body, additionalOptions);
    }

    delete(path, additionalOptions = {}) {
        return this.request('DELETE', path, null, additionalOptions);
    }

    async requestAll(requests) {
        return Promise.all(requests.map(req => this.request(...req)));
    }
}

module.exports = HttpsClient;
