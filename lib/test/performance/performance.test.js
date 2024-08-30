const http = require('http');
const autocannon = require('autocannon'); // Load Autocannon for load testing

describe('Performance Tests', () => {
    let server;

    // Setup server before running tests
    beforeAll((done) => {
        server = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World');
        }).listen(4000, done);
    }, 10000); // Allow 10 seconds for server setup

    // Teardown server after tests
    afterAll((done) => {
        if (server) {
            server.close(done);
        }
    });

    // Test for server performance under load
    test('should handle load test', (done) => {
        const autocannonOptions = {
            url: 'http://localhost:4000',
            connections: 10, // Number of simultaneous connections
            duration: 10, // Duration of the test in seconds
            amount: 1000 // Total number of requests
        };

        autocannon(autocannonOptions, (error, result) => {
            if (error) {
                done(error);
            } else {
                console.log('Autocannon result:', result);
                expect(result.duration).toBeLessThan(10000); // Check that test duration is under 10 seconds
                done();
            }
        });
    }, 10000); // Set test timeout to 10 seconds
});
