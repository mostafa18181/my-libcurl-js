const http = require('http');
const autocannon = require('autocannon'); // اضافه کردن Autocannon

describe('Performance Tests', () => {
    let server;

    beforeAll((done) => {
        server = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World');
        }).listen(4000, done);
    }, 10000); // افزایش زمان timeout به 10 ثانیه

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
    }, 10000); // افزایش زمان timeout برای تست به 10 ثانیه
});
