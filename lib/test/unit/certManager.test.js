const CertManager = require('../../security/certManager');
const {logout} = require("ftp");
const fs = require('fs');
const path = require('path');
const os = require('os');


describe('CertManager Unit Tests', () => {
    let certManager;
    //
    afterEach(() => {
        const certPath = `./testCerts/test.local.cert`;
        const keyPath = `./testCerts/test.local.key`;
        if (fs.existsSync(certPath)) {
            fs.unlinkSync(certPath);
        }
        if (fs.existsSync(keyPath)) {
            fs.unlinkSync(keyPath);
        }


    });
    beforeEach(() => {
        certManager = new CertManager('./testCerts');
        const certPath = `./testCerts/duplicate.local.cert`;
        const keyPath = `./testCerts/duplicate.local.key`;

        if (fs.existsSync(certPath)) {
            fs.unlinkSync(certPath);
        }

        if (fs.existsSync(keyPath)) {


            fs.unlinkSync(keyPath);
        }
    });


    test('should generate a self-signed certificate, ensuring no duplicate exists', async () => {
        const commonName = 'test.local';

        // حذف گواهی‌های قبلی با همین نام (در صورت وجود)
        const certPath = `./testCerts/${commonName}.cert`;
        const keyPath = `./testCerts/${commonName}.key`;
        if (fs.existsSync(certPath)) {
            fs.unlinkSync(certPath);
        }
        if (fs.existsSync(keyPath)) {
            fs.unlinkSync(keyPath);
        }

        const certInfo = await certManager.generateSelfSignedCert(commonName);
        expect(fs.existsSync(certInfo.certPath)).toBe(true);
        expect(fs.existsSync(certInfo.keyPath)).toBe(true);
    });

    test('should create certificate directory if it does not exist', () => {
        if (fs.existsSync('./testCerts')) {
            fs.rmdirSync('./testCerts', {recursive: true});
        }
        certManager._ensureCertDir();
        expect(fs.existsSync('./testCerts')).toBe(true);
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

        // حذف گواهی‌های قبلی با همین نام (در صورت وجود)
        const certPath = `./testCerts/${commonName}.cert`;
        const keyPath = `./testCerts/${commonName}.key`;
        if (fs.existsSync(certPath)) {
            console.log(`Certificate file found before deletion: ${certPath}`);
            fs.unlinkSync(certPath);
            console.log(`Certificate file deleted: ${certPath}`);
        } else {
            console.log(`Certificate file not found before creation: ${certPath}`);
        }

        if (fs.existsSync(certPath)) {
            fs.unlinkSync(certPath);
        }
        if (fs.existsSync(keyPath)) {
            fs.unlinkSync(keyPath);
        }


        await certManager.generateSelfSignedCert(commonName);

        console.log("1111111111")


        await expect(() => certManager.generateSelfSignedCert(commonName)).toThrow();

    });
});
