/**
 * Description:
 * The `ConnectionManager` class manages TCP and TLS connections with built-in load balancing, encryption, and event-driven
 * communication. It allows for creating multiple connections, handling data transmission, and managing connection lifecycles.
 * The class supports encryption of data using AES-256-CBC, maintains a queue for managing concurrent connections,
 * and provides mechanisms for both synchronous and asynchronous operations.
 *
 * Purpose of the File:
 * - Create and manage TCP and TLS connections.
 * - Support load balancing across multiple servers using a round-robin algorithm.
 * - Encrypt and decrypt data sent and received through connections.
 * - Handle connection errors, timeouts, and keep-alive settings.
 * - Queue and manage multiple concurrent connections.
 * - Provide event-driven feedback for connection states, such as connected, error, timeout, and closed.
 */

const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const EventEmitter = require('events');

class ConnectionManager extends EventEmitter {
    constructor(maxConcurrentConnections = 10) {
        super();
        this.connections = new Map();
        this.maxConcurrentConnections = maxConcurrentConnections;
        this.queue = [];
        this.runningConnections = 0;
        this.keepAliveTimeout = 60000; // 1 minute Keep-Alive timeout
        this.servers = []; // Servers for load balancing
    }

    _encryptData(data, key) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    _decryptData(encryptedData, key) {
        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    addServer(host, port) {
        this.servers.push({host, port});
    }

    _getNextServer() {
        if (this.servers.length === 0) {
            throw new Error('No servers available for load balancing');
        }
        // Simple round-robin load balancing
        const server = this.servers.shift();
        this.servers.push(server);
        return server;
    }

    _createConnection(name, host, port, timeout, retries, delay, useTls = false) {
        return new Promise((resolve, reject) => {
            const socket = useTls ? tls.connect({host, port}) : net.connect(port, host);

            socket.setTimeout(timeout);

            socket.once('connect', () => {
                console.log(`Connection established: ${name}`);
                this.connections.set(name, socket);
                this.runningConnections++;
                this.emit('connected', name);
                resolve(socket);
            });

            socket.on('timeout', () => {
                console.log(`Connection timed out: ${name}`);
                socket.destroy();
                this.connections.delete(name);
                this.runningConnections--;
                this.emit('timeout', name);
                reject(new Error('Connection timed out'));
                this._processQueue();
            });

            socket.on('error', (err) => {
                console.error(`Connection error: ${name} - ${err.message}`);
                this.connections.delete(name);
                this.runningConnections--;
                this.emit('error', name, err);
                reject(err);
                this._processQueue();
            });

            socket.on('close', () => {
                console.log(`Connection closed: ${name}`);
                this.connections.delete(name);
                this.runningConnections--;
                this.emit('closed', name);
                this._processQueue();
            });

            socket.setKeepAlive(true, this.keepAliveTimeout);
        });
    }

    async createTcpConnection(name, host, port, timeout = 10000, retries = 3, delay = 1000) {
        const connectFn = () => this._createConnection(name, host, port, timeout, retries, delay);
        return this._enqueueConnection(connectFn);
    }

    async createTlsConnection(name, host, port, timeout = 10000, retries = 3, delay = 1000) {
        const connectFn = () => this._createConnection(name, host, port, timeout, retries, delay, true);
        return this._enqueueConnection(connectFn);
    }

    _enqueueConnection(connectFn) {
        if (this.runningConnections >= this.maxConcurrentConnections) {
            return new Promise((resolve, reject) => {
                this.queue.push(() => connectFn().then(resolve).catch(reject));
            });
        }
        return connectFn();
    }

    _processQueue() {
        if (this.queue.length > 0 && this.runningConnections < this.maxConcurrentConnections) {
            const nextConnectFn = this.queue.shift();
            nextConnectFn();
        }
    }

    async createLoadBalancedConnection(name, timeout = 10000, retries = 3, delay = 1000) {
        const {host, port} = this._getNextServer();
        return this.createTcpConnection(name, host, port, timeout, retries, delay);
    }

    async sendData(name, data, encryptionKey = null) {
        const socket = this.connections.get(name);
        if (!socket) {
            throw new Error(`No connection found with name: ${name}`);
        }

        let dataToSend = data;
        if (encryptionKey) {
            dataToSend = this._encryptData(data, encryptionKey);
        }

        return new Promise((resolve, reject) => {
            socket.write(dataToSend, (err) => {
                if (err) {
                    console.error(`Error sending data on connection: ${name} - ${err.message}`);
                    this.emit('error', name, err);
                    reject(err);
                } else {
                    console.log(`Data sent on connection: ${name}`);
                    this.emit('dataSent', name, dataToSend);
                    resolve();
                }
            });
        });
    }

    async receiveData(name, encryptionKey = null) {
        const socket = this.connections.get(name);
        if (!socket) {
            throw new Error(`No connection found with name: ${name}`);
        }

        return new Promise((resolve, reject) => {
            socket.once('data', (data) => {
                let receivedData = data.toString();
                if (encryptionKey) {
                    try {
                        receivedData = this._decryptData(receivedData, encryptionKey);
                    } catch (err) {
                        console.error(`Error decrypting data on connection: ${name} - ${err.message}`);
                        this.emit('error', name, err);
                        return reject(err);
                    }
                }
                console.log(`Data received on connection: ${name}`);
                this.emit('dataReceived', name, receivedData);
                resolve(receivedData);
            });

            socket.once('error', (err) => {
                console.error(`Error receiving data on connection: ${name} - ${err.message}`);
                this.emit('error', name, err);
                reject(err);
            });
        });
    }

    closeConnection(name) {
        const socket = this.connections.get(name);
        if (!socket) {
            throw new Error(`No connection found with name: ${name}`);
        }

        socket.end(() => {
            console.log(`Connection closed: ${name}`);
            this.connections.delete(name);
            this.runningConnections--;
            this.emit('closed', name);
            this._processQueue();
        });
    }

    closeAllConnections() {
        this.connections.forEach((socket, name) => {
            socket.end(() => {
                console.log(`Connection closed: ${name}`);
                this.connections.delete(name);
                this.runningConnections--;
                this.emit('closed', name);
                this._processQueue();
            });
        });
    }

    listConnections() {
        return Array.from(this.connections.keys());
    }
}

module.exports = ConnectionManager;
