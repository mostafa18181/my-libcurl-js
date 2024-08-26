const HttpsClient = require('../../core/http');
const tls = require('tls');
const fs = require('fs');
const autocannon = require('autocannon'); // اضافه کردن Autocannon

// Load SSL certificates
const sslOptions = HttpsClient.loadCerts(
    '/home/mostafa/Downloads/example/my-libcurl-js/file/cert.pem',  // مسیر به فایل گواهی
    '/home/mostafa/Downloads/example/my-libcurl-js/file/key.pem',   // مسیر به فایل کلید خصوصی
    '/home/mostafa/Downloads/example/my-libcurl-js/file/ca.pem',    // مسیر به فایل گواهی CA
);

const options = {
    hostname: 'example.com',
    port: 443,
    path: '/',
    method: 'GET',
    ...sslOptions // اطمینان از اینکه sslOptions اینجا اعمال می‌شود
};

describe('Performance Tests', () => {
    let server;

    beforeAll((done) => {
        const http = require('http');

        server = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World');
        }).listen(4000, done);
    }, 40000);

    afterAll((done) => {
        if (server) {
            server.close(done);
        }
    });

    test('should handle load test', (done) => {
        const autocannonOptions = {
            url: 'http://localhost:4000',
            connections: 10, // تعداد اتصالات همزمان
            duration: 10, // مدت زمان تست در ثانیه
            amount: 1000 // تعداد درخواست‌ها
        };

        autocannon(autocannonOptions, (error, result) => {
            if (error) {
                done(error);
            } else {
                console.log('Autocannon result:', result);
                expect(result.duration).toBeLessThan(10000);
                done();
            }
        });
    }, 50000); // افزایش زمان timeout برای تست به 50 ثانیه
});
