/**
 * Description:
 * The `ImapClient` class provides functionality for interacting with an IMAP server. It supports connecting to an IMAP server, opening mailboxes, searching for emails, fetching emails with optional attachment handling, moving and deleting emails, and retrying operations when errors occur. The class uses the `imap` module for connecting to the server and `mailparser` for parsing email content.
 *
 * Purpose of the File:
 * - Establish and manage connections to an IMAP server.
 * - Perform operations on mailboxes, such as opening, searching, and fetching emails.
 * - Handle email attachments by saving them to the local filesystem.
 * - Implement retry logic for operations to handle transient errors.
 * - Provide a utility to load IMAP options from certificate files for secure connections.
 */

const Imap = require('imap');
const {simpleParser} = require('mailparser');
const fs = require('fs');

class ImapClient {
    constructor(options = {}, retryOptions = {retries: 3, delay: 1000, timeout: 30000}) {
        this.imap = new Imap({
            ...options,
            socketTimeout: retryOptions.timeout,
            connTimeout: retryOptions.timeout,
            keepalive: true,
        });
        this.retryOptions = retryOptions;
    }

    static loadImapOptions(certPath, keyPath, caPath) {
        try {
            const options = {};
            if (certPath) options.tls = {cert: fs.readFileSync(certPath)};
            if (keyPath) options.tls.key = fs.readFileSync(keyPath);
            if (caPath) options.tls.ca = fs.readFileSync(caPath);
            return options;
        } catch (error) {
            throw new Error(`Error loading IMAP certificates: ${error.message}`);
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', () => {
                console.log('IMAP connection established.');
                resolve();
            });

            this.imap.once('error', (err) => {
                reject(new Error(`IMAP connection error: ${err.message}`));
            });

            this.imap.connect();
        });
    }

    async disconnect() {
        return new Promise((resolve) => {
            this.imap.once('end', () => {
                console.log('IMAP connection closed.');
                resolve();
            });
            this.imap.end();
        });
    }

    async _retryOperation(operation, ...args) {
        for (let i = 0; i < this.retryOptions.retries; i++) {
            try {
                return await operation(...args);
            } catch (err) {
                if (this._isFatalError(err) || i === this.retryOptions.retries - 1) throw err;
                console.log(`Retrying operation (${i + 1}/${this.retryOptions.retries})...`);
                await this._delay(this.retryOptions.delay);
            }
        }
    }

    _isFatalError(error) {
        const fatalErrors = ['AUTH', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'];
        return fatalErrors.some(code => error.message.includes(code));
    }

    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async openMailbox(mailbox = 'INBOX') {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.imap.openBox(mailbox, true, (err, box) => {
                    if (err) {
                        reject(new Error(`IMAP open mailbox error: ${err.message}`));
                    } else {
                        console.log(`Mailbox opened: ${mailbox}`);
                        resolve(box);
                    }
                });
            });
        });
    }

    async search(criteria) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.imap.search(criteria, (err, results) => {
                    if (err) {
                        reject(new Error(`IMAP search error: ${err.message}`));
                    } else {
                        console.log(`Search results: ${results.length} messages found`);
                        resolve(results);
                    }
                });
            });
        });
    }

    async fetchEmails(uids, includeAttachments = false, attachmentsDir = './attachments') {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                const fetch = this.imap.fetch(uids, {bodies: '', struct: true});
                const emails = [];

                fetch.on('message', (msg) => {
                    let attachments = [];

                    msg.on('body', (stream) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (err) {
                                reject(new Error(`IMAP email parsing error: ${err.message}`));
                            } else {
                                if (includeAttachments && parsed.attachments.length > 0) {
                                    attachments = await this._saveAttachments(parsed.attachments, attachmentsDir);
                                }
                                emails.push({...parsed, attachments});
                            }
                        });
                    });
                });

                fetch.once('error', (err) => {
                    reject(new Error(`IMAP fetch error: ${err.message}`));
                });

                fetch.once('end', () => {
                    console.log(`Fetched ${emails.length} emails`);
                    resolve(emails);
                });
            });
        });
    }

    async _saveAttachments(attachments, dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }

        const savedFiles = [];

        for (const attachment of attachments) {
            const filePath = `${dir}/${attachment.filename}`;
            fs.writeFileSync(filePath, attachment.content);
            savedFiles.push(filePath);
            console.log(`Attachment saved: ${filePath}`);
        }

        return savedFiles;
    }

    async moveEmail(uids, mailbox) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.imap.move(uids, mailbox, (err) => {
                    if (err) {
                        reject(new Error(`IMAP move email error: ${err.message}`));
                    } else {
                        console.log(`Emails moved to ${mailbox}`);
                        resolve();
                    }
                });
            });
        });
    }

    async deleteEmail(uids) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.imap.addFlags(uids, '\\Deleted', (err) => {
                    if (err) {
                        reject(new Error(`IMAP delete email error: ${err.message}`));
                    } else {
                        this.imap.expunge(uids, (expungeErr) => {
                            if (expungeErr) {
                                reject(new Error(`IMAP expunge error: ${expungeErr.message}`));
                            } else {
                                console.log(`Emails deleted: ${uids}`);
                                resolve();
                            }
                        });
                    }
                });
            });
        });
    }
}

module.exports = ImapClient;
