const http2 = require('http2');
const fs = require('fs');
const url = require('url');

class Http2Client {
    constructor(baseURL = '', sslOptions = {}) {
        this.baseURL = baseURL;
        this.headers = {};
        this.cookies = {};
        this.timeout = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // in ms
        this.sslOptions = sslOptions;
        this.client = null; // Reusable HTTP/2 client connection
    }

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

    setCookie(name, value) {
        this.cookies[name] = value;
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

    _isRecoverableError(error) {
        const recoverableErrors = ['ETIMEDOUT', 'ECONNRESET', 'EPIPE'];
        return recoverableErrors.includes(error.code);
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

        if (Object.keys(this.cookies).length > 0) {
            const cookieHeader = Object.entries(this.cookies)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
            options.headers['Cookie'] = cookieHeader;
        }

        return options;
    }

    _handleStream(resolve, reject, stream) {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
            const body = Buffer.concat(chunks);
            if (stream.statusCode >= 200 && stream.statusCode < 300) {
                resolve({status: stream.statusCode, headers: stream.headers, body});
            } else {
                reject(new Error(`HTTP/2 error: ${stream.statusCode} - ${body.toString()}`));
            }
        });

        // Enhanced error handling
        stream.on('error', (error) => reject(new Error(`Stream error: ${error.message}`)));
        stream.on('aborted', () => reject(new Error('Stream aborted')));
        stream.on('frameError', (type, code, id) => reject(new Error(`Frame error: type=${type}, code=${code}, id=${id}`)));

        // HTTP/2 Server Push handling
        stream.on('push', (pushRequest, flags) => {
            console.log('Received HTTP/2 Push:', pushRequest.path);
            pushRequest.on('response', (headers, flags) => {
                console.log('Push Response Headers:', headers);
            });

            pushRequest.on('data', (chunk) => {
                console.log('Push Data:', chunk.toString());
            });

            pushRequest.on('end', () => {
                console.log('Push Request Ended');
            });
        });
    }

    _handleError(reject, error, attempt, method, path, body, additionalOptions) {
        if (attempt < this.maxRetries && this._isRecoverableError(error)) {
            setTimeout(() => {
                this.request(method, path, body, additionalOptions, attempt + 1)
                    .then((result) => reject(null, result))
                    .catch((err) => reject(err));
            }, this.retryDelay);
        } else {
            reject(new Error(`Network error: ${error.message}`));
        }
    }

    _getClient() {
        if (!this.client) {
            this.client = http2.connect(this.baseURL, this.sslOptions);
            this.client.on('error', (err) => console.error('HTTP/2 client error:', err));
        }
        return this.client;
    }

    request(method, path, body = null, additionalOptions = {}, attempt = 0) {
        return new Promise((resolve, reject) => {
            const options = this._buildOptions(method, path, additionalOptions);
            const client = this._getClient();

            const req = client.request({
                ...options.headers,
                ':method': method,
                ':path': path,
            });

            this._handleStream(resolve, reject, req);

            if (this.timeout) req.setTimeout(this.timeout, () => req.abort());

            if (body) {
                if (body instanceof Stream) {
                    body.pipe(req);
                } else {
                    req.write(body);
                }
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

    close() {
        if (this.client) {
            this.client.close();
            this.client = null;
        }
    }
}

module.exports = Http2Client;
