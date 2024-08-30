require('dotenv').config(); // Load environment variables from .env file
const HttpsClient = require('../../core/http');
const fs = require('fs');
const autocannon = require('autocannon'); // Adding Autocannon

// Load SSL certificates using paths from environment variables with error handling
const sslOptions = HttpsClient.loadCerts(
    process.env.CERT_PATH || '',  // Path to the certificate file
    process.env.KEY_PATH || '',   // Path to the private key file
    process.env.CA_PATH || ''     // Path to the CA certificate file
);

// Validate SSL options
if (!sslOptions.cert || !sslOptions.key || !sslOptions.ca) {
    console.error('SSL certificates are not correctly configured. Please check your environment variables.');
    process.exit(1);
}

const options = {
    hostname: 'example.com',
    port: 443,
    path: '/',
    method: 'GET',
    ...sslOptions // Ensuring sslOptions are applied here
};

describe('Performance Tests', () => {
    let server;

    beforeAll((done) => {
        const http = require('http');

        server = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World');
        }).listen(4000, (err) => {
            if (err) {
                console.error('Error starting the server:', err.message);
                done(err);
            } else {
                console.log('Test server running on http://localhost:4000');
                done();
            }
        });
    }, 40000); // Increased timeout to 40 seconds for setup

    afterAll((done) => {
        if (server) {
            server.close((err) => {
                if (err) {
                    console.error('Error closing the server:', err.message);
                } else {
                    console.log('Test server closed successfully.');
                }
                done(err);
            });
        } else {
            done();
        }
    });

    test('should handle load test', (done) => {
        const autocannonOptions = {
            url: 'http://localhost:4000',
            connections: 10, // Number of concurrent connections
            duration: 10,    // Duration of the test in seconds
            amount: 1000     // Number of requests
        };

        autocannon(autocannonOptions, (error, result) => {
            if (error) {
                console.error('Autocannon error:', error.message);
                done(error);
            } else {
                console.log('Autocannon result:', result);
                expect(result.duration).toBeLessThan(10000);
                done();
            }
        });
    }, 50000); // Increased timeout for the test to 50 seconds
});
