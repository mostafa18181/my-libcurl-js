// sftp.js content
const Client = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

class SftpClient {
    constructor(options = {}) {
        this.client = new Client();
        this.options = options;
        this.connected = false;
        this.retryCount = 3;
        this.retries = 0;
        this.idleTimeout = 60000; // 1 minute idle timeout
    }

    static loadSFTPOptions(privateKeyPath, passphrase = '') {
        try {
            const options = {};
            if (privateKeyPath) {
                options.privateKey = fs.readFileSync(privateKeyPath);
                if (passphrase) options.passphrase = passphrase;
            }
            return options;
        } catch (error) {
            throw new Error(`Error loading SFTP private key: ${error.message}`);
        }
    }

    async connect() {
        if (this.connected) return;

        try {
            await this.client.connect(this.options);
            this.connected = true;
            console.log('SFTP connection established.');
            this._setupIdleTimeout();
        } catch (err) {
            this.connected = false;
            throw new Error(`SFTP connection error: ${err.message}`);
        }
    }

    _setupIdleTimeout() {
        if (this.idleTimeoutHandle) clearTimeout(this.idleTimeoutHandle);
        this.idleTimeoutHandle = setTimeout(() => {
            this.disconnect();
        }, this.idleTimeout);
    }

    async disconnect() {
        if (this.connected) {
            await this.client.end();
            this.connected = false;
            console.log('SFTP connection closed.');
        }
    }

    async _retryOperation(operation, ...args) {
        while (this.retries < this.retryCount) {
            try {
                this._setupIdleTimeout();
                return await operation(...args);
            } catch (err) {
                if (!this._isRecoverableError(err)) throw err;
                this.retries++;
                console.log(`Retrying operation (${this.retries}/${this.retryCount})...`);
                if (this.retries >= this.retryCount) {
                    throw new Error(`Operation failed after ${this.retryCount} retries: ${err.message}`);
                }
            }
        }
    }

    _isRecoverableError(error) {
        const recoverableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED'];
        return recoverableErrors.includes(error.code);
    }

    async upload(localFilePath, remoteFilePath) {
        return this._retryOperation(async () => {
            try {
                await this.client.fastPut(localFilePath, remoteFilePath);
                console.log(`File uploaded to ${remoteFilePath}`);
                return `File uploaded to ${remoteFilePath}`;
            } catch (err) {
                throw new Error(`SFTP upload error: ${err.message}`);
            }
        });
    }

    async download(remoteFilePath, localFilePath) {
        return this._retryOperation(async () => {
            try {
                await this.client.fastGet(remoteFilePath, localFilePath);
                console.log(`File downloaded to ${localFilePath}`);
                return `File downloaded to ${localFilePath}`;
            } catch (err) {
                throw new Error(`SFTP download error: ${err.message}`);
            }
        });
    }

    async list(directory = '.') {
        return this._retryOperation(async () => {
            try {
                const list = await this.client.list(directory);
                console.log(`Directory listing for ${directory}`);
                return list;
            } catch (err) {
                throw new Error(`SFTP list error: ${err.message}`);
            }
        });
    }

    async createDirectory(directory) {
        return this._retryOperation(async () => {
            try {
                await this.client.mkdir(directory, true);
                console.log(`Directory created: ${directory}`);
                return `Directory created: ${directory}`;
            } catch (err) {
                throw new Error(`SFTP create directory error: ${err.message}`);
            }
        });
    }

    async deleteFile(remoteFilePath) {
        return this._retryOperation(async () => {
            try {
                await this.client.delete(remoteFilePath);
                console.log(`File deleted: ${remoteFilePath}`);
                return `File deleted: ${remoteFilePath}`;
            } catch (err) {
                throw new Error(`SFTP delete file error: ${err.message}`);
            }
        });
    }

    async deleteDirectory(directory) {
        return this._retryOperation(async () => {
            try {
                await this.client.rmdir(directory, true);
                console.log(`Directory deleted: ${directory}`);
                return `Directory deleted: ${directory}`;
            } catch (err) {
                throw new Error(`SFTP delete directory error: ${err.message}`);
            }
        });
    }

    async rename(oldPath, newPath) {
        return this._retryOperation(async () => {
            try {
                await this.client.rename(oldPath, newPath);
                console.log(`Renamed ${oldPath} to ${newPath}`);
                return `Renamed ${oldPath} to ${newPath}`;
            } catch (err) {
                throw new Error(`SFTP rename error: ${err.message}`);
            }
        });
    }

    async uploadDirectory(localDir, remoteDir) {
        return this._retryOperation(async () => {
            try {
                await this.client.uploadDir(localDir, remoteDir, {
                    concurrency: 5 // Allow parallel processing for faster uploads
                });
                console.log(`Directory uploaded from ${localDir} to ${remoteDir}`);
                return `Directory uploaded to ${remoteDir}`;
            } catch (err) {
                throw new Error(`SFTP upload directory error: ${err.message}`);
            }
        });
    }

    async downloadDirectory(remoteDir, localDir) {
        return this._retryOperation(async () => {
            try {
                await this.client.downloadDir(remoteDir, localDir, {
                    concurrency: 5 // Allow parallel processing for faster downloads
                });
                console.log(`Directory downloaded from ${remoteDir} to ${localDir}`);
                return `Directory downloaded to ${localDir}`;
            } catch (err) {
                throw new Error(`SFTP download directory error: ${err.message}`);
            }
        });
    }
}

module.exports = SftpClient;
