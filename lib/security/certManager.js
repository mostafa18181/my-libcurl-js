// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');
//
// class CertManager {
//     constructor(certDir = './certs') {
//         this.certDir = certDir;
//         this._ensureCertDir();
//     }
//
//     _ensureCertDir() {
//         if (!fs.existsSync(this.certDir)) {
//             fs.mkdirSync(this.certDir, {recursive: true});
//             console.log(`Certificate directory created: ${this.certDir}`);
//         }
//     }
//
//     generateSelfSignedCert(commonName = 'localhost', days = 365, algorithm = 'rsa', keySize = 2048) {
//         const certPath = path.join(this.certDir, `${commonName}.cert.pem`);
//         const keyPath = path.join(this.certDir, `${commonName}.key.pem`);
//
//         if (fs.existsSync(certPath) || fs.existsSync(keyPath)) {
//             throw new Error(`Certificate or key already exists for ${commonName}. Generation aborted.`);
//         }
//
//         let keyPair;
//         if (algorithm === 'ecdsa') {
//             keyPair = crypto.generateKeyPairSync('ec', {
//                 namedCurve: 'P-256',
//             });
//         } else {
//             keyPair = crypto.generateKeyPairSync('rsa', {
//                 modulusLength: keySize,
//             });
//         }
//
//         const cert = crypto.createCertificate();
//         cert.setSubject([{name: 'commonName', value: commonName}]);
//         cert.setIssuer([{name: 'commonName', value: commonName}]);
//         cert.setPublicKey(keyPair.publicKey);
//         cert.setPrivateKey(keyPair.privateKey);
//         cert.setNotBefore(new Date());
//         cert.setNotAfter(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
//         cert.sign(keyPair.privateKey);
//
//         fs.writeFileSync(certPath, cert.export({type: 'pem', format: 'pem'}));
//         fs.writeFileSync(keyPath, keyPair.privateKey.export({type: 'pkcs8', format: 'pem'}));
//
//         console.log(`Self-signed ${algorithm.toUpperCase()} certificate generated: ${certPath}`);
//         return {certPath, keyPath};
//     }
//
//     loadCertificate(certPath, keyPath) {
//         try {
//             const cert = fs.readFileSync(certPath, 'utf8');
//             const key = fs.readFileSync(keyPath, 'utf8');
//             console.log(`Certificate loaded: ${certPath}`);
//             return {cert, key};
//         } catch (error) {
//             if (error.code === 'ENOENT') {
//                 throw new Error(`Certificate or key file not found: ${error.message}`);
//             } else {
//                 throw new Error(`Error loading certificate: ${error.message}`);
//             }
//         }
//     }
//
//     verifyCertificate(certPath, caPath, crlPath = null) {
//         try {
//             const cert = fs.readFileSync(certPath);
//             const ca = fs.readFileSync(caPath);
//             let crl = null;
//
//             if (crlPath) {
//                 crl = fs.readFileSync(crlPath);
//             }
//
//             const verifyOptions = {
//                 key: ca,
//                 padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
//             };
//
//             if (crl) {
//                 verifyOptions.crl = crl;
//             }
//
//             const verify = crypto.verify('sha256', cert, verifyOptions, cert);
//
//             console.log('Certificate verification:', verify ? 'Valid' : 'Invalid');
//             return verify;
//         } catch (error) {
//             throw new Error(`Error verifying certificate: ${error.message}`);
//         }
//     }
//
//     loadCRL(crlPath) {
//         try {
//             if (!fs.existsSync(crlPath)) {
//                 throw new Error(`CRL file not found: ${crlPath}`);
//             }
//             const crl = fs.readFileSync(crlPath);
//             console.log(`CRL loaded: ${crlPath}`);
//             return crl;
//         } catch (error) {
//             throw new Error(`Error loading CRL: ${error.message}`);
//         }
//     }
//
//     listCertificates() {
//         try {
//             const files = fs.readdirSync(this.certDir).filter(file => file.endsWith('.cert.pem'));
//             console.log(`Certificates found: ${files.length}`);
//             return files.map(file => path.join(this.certDir, file));
//         } catch (error) {
//             throw new Error(`Error listing certificates: ${error.message}`);
//         }
//     }
//
//     revokeCertificate(certPath, crlPath) {
//         try {
//             const certName = path.basename(certPath, '.cert.pem');
//             const keyPath = path.join(this.certDir, `${certName}.key.pem`);
//
//             fs.unlinkSync(certPath);
//             if (fs.existsSync(keyPath)) {
//                 fs.unlinkSync(keyPath);
//             }
//
//             const crl = this.loadCRL(crlPath);
//             // CRL update logic would go here
//
//             console.log(`Certificate revoked and deleted: ${certPath}`);
//         } catch (error) {
//             if (error.code === 'ENOENT') {
//                 throw new Error(`Certificate or key file not found: ${error.message}`);
//             } else {
//                 throw new Error(`Error revoking certificate: ${error.message}`);
//             }
//         }
//     }
//
//     backupCertificates(backupDir) {
//         try {
//             if (!fs.existsSync(backupDir)) {
//                 fs.mkdirSync(backupDir, {recursive: true});
//             }
//
//             const files = this.listCertificates();
//             files.forEach(file => {
//                 const destPath = path.join(backupDir, path.basename(file));
//                 fs.copyFileSync(file, destPath);
//                 console.log(`Certificate backed up: ${file}`);
//             });
//
//             console.log(`All certificates backed up to: ${backupDir}`);
//         } catch (error) {
//             throw new Error(`Error backing up certificates: ${error.message}`);
//         }
//     }
//
//     restoreCertificates(backupDir) {
//         try {
//             const files = fs.readdirSync(backupDir).filter(file => file.endsWith('.cert.pem'));
//             files.forEach(file => {
//                 const srcPath = path.join(backupDir, file);
//                 const destPath = path.join(this.certDir, file);
//                 fs.copyFileSync(srcPath, destPath);
//                 console.log(`Certificate restored: ${destPath}`);
//             });
//
//             console.log(`All certificates restored from: ${backupDir}`);
//         } catch (error) {
//             throw new Error(`Error restoring certificates: ${error.message}`);
//         }
//     }
//
//     checkCertificateExpiration(certPath) {
//         try {
//             const cert = fs.readFileSync(certPath, 'utf8');
//             const matches = cert.match(/Not After : (.*)/);
//             if (matches) {
//                 const expirationDate = new Date(matches[1]);
//                 const now = new Date();
//                 const daysLeft = Math.round((expirationDate - now) / (1000 * 60 * 60 * 24));
//                 console.log(`Certificate ${path.basename(certPath)} expires in ${daysLeft} days.`);
//                 return daysLeft;
//             } else {
//                 throw new Error('Could not find expiration date in certificate.');
//             }
//         } catch (error) {
//             throw new Error(`Error checking certificate expiration: ${error.message}`);
//         }
//     }
// }
//
// module.exports = CertManager;
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

    // checkCertificateExpiration(certPath) {
    //     return new Promise((resolve, reject) => {
    //         if (!fs.existsSync(certPath)) {
    //             return reject(new Error(`Certificate file not found: ${certPath}`));
    //         }
    //
    //         const command = `openssl x509 -enddate -noout -in "${certPath}"`;
    //         exec(command, (err, stdout, stderr) => {
    //             if (err || stderr) {
    //                 return reject(new Error(`OpenSSL error: ${stderr || err.message}`));
    //             }
    //
    //             const match = stdout.match(/notAfter=(.*)/);
    //             if (match && match[1]) {
    //                 const expirationDate = new Date(match[1]);
    //                 const now = new Date();
    //                 const daysLeft = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
    //                 return resolve(daysLeft);
    //             } else {
    //                 return reject(new Error('Could not parse expiration date.'));
    //             }
    //         });
    //     });
    // }

    // checkCertificateExpiration(certPath) {
    //     return new Promise((resolve, reject) => {
    //
    //
    //         if (!fs.existsSync(certPath)) {
    //             return reject(new Error(`Certificate file not found: ${certPath}`));
    //         }
    //         pem.readCertificateInfo(certPath, (err, info) => {
    //             if (err) {
    //                 console.log("err", err)
    //                 return reject(err);
    //             }
    //             const daysLeft = Math.ceil((new Date(info.validity.end) - new Date()) / (1000 * 60 * 60 * 24));
    //             resolve(daysLeft);
    //         });
    //     });
    // }

}

module.exports = CertManager;
