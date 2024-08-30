---

# **My-Libcurl-JS**

`My-Libcurl-JS` is a powerful and versatile Node.js package designed for making secure HTTP/HTTPS requests, managing SSL
certificates, performing encryption, and running various network operations such as FTP, SFTP, IMAP, and more. The
package includes robust testing capabilities and performance benchmarking, making it suitable for high-demand
applications requiring advanced networking and security features.

## **Table of Contents**

- [Features](#features)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Usage](#usage)
    - [1. HttpsClient](#1-httpsclient)
    - [2. CertManager](#2-certmanager)
    - [3. EncryptionClient](#3-encryptionclient)
    - [4. Performance Testing](#4-performance-testing)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

## **Features**

- **HTTP/HTTPS Client**: Make secure requests with configurable SSL/TLS options.
- **Certificate Management**: Generate, load, and validate self-signed certificates.
- **Encryption and Decryption**: Encrypt and decrypt data and files using modern algorithms like AES and ChaCha20.
- **Network Operations**: Support for FTP, SFTP, SCP, IMAP, and SMTP protocols.
- **Performance Testing**: Benchmark server performance using Autocannon.
- **Security Testing**: Test SSL configurations and access control lists (ACLs).
- **Functional Testing**: Simulate real-world scenarios and stress tests.

## **Installation**

Ensure you have Node.js installed. Clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/my-libcurl-js.git
cd my-libcurl-js
npm install
```

## **Environment Setup**

Create a `.env` file in the root directory with the following environment variables:

```bash
# SSL Certificates paths
CERT_PATH=/path/to/your/cert.pem
KEY_PATH=/path/to/your/key.pem
CA_PATH=/path/to/your/ca.pem
```

Replace `/path/to/your/` with the actual paths to your SSL certificate files.

## **Usage**

### **1. HttpsClient**

The `HttpsClient` allows you to make secure HTTP/HTTPS requests.

```javascript
const HttpsClient = require('./path/to/httpsClient');

// Initialize with SSL options
const sslOptions = HttpsClient.loadCerts(process.env.CERT_PATH, process.env.KEY_PATH, process.env.CA_PATH);

const client = new HttpsClient('https://example.com', sslOptions);

(async () => {
    try {
        const response = await client.get('/');
        console.log('Response:', response.body.toString());
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
```

### **2. CertManager**

Generate and manage SSL certificates.

```javascript
const CertManager = require('./path/to/certManager');

// Initialize CertManager
const certManager = new CertManager('./certs');

// Generate a new self-signed certificate
certManager.generateSelfSignedCert('test.local')
    .then((certInfo) => {
        console.log('Certificate generated:', certInfo);
    })
    .catch((error) => {
        console.error('Error:', error.message);
    });
```

### **3. EncryptionClient**

Encrypt and decrypt data or files.

```javascript
const EncryptionClient = require('./path/to/encryptionClient');
const crypto = require('crypto');

// Initialize EncryptionClient with AES-256-CBC
const encryptionClient = new EncryptionClient('aes-256-cbc', crypto.randomBytes(32));

// Encrypt and decrypt text
const encrypted = encryptionClient.encrypt('Hello, World!');
console.log('Encrypted:', encrypted);

const decrypted = encryptionClient.decrypt(encrypted);
console.log('Decrypted:', decrypted);
```

### **4. Performance Testing**

Run performance tests using Autocannon to benchmark your server.

```javascript
const autocannon = require('autocannon');

// Define Autocannon options
const options = {
    url: 'http://localhost:4000',
    connections: 10,
    duration: 10,
};

// Run the performance test
autocannon(options, (err, result) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        console.log('Performance result:', result);
    }
});
```

## **Running Tests**

The package includes various tests: unit, integration, functional, performance, and security tests. To run the tests,
use:

```bash
npm test
```

Ensure all dependencies and environment variables are correctly set up before running the tests. The tests cover:

- **Unit Tests**: Check individual module functionality.
- **Integration Tests**: Test the integration between multiple modules.
- **Performance Tests**: Benchmark the system under load using Autocannon.
- **Security Tests**: Validate SSL configurations and access controls.

## **Contributing**

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a Pull Request.

## **License**

This project is licensed under the MIT License.

---

