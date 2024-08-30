/**
 * Description:
 * This file implements a CookieManager class that manages cookies using the `tough-cookie` library.
 * The class allows setting and retrieving cookies for specific URLs and provides access to the entire
 * cookie jar, which can be used to manage cookie persistence in an application.
 *
 * Purpose of the File:
 * - Create and manage cookies using a `CookieJar` instance.
 * - Provide methods to set cookies from a string and URL.
 * - Retrieve all cookies for a specific URL as a string.
 * - Offer access to the entire cookie jar for more advanced operations.
 */

const {CookieJar} = require('tough-cookie');

class CookieManager {
    constructor() {
        this.jar = new CookieJar();
    }

    setCookie(cookieStr, url) {
        return new Promise((resolve, reject) => {
            this.jar.setCookie(cookieStr, url, (err, cookie) => {
                if (err) return reject(err);
                resolve(cookie);
            });
        });
    }

    getCookieString(url) {
        return new Promise((resolve, reject) => {
            this.jar.getCookieString(url, (err, cookies) => {
                if (err) return reject(err);
                resolve(cookies);
            });
        });
    }

    getCookieJar() {
        return this.jar;
    }
}

module.exports = CookieManager;
