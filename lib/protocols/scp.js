// scp.js content
const {Client} = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ScpClient {
    constructor(options = {}, retryOptions = {retries: 3, delay: 1000}) {
        this.client = new Client();
        this.options = options;
        this.connected = false;
        this.retryOptions = retryOptions;
    }

    static loadSCPOptions(privateKeyPath, passphrase = '') {
        try {
            const options = {};
            if (privateKeyPath) {
                options.privateKey = fs.readFileSync(privateKeyPath);
                if (passphrase) options.passphrase = passphrase;
            }
            return options;
        } catch (error) {
            throw new Error(`Error loading SCP private key: ${error.message}`);
        }
    }

    async connect() {
        if (this.connected) return;

        return new Promise((resolve, reject) => {
            this.client
                .on('ready', () => {
                    this.connected = true;
                    console.log('SCP connection established.');
                    resolve();
                })
                .on('error', (err) => {
                    reject(new Error(`SCP connection error: ${err.message}`));
                })
                .connect(this.options);
        });
    }

    async disconnect() {
        if (this.connected) {
            this.client.end();
            this.connected = false;
            console.log('SCP connection closed.');
        }
    }

    async _retryOperation(operation, ...args) {
        for (let i = 0; i < this.retryOptions.retries; i++) {
            try {
                return await operation(...args);
            } catch (err) {
                if (i === this.retryOptions.retries - 1) throw err;
                console.log(`Retrying operation (${i + 1}/${this.retryOptions.retries})...`);
                await this._delay(this.retryOptions.delay);
            }
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async upload(localFilePath, remoteFilePath) {
        return this._retryOperation(async () => {
            return new Promise((resolve, reject) => {
                this.client.sftp((err, sftp) => {
                    if (err) {
                        reject(new Error(`SCP upload error: ${err.message}`));
                    } else {
                        sftp.fastPut(localFilePath, remoteFilePath, (err) => {
                            if (err) {
                                reject(new Error(`SCP upload error: ${err.message}`));
                            } else {
                                console.log(`File uploaded to ${remoteFilePath}`);
                                resolve(`File uploaded to ${remoteFilePath}`);
                            }
                        });
                    }
                });
            });
        });
    }

    async download(remoteFilePath, localFilePath) {
        return this._retryOperation(async () => {
            return new Promise((resolve, reject) => {
                this.client.sftp((err, sftp) => {
                    if (err) {
                        reject(new Error(`SCP download error: ${err.message}`));
                    } else {
                        sftp.fastGet(remoteFilePath, localFilePath, (err) => {
                            if (err) {
                                reject(new Error(`SCP download error: ${err.message}`));
                            } else {
                                console.log(`File downloaded to ${localFilePath}`);
                                resolve(`File downloaded to ${localFilePath}`);
                            }
                        });
                    }
                });
            });
        });
    }

    async uploadDirectory(localDir, remoteDir) {
        const files = fs.readdirSync(localDir);

        for (const file of files) {
            const localFilePath = path.join(localDir, file);
            const remoteFilePath = path.join(remoteDir, file).replace(/\\/g, '/');

            if (fs.statSync(localFilePath).isDirectory()) {
                await this.execCommand(`mkdir -p ${remoteFilePath}`);
                await this.uploadDirectory(localFilePath, remoteFilePath);
            } else {
                await this.upload(localFilePath, remoteFilePath);
            }
        }
    }

    async downloadDirectory(remoteDir, localDir) {
        const list = await this.listRemoteDir(remoteDir);

        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, {recursive: true});
        }

        for (const file of list) {
            const remoteFilePath = path.join(remoteDir, file.filename).replace(/\\/g, '/');
            const localFilePath = path.join(localDir, file.filename);

            if (file.longname.startsWith('d')) {
                await this.downloadDirectory(remoteFilePath, localFilePath);
            } else {
                await this.download(remoteFilePath, localFilePath);
            }
        }
    }

    execCommand(command) {
        return new Promise((resolve, reject) => {
            this.client.exec(command, (err, stream) => {
                if (err) reject(new Error(`SCP exec command error: ${err.message}`));

                stream
                    .on('close', (code, signal) => {
                        if (code === 0) {
                            resolve(`Command executed: ${command}`);
                        } else {
                            reject(new Error(`Command execution failed with code ${code} and signal ${signal}`));
                        }
                    })
                    .on('data', (data) => console.log(`STDOUT: ${data}`))
                    .stderr.on('data', (data) => console.log(`STDERR: ${data}`));
            });
        });
    }

    listRemoteDir(remoteDir) {
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) {
                    reject(new Error(`SCP list remote directory error: ${err.message}`));
                } else {
                    sftp.readdir(remoteDir, (err, list) => {
                        if (err) {
                            reject(new Error(`SCP list remote directory error: ${err.message}`));
                        } else {
                            resolve(list);
                        }
                    });
                }
            });
        });
    }
}

module.exports = ScpClient;
