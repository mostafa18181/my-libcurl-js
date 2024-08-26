const EncryptionClient = require('../../security/encryption');
const fs = require('fs');
const crypto = require("crypto");
const os = require("os");
const path = require("path");

const {createReadStream, createWriteStream} = require('fs');
describe('EncryptionClient Unit Tests', () => {
    let encryptionClient;
    const sampleText = 'Hello, World!333';

    beforeEach(() => {
        encryptionClient = new EncryptionClient('aes-256-cbc', crypto.randomBytes(32))
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
        const inputFile = path.join(os.homedir(), './testInput.txt');
        const encryptedFile = 'testCerts/testEncrypted.enc';
        const decryptedFile = 'testCerts/testDecrypted.txt';

        fs.writeFileSync(inputFile, sampleText);


        encryptionClient.encryptFile(inputFile, encryptedFile);


        encryptionClient.decryptFile(encryptedFile, decryptedFile);

        // Read the decrypted content
        const decryptedContent = fs.readFileSync(decryptedFile, 'utf8');

        // Check that the decrypted content matches the original text
        expect(decryptedContent).toBe(sampleText);

        // Clean up test files
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(encryptedFile)) fs.unlinkSync(encryptedFile);
        if (fs.existsSync(decryptedFile)) fs.unlinkSync(decryptedFile);
    });


});
