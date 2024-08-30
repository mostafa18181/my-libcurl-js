/**
 * Description:
 * The `CertManager` class provides functionality for managing SSL/TLS certificates. It supports creating self-signed certificates, loading existing certificates, listing available certificates, and checking their expiration status. This class is particularly useful for managing certificates in a development or testing environment where self-signed certificates are often used.
 *
 * Purpose of the File:
 * - Generate self-signed certificates for secure connections.
 * - Load and read existing certificates and their keys.
 * - List all available certificates in a specified directory.
 * - Check the expiration date of a given certificate using OpenSSL.
 */

const pem = require('pem');
const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');

class CertManager {
    constructor(certDir) {
        this.certDir = certDir;
        this._ensureCertDir();
    }

    _ensureCertDir() {
        if (!fs.existsSync(this.certDir)) {
            fs.mkdirSync(this.certDir, {recursive: true});
            console.log(`Certificate directory created: ${this.certDir}`);
        }
    }

    generateSelfSignedCert(commonName) {
        const certPath = path.join(this.certDir, `${commonName}.cert`);
        const keyPath = path.join(this.certDir, `${commonName}.key`);

        if (fs.existsSync(certPath) || fs.existsSync(keyPath)) {
            throw new Error(`Certificate for ${commonName} already exists.`);
        }

        return new Promise((resolve, reject) => {
            pem.createCertificate({commonName}, (err, keys) => {
                if (err) {
                    return reject(err);
                }
                fs.writeFileSync(certPath, keys.certificate);
                fs.writeFileSync(keyPath, keys.serviceKey);
                resolve({certPath, keyPath});
            });
        });
    }

    loadCertificate(certPath, keyPath) {
        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
            throw new Error(`Certificate or key not found.`);
        }
        const cert = fs.readFileSync(certPath, 'utf8');
        const key = fs.readFileSync(keyPath, 'utf8');
        return {cert, key};
    }

    listCertificates() {
        return fs.readdirSync(this.certDir).filter(file => file.endsWith('.cert'));
    }

    checkCertificateExpiration(certPath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(certPath)) {
                return reject(new Error(`Certificate file not found: ${certPath}`));
            }

            const command = `openssl x509 -enddate -noout -in "${certPath}"`;
            exec(command, (err, stdout, stderr) => {
                if (err || stderr) {
                    return reject(new Error(`OpenSSL error: ${stderr || err.message}`));
                }

                const match = stdout.match(/notAfter=(.*)/);
                if (match && match[1]) {
                    const expirationDate = new Date(match[1]);
                    const now = new Date();
                    const daysLeft = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
                    return resolve(daysLeft);
                } else {
                    return reject(new Error('Could not parse expiration date.'));
                }
            });
        });
    }
}

module.exports = CertManager;
