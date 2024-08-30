/**
 * Description:
 * The `SmtpClient` class provides functionality for sending emails using SMTP (Simple Mail Transfer Protocol). It is built using the Nodemailer library, which supports various SMTP configurations, including secure connections with SSL/TLS. The class handles connection pooling, automatic retries on transient errors, and supports loading custom certificates for secure communication.
 *
 * Purpose of the File:
 * - Manage SMTP connections for sending emails.
 * - Retry sending emails on failure, with customizable retry attempts and delay.
 * - Verify the SMTP server connection status before sending emails.
 * - Support secure email sending with SSL/TLS certificates.
 */

const nodemailer = require('nodemailer');
const fs = require('fs');

class SmtpClient {
    constructor(options = {}, retryOptions = {retries: 3, delay: 1000}) {
        this.transporter = nodemailer.createTransport({
            ...options,
            pool: true, // Enable connection pooling for better performance
        });
        this.retryOptions = retryOptions;
    }

    static loadSmtpOptions(certPath, keyPath, caPath) {
        try {
            const options = {};
            if (certPath) options.tls = {cert: fs.readFileSync(certPath)};
            if (keyPath) options.tls.key = fs.readFileSync(keyPath);
            if (caPath) options.tls.ca = fs.readFileSync(caPath);
            return options;
        } catch (error) {
            throw new Error(`Error loading SMTP certificates: ${error.message}`);
        }
    }

    async sendMail(mailOptions) {
        return this._retryOperation(async () => {
            try {
                const info = await this.transporter.sendMail(mailOptions);
                console.log(`Email sent: ${info.response}`);
                return info;
            } catch (err) {
                if (this._isFatalError(err)) {
                    throw new Error(`Fatal SMTP error: ${err.message}`);
                }
                throw new Error(`SMTP send mail error: ${err.message}`);
            }
        });
    }

    _isFatalError(error) {
        const fatalErrors = ['EAUTH', 'ECONNREFUSED', 'ECONNRESET'];
        return fatalErrors.includes(error.code);
    }

    async _retryOperation(operation, ...args) {
        for (let i = 0; i < this.retryOptions.retries; i++) {
            try {
                return await operation(...args);
            } catch (err) {
                if (this._isFatalError(err) || i === this.retryOptions.retries - 1) {
                    console.error(`Operation failed: ${err.message}`);
                    throw err;
                }
                console.log(`Retrying operation (${i + 1}/${this.retryOptions.retries})...`);
                await this._delay(this.retryOptions.delay);
            }
        }
    }

    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    verifyConnection() {
        return new Promise((resolve, reject) => {
            this.transporter.verify((error, success) => {
                if (error) {
                    reject(new Error(`SMTP connection error: ${error.message}`));
                } else {
                    console.log('SMTP server is ready to take messages');
                    resolve(success);
                }
            });
        });
    }
}

module.exports = SmtpClient;
