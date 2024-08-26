const https = require('https');
const url = require('url');
const {CookieJar} = require('tough-cookie');
const http2 = require('http2');

class HttpsClient {
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
        this.sslOptions = sslOptions;
        this.cache = new Map(); // Simple cache store
        this.maxRedirects = 5; // Maximum number of redirects to follow
    }

    setHeader(name, value) {
        this.headers[name] = value;
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
            ...this.sslOptions,
        };

        const cookieString = this.cookieJar.getCookieStringSync(parsedUrl.href);
        if (cookieString) {
            options.headers['Cookie'] = cookieString;
        }

        return {options, parsedUrl};
    }

    _handleResponse(resolve, reject, res, method, path, body, additionalOptions, redirectCount) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            const bodyData = Buffer.concat(chunks);
            if (res.headers['set-cookie']) {
                this.cookieJar.setCookieSync(res.headers['set-cookie'], url.parse(`${this.baseURL}${path}`).href);
            }

            // Handle caching
            if (res.headers['cache-control']) {
                this._handleCache(path, bodyData, res.headers['cache-control']);
            }

            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectCount < this.maxRedirects) {
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

    _handleCache(path, bodyData, cacheControl) {
        if (cacheControl.includes('no-cache')) {
            this.cache.delete(path);
        } else if (cacheControl.includes('max-age')) {
            const maxAge = parseInt(cacheControl.split('max-age=')[1], 10);
            this.cache.set(path, {bodyData, expires: Date.now() + maxAge * 1000});
        }
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

    _supportHttp2Push(resolve, reject, req, res) {
        if (http2.constants.NGHTTP2_REFUSED_STREAM) {
            res.on('push', (pushRequest, flags) => {
                console.log('HTTP/2 Push received', pushRequest);
                pushRequest.on('data', (chunk) => {
                    console.log(`Push data: ${chunk}`);
                });
            });
        }
    }

    async request(method, path, body = null, additionalOptions = {}, redirectCount = 0, attempt = 0) {
        if (this.cache.has(path)) {
            const cachedResponse = this.cache.get(path);
            if (cachedResponse.expires > Date.now()) {
                return Promise.resolve({
                    status: 200,
                    headers: {'cache-control': 'from-cache'},
                    body: cachedResponse.bodyData,
                });
            }
            this.cache.delete(path);
        }

        return new Promise((resolve, reject) => {
            const {options} = this._buildOptions(method, path, additionalOptions);
            const req = https.request(options, (res) => this._handleResponse(resolve, reject, res, method, path, body, additionalOptions, redirectCount));
            req.on('error', (error) => this._handleError(reject, error, attempt, method, path, body, additionalOptions));
            if (this.timeout) req.setTimeout(this.timeout, () => req.abort());

            // Support for HTTP/2 Server Push
            this._supportHttp2Push(resolve, reject, req, res);

            if (body) {
                req.write(body);
            }

            req.end();
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
}

module.exports = HttpsClient;

