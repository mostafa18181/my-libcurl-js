const fs = require('fs');
const {pipeline, Readable, Writable, Transform} = require('stream');
const {promisify} = require('util');
const http = require('http');
const https = require('https');

const pipe = promisify(pipeline);

class StreamManager {
    constructor() {
        this.pipeline = promisify(pipeline);
    }

    createReadStream(filePath, options = {}) {
        try {
            const readStream = fs.createReadStream(filePath, options);
            console.log(`Read stream created for file: ${filePath}`);
            return readStream;
        } catch (err) {
            console.error(`Error creating read stream: ${err.message}`);
            throw err;
        }
    }

    createWriteStream(filePath, options = {}) {
        try {
            const writeStream = fs.createWriteStream(filePath, options);
            console.log(`Write stream created for file: ${filePath}`);
            return writeStream;
        } catch (err) {
            console.error(`Error creating write stream: ${err.message}`);
            throw err;
        }
    }

    createTransformStream(transformFn) {
        try {
            const transformStream = new Transform({
                async transform(chunk, encoding, callback) {
                    try {
                        const transformedChunk = await transformFn(chunk, encoding);
                        callback(null, transformedChunk);
                    } catch (err) {
                        callback(err);
                    }
                },
            });
            console.log(`Transform stream created`);
            return transformStream;
        } catch (err) {
            console.error(`Error creating transform stream: ${err.message}`);
            throw err;
        }
    }

    async pipeStreams(streams) {
        try {
            await this.pipeline(...streams);
            console.log(`Streams piped successfully`);
        } catch (err) {
            streams.forEach(stream => stream.destroy());  // Close streams on error
            console.error(`Error piping streams: ${err.message}`);
            throw err;
        }
    }

    createReadableStreamFromData(data) {
        try {
            const readableStream = new Readable({
                read() {
                    this.push(data);
                    this.push(null);
                },
            });
            console.log(`Readable stream created from data`);
            return readableStream;
        } catch (err) {
            console.error(`Error creating readable stream from data: ${err.message}`);
            throw err;
        }
    }

    async copyFile(source, destination) {
        try {
            const readStream = this.createReadStream(source);
            const writeStream = this.createWriteStream(destination);

            // Handle backpressure
            readStream.on('data', (chunk) => {
                const canWrite = writeStream.write(chunk);
                if (!canWrite) {
                    readStream.pause();
                    writeStream.once('drain', () => readStream.resume());
                }
            });

            readStream.on('end', () => {
                writeStream.end();
                console.log(`File copied from ${source} to ${destination}`);
            });

            readStream.on('error', (err) => {
                console.error(`Error copying file: ${err.message}`);
                throw err;
            });

            writeStream.on('error', (err) => {
                console.error(`Error writing file: ${err.message}`);
                throw err;
            });
        } catch (err) {
            throw err;
        }
    }

    async transformFile(source, destination, transformFn) {
        try {
            const readStream = this.createReadStream(source);
            const writeStream = this.createWriteStream(destination);
            const transformStream = this.createTransformStream(transformFn);

            await this.pipeStreams([readStream, transformStream, writeStream]);
            console.log(`File transformed from ${source} to ${destination}`);
        } catch (err) {
            console.error(`Error transforming file: ${err.message}`);
            throw err;
        }
    }

    async readFileAsString(filePath) {
        try {
            const readStream = this.createReadStream(filePath);
            const chunks = [];
            for await (const chunk of readStream) {
                chunks.push(chunk);
            }
            const fileContent = Buffer.concat(chunks).toString();
            console.log(`File read as string from ${filePath}`);
            return fileContent;
        } catch (err) {
            console.error(`Error reading file as string: ${err.message}`);
            throw err;
        }
    }

    async writeStringToFile(filePath, data) {
        try {
            const readableStream = this.createReadableStreamFromData(data);
            const writeStream = this.createWriteStream(filePath);

            await this.pipeStreams([readableStream, writeStream]);
            console.log(`String written to file: ${filePath}`);
        } catch (err) {
            console.error(`Error writing string to file: ${err.message}`);
            throw err;
        }
    }

    async downloadFile(url, dest, start = 0) {
        const protocol = url.startsWith('https') ? https : http;
        const options = new URL(url);
        options.headers = {
            Range: `bytes=${start}-`
        };

        return new Promise((resolve, reject) => {
            const req = protocol.get(options, (res) => {
                if (![200, 206].includes(res.statusCode)) {
                    return reject(new Error(`Unexpected status code: ${res.statusCode}`));
                }

                const fileStream = fs.createWriteStream(dest, {flags: 'a'});

                // Handle backpressure
                res.on('data', (chunk) => {
                    const canWrite = fileStream.write(chunk);
                    if (!canWrite) {
                        res.pause();
                        fileStream.once('drain', () => res.resume());
                    }
                });

                res.on('end', () => {
                    fileStream.end();
                    console.log(`File downloaded to ${dest}`);
                    resolve();
                });

                res.on('error', (err) => {
                    reject(err);
                });
            });

            req.on('error', (err) => {
                reject(err);
            });
        });
    }
}

module.exports = StreamManager;
