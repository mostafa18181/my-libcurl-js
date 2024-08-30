const EncryptionClient = require('../../security/encryption');
const fs = require('fs');
const crypto = require("crypto");
const os = require("os");
const path = require("path");

describe('EncryptionClient Unit Tests', () => {
    let encryptionClient;
    const sampleText = 'Hello, World!333';
    const testDir = './testCerts';
    const inputFile = path.join(os.tmpdir(), 'testInput.txt');
    const encryptedFile = path.join(testDir, 'testEncrypted.enc');
    const decryptedFile = path.join(testDir, 'testDecrypted.txt');

    beforeEach(() => {
        // Initialize EncryptionClient with a random key and ensure the test directory exists
        encryptionClient = new EncryptionClient('aes-256-cbc', crypto.randomBytes(32));
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, {recursive: true});
        fs.writeFileSync(inputFile, sampleText); // Create input file for testing
    });

    afterEach(() => {
        // Cleanup generated files after each test
        [inputFile, encryptedFile, decryptedFile].forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
        if (fs.existsSync(testDir)) fs.rmdirSync(testDir, {recursive: true});
    });

    test('should encrypt and decrypt text successfully', () => {
        const encrypted = encryptionClient.encrypt(sampleText);
        const decrypted = encryptionClient.decrypt(encrypted);
        expect(decrypted).toBe(sampleText);
    });

    test('should generate a random key', () => {
        const key = encryptionClient.generateKey();
        expect(key).toHaveLength(64); // 32 bytes * 2 (hex)
    });

    test('should encrypt and decrypt file successfully', () => {
        // Encrypt the file
        encryptionClient.encryptFile(inputFile, encryptedFile);

        // Decrypt the file
        encryptionClient.decryptFile(encryptedFile, decryptedFile);

        // Read the decrypted content and check it matches the original text
        const decryptedContent = fs.readFileSync(decryptedFile, 'utf8');
        expect(decryptedContent).toBe(sampleText);
    });
});
