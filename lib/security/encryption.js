/**
 * Description:
 * The `EncryptionClient` class provides methods for encrypting and decrypting text and files using various modern encryption algorithms. It supports algorithms like AES-256-CBC, AES-256-GCM, and ChaCha20-Poly1305, which offer secure encryption with different strengths and performance characteristics. This class is useful for securely managing sensitive data through encryption in applications.
 *
 * Purpose of the File:
 * - Encrypt and decrypt text strings using supported algorithms.
 * - Encrypt and decrypt files while handling associated data like initialization vectors (IVs) and authentication tags.
 * - Generate secure random keys for encryption.
 */

const crypto = require('crypto');
const fs = require('fs');
const {createReadStream} = require("fs");
const os = require("os");
const path = require("path");

class EncryptionClient {
    constructor(algorithm = 'aes-256-cbc', key = null) {
        this.supportedAlgorithms = [
            'aes-256-cbc',
            'aes-256-gcm', // Modern algorithm with authentication
            'chacha20-poly1305', // Faster and more secure algorithm
        ];
        if (!this.supportedAlgorithms.includes(algorithm)) {
            throw new Error(`Unsupported algorithm: ${algorithm}. Supported algorithms are: ${this.supportedAlgorithms.join(', ')}`);
        }
        this.algorithm = algorithm;
        this.key = key || crypto.randomBytes(this._getKeySize(algorithm));
    }

    _getKeySize(algorithm) {
        switch (algorithm) {
            case 'aes-256-cbc':
            case 'aes-256-gcm':
            case 'chacha20-poly1305':
                return 32; // 256-bit key
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    _getIvSize(algorithm) {
        switch (algorithm) {
            case 'aes-256-cbc':
                return 16; // 128-bit IV
            case 'aes-256-gcm':
            case 'chacha20-poly1305':
                return 12; // 96-bit IV or nonce
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(this._getIvSize(this.algorithm)); // Generate IV
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
                const authTag = cipher.getAuthTag().toString('hex');
                return {
                    iv: iv.toString('hex'),
                    content: encrypted,
                    authTag, // For GCM and Poly1305
                };
            }
            return {
                iv: iv.toString('hex'),
                content: encrypted,
            };
        } catch (error) {
            throw new Error(`Encryption error: ${error.message}`);
        }
    }

    decrypt(encrypted) {
        try {
            const iv = Buffer.from(encrypted.iv, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
                decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex')); // For GCM and Poly1305
            }
            let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            throw new Error(`Decryption error: ${error.message}`);
        }
    }

    generateKey(size = 32) {
        try {
            return crypto.randomBytes(size).toString('hex');
        } catch (error) {
            throw new Error(`Key generation error: ${error.message}`);
        }
    }

    encryptFile(inputFilePath, outputFilePath) {
        try {
            const iv = crypto.randomBytes(this._getIvSize(this.algorithm)); // Generate IV
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            const input = fs.createReadStream(inputFilePath);
            const output = fs.createWriteStream(outputFilePath);

            input.on('error', (err) => {
                throw new Error(`File read error: ${err.message}`);
            });

            output.on('error', (err) => {
                throw new Error(`File write error: ${err.message}`);
            });

            // Write IV as binary at the beginning of the file
            output.write(iv);

            input.pipe(cipher).pipe(output);

            output.on('finish', () => {
                console.log(`File encrypted: ${outputFilePath}`);
            });

            return iv.toString('hex'); // Return IV as hex for decryption use
        } catch (error) {
            throw new Error(`File encryption error: ${error.message}`);
        }
    }

    decryptFile(inputFilePath, outputFilePath) {
        try {
            console.log(inputFilePath, " ", outputFilePath);
            const input = fs.createReadStream(inputFilePath);
            const output = fs.createWriteStream(outputFilePath);
            let iv;

            input.once('readable', () => {
                iv = input.read(this._getIvSize(this.algorithm)); // Read the IV from the start of the file
                const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

                if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
                    const authTag = input.read(16); // Adjust size according to your needs
                    decipher.setAuthTag(authTag); // Set the auth tag for GCM or Poly1305
                }

                input.pipe(decipher).pipe(output);
            });

            input.on('error', (err) => {
                throw new Error(`File read error: ${err.message}`);
            });

            output.on('error', (err) => {
                throw new Error(`File write error: ${err.message}`);
            });

            output.on('finish', () => {
                console.log(`File decrypted: ${outputFilePath}`);
            });

        } catch (error) {
            throw new Error(`File decryption error: ${error.message}`);
        }
    }
}

module.exports = EncryptionClient;
