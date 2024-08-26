// ftp.js content
const ftp = require('ftp');
const fs = require('fs');
const path = require('path');

class FtpClient {
    constructor(options = {}) {
        this.client = new ftp();
        this.options = {...options, passive: true}; // default to passive mode
        this.connected = false;
        this.retryCount = 3;
        this.retries = 0;
    }

    static loadFTPSOptions(certPath, keyPath, caPath) {
        try {
            const options = {
                secure: true,
                secureOptions: {}
            };
            if (certPath) options.secureOptions.cert = fs.readFileSync(certPath);
            if (keyPath) options.secureOptions.key = fs.readFileSync(keyPath);
            if (caPath) options.secureOptions.ca = fs.readFileSync(caPath);
            return options;
        } catch (error) {
            throw new Error(`Error loading FTPS certificates: ${error.message}`);
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.connected) return resolve(); // reuse connection if already connected

            this.client.on('ready', () => {
                this.connected = true;
                console.log('FTP connection established.');
                resolve();
            });

            this.client.on('error', (err) => {
                this.connected = false;
                reject(new Error(`FTP connection error: ${err.message}`));
            });

            this.client.connect(this.options);
        });
    }

    disconnect() {
        if (this.connected) {
            this.client.end();
            this.connected = false;
            console.log('FTP connection closed.');
        }
    }

    _retryOperation(operation, ...args) {
        return operation(...args).catch((err) => {
            if (this.retries < this.retryCount) {
                this.retries++;
                console.log(`Retrying operation (${this.retries}/${this.retryCount})...`);
                return this._retryOperation(operation, ...args);
            } else {
                throw err;
            }
        });
    }

    upload(localFilePath, remoteFilePath) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.put(localFilePath, remoteFilePath, (err) => {
                    if (err) {
                        reject(new Error(`FTP upload error: ${err.message}`));
                    } else {
                        console.log(`File uploaded to ${remoteFilePath}`);
                        resolve(`File uploaded to ${remoteFilePath}`);
                    }
                });
            });
        });
    }

    download(remoteFilePath, localFilePath) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.get(remoteFilePath, (err, stream) => {
                    if (err) {
                        reject(new Error(`FTP download error: ${err.message}`));
                    } else {
                        stream.once('close', () => this.client.end());
                        stream.pipe(fs.createWriteStream(localFilePath));
                        stream.on('end', () => {
                            console.log(`File downloaded to ${localFilePath}`);
                            resolve(`File downloaded to ${localFilePath}`);
                        });
                        stream.on('error', (err) => reject(new Error(`Stream error: ${err.message}`)));
                    }
                });
            });
        });
    }

    list(directory = '.') {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.list(directory, (err, list) => {
                    if (err) {
                        reject(new Error(`FTP list error: ${err.message}`));
                    } else {
                        console.log(`Directory listing for ${directory}`);
                        resolve(list);
                    }
                });
            });
        });
    }

    createDirectory(directory) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.mkdir(directory, true, (err) => {
                    if (err) {
                        reject(new Error(`FTP create directory error: ${err.message}`));
                    } else {
                        console.log(`Directory created: ${directory}`);
                        resolve(`Directory created: ${directory}`);
                    }
                });
            });
        });
    }

    deleteFile(remoteFilePath) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.delete(remoteFilePath, (err) => {
                    if (err) {
                        reject(new Error(`FTP delete file error: ${err.message}`));
                    } else {
                        console.log(`File deleted: ${remoteFilePath}`);
                        resolve(`File deleted: ${remoteFilePath}`);
                    }
                });
            });
        });
    }

    deleteDirectory(directory) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.rmdir(directory, true, (err) => {
                    if (err) {
                        reject(new Error(`FTP delete directory error: ${err.message}`));
                    } else {
                        console.log(`Directory deleted: ${directory}`);
                        resolve(`Directory deleted: ${directory}`);
                    }
                });
            });
        });
    }

    rename(oldPath, newPath) {
        return this._retryOperation(() => {
            return new Promise((resolve, reject) => {
                this.client.rename(oldPath, newPath, (err) => {
                    if (err) {
                        reject(new Error(`FTP rename error: ${err.message}`));
                    } else {
                        console.log(`Renamed ${oldPath} to ${newPath}`);
                        resolve(`Renamed ${oldPath} to ${newPath}`);
                    }
                });
            });
        });
    }
}

module.exports = FtpClient;
