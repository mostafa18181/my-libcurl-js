const tls = require('tls');
const fs = require('fs');
const net = require('net');
const assert = require('assert');

describe('Security Tests', () => {
    test('test SSL Configuration', async () => {
        const options = {
            host: 'localhost',
            port: 443,
            // این مسیر باید به مسیر واقعی فایل گواهی‌نامه تغییر کند
            ca: fs.readFileSync('/home/mostafa/Downloads/example/my-libcurl-js/file/cert.pem'),
            rejectUnauthorized: true,
        };

        const socket = tls.connect(options, () => {
            const cipher = socket.getCipher();
            expect(cipher.name).toBe('TLS_AES_256_GCM_SHA384');
            const protocol = socket.getProtocol();
            expect(protocol).toBe('TLSv1.3');
            socket.end();
        });

        socket.on('error', (err) => {
            throw new Error('Error during SSL/TLS connection: ' + err.message);
        });
    });

    test('test ACL', async () => {
        const allowedIp = '127.0.0.1';
        const disallowedIp = '192.168.1.100';

        const server = net.createServer((socket) => {
            const clientIp = socket.remoteAddress;
            if (clientIp === allowedIp) {
                socket.write('Access granted');
            } else {
                socket.write('Access denied');
                socket.destroy();
            }
        });

        server.listen(8080, '0.0.0.0');

        const allowedClient = net.connect({host: '127.0.0.1', port: 8080}, () => {
            allowedClient.on('data', (data) => {
                expect(data.toString()).toBe('Access granted');
                allowedClient.end();
            });
        });

        const disallowedClient = net.connect({host: disallowedIp, port: 8080}, () => {
            disallowedClient.on('data', (data) => {
                expect(data.toString()).toBe('Access denied');
                disallowedClient.end();
            });
        });

        setTimeout(() => {
            server.close();
        }, 3000);
    });
});
