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
