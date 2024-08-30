const CertManager = require('../../security/certManager');
const fs = require('fs');
const path = require('path');

describe('CertManager Unit Tests', () => {
    let certManager;
    const testCertsDir = './testCerts';
    const commonNames = ['test.local', 'duplicate.local', 'test1.local', 'test2.local'];

    // Clean up test certificates after each test
    afterEach(() => {
        commonNames.forEach(name => {
            const certPath = path.join(testCertsDir, `${name}.cert`);
            const keyPath = path.join(testCertsDir, `${name}.key`);
            if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
            if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
        });
    });

    // Set up the test environment before each test
    beforeEach(() => {
        certManager = new CertManager(testCertsDir);
        if (fs.existsSync(testCertsDir)) {
            fs.rmSync(testCertsDir, {recursive: true, force: true});
        }
    });

    test('should generate a self-signed certificate, ensuring no duplicate exists', async () => {
        const commonName = 'test.local';
        const certInfo = await certManager.generateSelfSignedCert(commonName);
        expect(fs.existsSync(certInfo.certPath)).toBe(true);
        expect(fs.existsSync(certInfo.keyPath)).toBe(true);
    });

    test('should create certificate directory if it does not exist', () => {
        if (fs.existsSync(testCertsDir)) {
            fs.rmdirSync(testCertsDir, {recursive: true});
        }
        certManager._ensureCertDir();
        expect(fs.existsSync(testCertsDir)).toBe(true);
    });

    test('should load an existing certificate', async () => {
        const certInfo = await certManager.generateSelfSignedCert('test.local');
        const loadedCert = certManager.loadCertificate(certInfo.certPath, certInfo.keyPath);
        expect(typeof loadedCert.cert).toBe('string');
        expect(typeof loadedCert.key).toBe('string');
    });

    test('should throw an error if certificate file does not exist', () => {
        expect(() => certManager.loadCertificate('nonexistent.cert', 'nonexistent.key')).toThrow();
    });

    test('should list all certificates in the directory', async () => {
        await certManager.generateSelfSignedCert('test1.local');
        await certManager.generateSelfSignedCert('test2.local');
        const certs = certManager.listCertificates();
        expect(certs.length).toBeGreaterThanOrEqual(2);
    });

    test('should correctly check certificate expiration', async () => {
        const certInfo = await certManager.generateSelfSignedCert('test.local');
        const daysLeft = await certManager.checkCertificateExpiration(certInfo.certPath);
        expect(typeof daysLeft).toBe('number');
    });

    test('should throw an error if trying to generate a certificate with an existing name', async () => {
        const commonName = 'duplicate.local';
        await certManager.generateSelfSignedCert(commonName);
        await expect(certManager.generateSelfSignedCert(commonName)).rejects.toThrow();
    });
});
