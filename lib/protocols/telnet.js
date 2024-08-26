// const Telnet = require('telnet-client');
// const EventEmitter = require('events');
//
// class TelnetClient extends EventEmitter {
//     constructor(options = {}) {
//         super();
//         this.connection = new Telnet();
//         this.options = {
//             host: options.host || 'localhost',
//             port: options.port || 23,
//             timeout: options.timeout || 1500,
//             passwordPromptTimeout: options.passwordPromptTimeout || 1000,
//             ...options,
//         };
//         this.isConnected = false;
//     }
//
//     async connect() {
//         try {
//             await this.connection.connect(this.options);
//             this.isConnected = true;
//             console.log('Telnet connection established.');
//             this.emit('connected');
//         } catch (error) {
//             console.error('Telnet connection error:', error.message);
//             this.emit('error', error);
//         }
//     }
//
//     async sendCommand(command, options = {waitFor: '>'}) {
//         if (!this.isConnected) {
//             throw new Error('TelnetClient: Not connected to any server.');
//         }
//
//         try {
//             const response = await this.connection.exec(command, options);
//             console.log(`Command executed: ${command}`);
//             this.emit('commandExecuted', command, response);
//             return response;
//         } catch (error) {
//             console.error(`Telnet command error: ${command} - ${error.message}`);
//             this.emit('error', error);
//             throw error;
//         }
//     }
//
//     async sendMultipleCommands(commands = [], options = {waitFor: '>'}) {
//         const results = [];
//         for (let command of commands) {
//             const result = await this.sendCommand(command, options);
//             results.push(result);
//         }
//         return results;
//     }
//
//     async close() {
//         if (this.isConnected) {
//             await this.connection.end();
//             this.isConnected = false;
//             console.log('Telnet connection closed.');
//             this.emit('disconnected');
//         }
//     }
//
//     async reconnect() {
//         console.log('Reconnecting Telnet...');
//         await this.close();
//         await this.connect();
//     }
//
//     setOptions(newOptions) {
//         this.options = {...this.options, ...newOptions};
//         console.log('Telnet options updated.');
//         if (this.isConnected) {
//             this.reconnect();
//         }
//     }
// }
//
// module.exports = TelnetClient;
