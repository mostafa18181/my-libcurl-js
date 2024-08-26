const crypto = require('crypto');
const fs = require('fs');
const {createReadStream} = require("fs");
const os = require("os");
const path = require("path");

class EncryptionClient {
    constructor(algorithm = 'aes-256-cbc', key = null) {
        this.supportedAlgorithms = [
            'aes-256-cbc',
            'aes-256-gcm', // الگوریتم مدرن‌تر با احراز هویت
            'chacha20-poly1305', // الگوریتم سریع‌تر و ایمن‌تر
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
                return 32; // 256-bit key
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
                return 12; // 96-bit IV (recommended size for GCM)
            case 'chacha20-poly1305':
                return 12; // 96-bit nonce (used as IV)
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

    // encryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const iv = crypto.randomBytes(this._getIvSize(this.algorithm)); // Generate IV
    //         const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         output.write(iv.toString('hex')); // Prepend the IV to the output file
    //         if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
    //             output.on('finish', () => {
    //                 output.write(cipher.getAuthTag().toString('hex')); // Write auth tag at the end
    //             });
    //         }
    //         input.pipe(cipher).pipe(output);
    //         console.log(`File encrypted: ${outputFilePath}`);
    //     } catch (error) {
    //         throw new Error(`File encryption error: ${error.message}`);
    //     }
    // }
    // encryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const iv = crypto.randomBytes(this._getIvSize(this.algorithm)); // Generate IV
    //         const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //         console.log("iv", iv.toString())
    //         output.write(iv); // Write the IV to the output file
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         input.pipe(cipher).pipe(output);
    //
    //         return iv.toString('hex'); // Return IV to be used for decryption
    //     } catch (error) {
    //         throw new Error(`File encryption error: ${error.message}`);
    //     }
    // }
    //
    // decryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //         let iv;
    //
    //         input.once('readable', () => {
    //             iv = input.read(this._getIvSize(this.algorithm)); // Read the IV from the start of the file
    //             console.log('IV read from file:', iv.toString('hex')); // چاپ مقدار IV برای بررسی
    //
    //             const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    //
    //             if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
    //                 const authTag = input.read(16); // Adjust size according to your needs
    //                 console.log('Auth Tag read from file:', authTag.toString('hex')); // چاپ Auth Tag برای بررسی
    //                 decipher.setAuthTag(authTag); // Set the auth tag for GCM or Poly1305
    //             }
    //
    //             input.pipe(decipher).pipe(output);
    //         });
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         output.on('finish', () => {
    //             console.log(`File decrypted: ${outputFilePath}`);
    //         });
    //
    //     } catch (error) {
    //         throw new Error(`File decryption error: ${error.message}`);
    //     }
    // }

    // decryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //         let iv;
    //         console.log("*1 ",)
    //
    //         input.once('readable', () => {
    //             console.log("*2 ",)
    //
    //             iv = input.read(this._getIvSize(this.algorithm)); // Read the IV from the start of the file
    //             console.log("iv3 ", iv.toString())
    //
    //             const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    //
    //             if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
    //                 const authTag = input.read(16); // Adjust size according to your needs
    //                 decipher.setAuthTag(authTag); // Set the auth tag for GCM or Poly1305
    //             }
    //
    //             input.pipe(decipher).pipe(output);
    //         });
    //
    //         input.on('error', (err) => {
    //             console.log("*3 ",)
    //
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             console.log("*4 ",)
    //
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         output.on('finish', () => {
    //             console.log("*5 ",)
    //
    //             console.log(`File decrypted: ${outputFilePath}`);
    //         });
    //
    //     } catch (error) {
    //         console.log("*6 ",)
    //
    //         throw new Error(`File decryption error: ${error.message}`);
    //     }
    // }

    // decryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //         let iv;
    //
    //         input.once('readable', () => {
    //             iv = input.read(this._getIvSize(this.algorithm)); // Read the IV from the start of the file
    //             const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    //
    //             if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
    //                 const authTag = input.read(16); // Adjust size according to your needs
    //                 decipher.setAuthTag(authTag); // Set the auth tag for GCM or Poly1305
    //             }
    //
    //             input.pipe(decipher).pipe(output);
    //         });
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         output.on('finish', () => {
    //             console.log(`File decrypted: ${outputFilePath}`);
    //         });
    //
    //     } catch (error) {
    //         throw new Error(`File decryption error: ${error.message}`);
    //     }
    // }

    // decryptFile(inputFilePath, outputFilePath, iv) {
    //     try {
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //
    //         input.once('readable', () => {
    //             const ivBuffer = input.read(this._getIvSize(this.algorithm)); // Read the IV from the input file
    //             const decipher = crypto.createDecipheriv(this.algorithm, this.key, ivBuffer);
    //
    //             input.pipe(decipher).pipe(output);
    //         });
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         console.log(`File decrypted: ${outputFilePath}`);
    //     } catch (error) {
    //         throw new Error(`File decryption error: ${error.message}`);
    //     }
    // }

    // decryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //         let iv;
    //
    //         input.once('readable', () => {
    //             iv = input.read(this._getIvSize(this.algorithm) * 2); // Read the IV from the start of the file
    //             const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
    //             if (this.algorithm.includes('gcm') || this.algorithm.includes('poly1305')) {
    //                 const authTag = Buffer.alloc(16); // Adjust size according to your needs
    //                 input.once('end', () => {
    //                     decipher.setAuthTag(authTag); // Set the auth tag
    //                 });
    //             }
    //             input.pipe(decipher).pipe(output);
    //         });
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         console.log(`File decrypted: ${outputFilePath}`);
    //     } catch (error) {
    //         throw new Error(`File decryption error: ${error.message}`);
    //     }
    // }

    // encryptFile(inputFilePath, outputFilePath) {
    //     try {
    //         const iv = crypto.randomBytes(this._getIvSize(this.algorithm)); // Generate IV
    //         const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    //         const input = fs.createReadStream(inputFilePath);
    //         const output = fs.createWriteStream(outputFilePath);
    //
    //         input.on('error', (err) => {
    //             throw new Error(`File read error: ${err.message}`);
    //         });
    //
    //         output.on('error', (err) => {
    //             throw new Error(`File write error: ${err.message}`);
    //         });
    //
    //         output.write(iv); // Prepend the IV to the output file as binary
    //         input.pipe(cipher).pipe(output);
    //         console.log(`File encrypted: ${outputFilePath}`);
    //
    //         return iv.toString('hex'); // Return IV in hex format for decryption
    //     } catch (error) {
    //         throw new Error(`File encryption error: ${error.message}`);
    //     }
    // }
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

            // نوشتن IV به صورت باینری در ابتدای فایل
            output.write(iv);

            input.pipe(cipher).pipe(output);

            output.on('finish', () => {
                console.log(`File encrypted: ${outputFilePath}`);
            });

            return iv.toString('hex'); // بازگشت IV به صورت هگزا برای استفاده در رمزگشایی
        } catch (error) {
            throw new Error(`File encryption error: ${error.message}`);
        }
    }

    decryptFile(inputFilePath, outputFilePath) {
        try {
            console.log(inputFilePath, " ", outputFilePath)
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
