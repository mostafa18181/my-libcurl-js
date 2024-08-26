const fs = require('fs');
const tls = require('tls');
const crypto = require('crypto');

class SslClient {
    constructor(options = {}) {
        this.options = {
            minVersion: 'TLSv1.2', // Enforce strong TLS versions
            maxVersion: 'TLSv1.3', // Support TLS 1.3
            ciphers: tls.getCiphers().join(':'), // Default cipher suites
            ...options,
        };
        this.acl = []; // List for Access Control
    }

    loadCertificates(certPath, keyPath, caPath) {
        try {
            if (certPath) this._validatePath(certPath);
            if (keyPath) this._validatePath(keyPath);
            if (caPath) this._validatePath(caPath);

            if (certPath) this.options.cert = fs.readFileSync(certPath);
            if (keyPath) this.options.key = fs.readFileSync(keyPath);
            if (caPath) this.options.ca = fs.readFileSync(caPath);
        } catch (error) {
            throw new Error(`Error loading SSL certificates: ${error.message}`);
        }
    }

    _validatePath(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
    }

    createSecureContext() {
        try {
            this.context = tls.createSecureContext(this.options);
            console.log('Secure context created with TLS 1.3 support.');
            return this.context;
        } catch (error) {
            throw new Error(`Error creating secure context: ${error.message}`);
        }
    }

    setCipherSuites(ciphers) {
        this.options.ciphers = ciphers.join(':');
        console.log('Cipher suites set.');
    }

    setSNI(servername) {
        this.options.servername = servername;
        console.log('SNI set.');
    }

    generateSelfSignedCert(options = {}) {
        const {commonName = 'localhost', days = 365} = options;
        const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        const cert = crypto.createCertificate();
        cert.setSubject([{name: 'commonName', value: commonName}]);
        cert.setIssuer([{name: 'commonName', value: commonName}]);
        cert.setPublicKey(publicKey);
        cert.setPrivateKey(privateKey);
        cert.setNotBefore(new Date());
        cert.setNotAfter(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
        cert.sign(privateKey);

        return {
            cert: cert.export({type: 'pem', format: 'pem'}),
            key: privateKey.export({type: 'pkcs8', format: 'pem'}),
        };
    }

    verifyCertificate(certPath, caPath) {
        try {
            this._validatePath(certPath);
            this._validatePath(caPath);

            const cert = fs.readFileSync(certPath);
            const ca = fs.readFileSync(caPath);

            const verify = crypto.verify(
                'sha256',
                cert,
                {
                    key: ca,
                    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                },
                cert
            );

            console.log('Certificate verification:', verify ? 'Valid' : 'Invalid');
            return verify;
        } catch (error) {
            throw new Error(`Error verifying certificate: ${error.message}`);
        }
    }

    createSecureServer(options, requestListener) {
        try {
            const serverOptions = {
                ...this.options,
                ...options,
                secureContext: this.context,
            };

            const server = tls.createServer(serverOptions, requestListener);
            console.log('Secure server created with TLS 1.3 support.');
            return server;
        } catch (error) {
            throw new Error(`Error creating secure server: ${error.message}`);
        }
    }

    connectToSecureServer(host, port, timeout = 10000) {
        try {
            const socket = tls.connect(port, host, {...this.options, timeout}, () => {
                console.log('Connected to secure server with TLS 1.3 support');
            });

            socket.on('data', (data) => {
                console.log('Received:', data.toString());
            });

            socket.on('error', (error) => {
                console.error('TLS connection error:', error.message);
            });

            socket.on('end', () => {
                console.log('Connection ended.');
            });

            socket.setTimeout(timeout, () => {
                console.log('Connection timed out.');
                socket.end();
            });

            return socket;
        } catch (error) {
            throw new Error(`Error connecting to secure server: ${error.message}`);
        }
    }

    // Access Control List (ACL) management
    addAclEntry(ip) {
        if (!this.acl.includes(ip)) {
            this.acl.push(ip);
            console.log(`Added ${ip} to ACL`);
        }
    }

    removeAclEntry(ip) {
        this.acl = this.acl.filter(entry => entry !== ip);
        console.log(`Removed ${ip} from ACL`);
    }

    checkAccess(ip) {
        const allowed = this.acl.includes(ip);
        console.log(`Access check for ${ip}: ${allowed ? 'Allowed' : 'Denied'}`);
        return allowed;
    }

    // Example use case for enforcing ACL in the server connection
    createSecureServerWithAcl(options, requestListener) {
        try {
            const serverOptions = {
                ...this.options,
                ...options,
                secureContext: this.context,
            };

            const server = tls.createServer(serverOptions, (socket) => {
                const clientIp = socket.remoteAddress;
                if (this.checkAccess(clientIp)) {
                    requestListener(socket);
                } else {
                    console.log(`Connection denied for ${clientIp}`);
                    socket.destroy();
                }
            });

            console.log('Secure server with ACL created.');
            return server;
        } catch (error) {
            throw new Error(`Error creating secure server with ACL: ${error.message}`);
        }
    }
}

module.exports = SslClient;
