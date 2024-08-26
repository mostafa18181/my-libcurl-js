// const POP3Client = require('node-poplib');
// const fs = require('fs');
// const EventEmitter = require('events');
//
// class Pop3Client extends EventEmitter {
//     constructor(options = {}, retryOptions = {retries: 3, delay: 1000}) {
//         super();
//         this.options = {
//             hostname: options.hostname || 'localhost',
//             port: options.port || 110,
//             tls: options.tls || false,
//             ...options
//         };
//         this.retryOptions = retryOptions;
//         this.client = null;
//         this.connected = false;
//         this.messages = [];
//     }
//
//     async connect() {
//         if (this.connected) return;
//
//         return new Promise((resolve, reject) => {
//             this.client = new POP3Client(this.options.port, this.options.hostname, {
//                 tlserrs: false,
//                 enabletls: this.options.tls,
//                 user: this.options.username,
//                 password: this.options.password,
//                 debug: false
//             });
//
//             this.client.on('connect', () => {
//                 this.connected = true;
//                 console.log('POP3 connection established.');
//                 this.emit('connected');
//                 resolve();
//             });
//
//             this.client.on('error', (err) => {
//                 console.error(`POP3 connection error: ${err.message}`);
//                 this.emit('error', err);
//                 reject(err);
//             });
//
//             this.client.on('invalid-state', (cmd) => {
//                 console.error(`POP3 invalid state: ${cmd}`);
//                 this.emit('error', new Error(`Invalid state: ${cmd}`));
//             });
//
//             this.client.on('locked', (cmd) => {
//                 console.error(`POP3 command locked: ${cmd}`);
//                 this.emit('error', new Error(`Command locked: ${cmd}`));
//             });
//         });
//     }
//
//     async disconnect() {
//         if (!this.connected) return;
//
//         return new Promise((resolve) => {
//             this.client.quit((err) => {
//                 if (err) {
//                     console.error(`POP3 quit error: ${err.message}`);
//                 } else {
//                     this.connected = false;
//                     console.log('POP3 connection closed.');
//                 }
//                 this.emit('disconnected');
//                 resolve();
//             });
//         });
//     }
//
//     async _retryOperation(operation, ...args) {
//         for (let i = 0; i < this.retryOptions.retries; i++) {
//             try {
//                 return await operation(...args);
//             } catch (err) {
//                 if (i === this.retryOptions.retries - 1) throw err;
//                 console.log(`Retrying operation (${i + 1}/${this.retryOptions.retries})...`);
//                 await this._delay(this.retryOptions.delay);
//             }
//         }
//     }
//
//     _delay(ms) {
//         return new Promise((resolve) => setTimeout(resolve, ms));
//     }
//
//     async listMessages() {
//         return this._retryOperation(() => {
//             return new Promise((resolve, reject) => {
//                 this.client.list((err, msgcount, msgnumber, data) => {
//                     if (err) {
//                         reject(new Error(`POP3 list messages error: ${err.message}`));
//                     } else {
//                         this.messages = data.split('\r\n').map((msg) => {
//                             const [id, size] = msg.split(' ');
//                             return {id, size};
//                         });
//                         console.log(`Retrieved ${msgcount} messages`);
//                         resolve(this.messages);
//                     }
//                 });
//             });
//         });
//     }
//
//     async retrieveMessage(id) {
//         return this._retryOperation(() => {
//             return new Promise((resolve, reject) => {
//                 this.client.retr(id, (err, msgnumber, data) => {
//                     if (err) {
//                         reject(new Error(`POP3 retrieve message error: ${err.message}`));
//                     } else {
//                         console.log(`Message ${id} retrieved`);
//                         resolve(data);
//                     }
//                 });
//             });
//         });
//     }
//
//     async deleteMessage(id) {
//         return this._retryOperation(() => {
//             return new Promise((resolve, reject) => {
//                 this.client.dele(id, (err) => {
//                     if (err) {
//                         reject(new Error(`POP3 delete message error: ${err.message}`));
//                     } else {
//                         console.log(`Message ${id} deleted`);
//                         resolve(`Message ${id} deleted`);
//                     }
//                 });
//             });
//         });
//     }
//
//     async saveMessage(id, filepath) {
//         try {
//             const message = await this.retrieveMessage(id);
//             fs.writeFileSync(filepath, message);
//             console.log(`Message ${id} saved to ${filepath}`);
//             return filepath;
//         } catch (err) {
//             throw new Error(`Error saving message: ${err.message}`);
//         }
//     }
//
//     async markMessageAsRead(id) {
//         // POP3 doesn't support marking messages as read explicitly,
//         // but we can simulate it by saving it locally or flagging it somehow
//         console.log(`Message ${id} marked as read`);
//         return id;
//     }
// }
//
// module.exports = Pop3Client;
