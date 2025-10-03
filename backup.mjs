process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'url';
import axios from 'axios';
import express from 'express';
import chalk from 'chalk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const expressPkg = require('express/package.json');
const expressVersion = expressPkg.version;

const UAParser = require('ua-parser-js'); 

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_ROOT = __dirname;

const app = express();
const router = express.Router();

const logFilePath = path.join(PROJECT_ROOT, 'catalysta', 'access.log');

let logQueue = Promise.resolve();
let customNotFoundHandler = null;
let customErrorHandler = null;

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

async function logToFile(logMessage) {
    logQueue = logQueue.then(async () => {
        try {
            const logDir = path.dirname(logFilePath);
            await fs.mkdir(logDir, { recursive: true });

            await fs.appendFile(logFilePath, logMessage + '\n', 'utf8');

            const stats = await fs.stat(logFilePath);
            if (stats.size > MAX_LOG_SIZE_BYTES) {
                console.warn(chalk.bgYellow.bold(' LOGGER:WARN '),
                    `Log file exceeds ${MAX_LOG_SIZE_BYTES / 1024 / 1024}MB (${(stats.size / 1024 / 1024).toFixed(2)}MB): ${logFilePath}`
                );
                // Add feature
            }
        } catch (err) {
            console.error(chalk.bgRed.bold(' LOGGER:ERROR '), 'Failed to write or check log file.');
        }
    }).catch(err => {
        console.error(chalk.bgRed.bold(' LOGGER:ERROR '), 'An error occurred in the log queue.');
        logQueue = Promise.resolve();
    });
}


async function setupProjectStructure() {
    const config = {
        mainDir: 'catalysta',
        files: [
            {
                dir: 'backend',
                name: 'catalysts.mjs',
                content: `
// 'catalysta' is globally available, no import needed.
// Use traditional function syntax to access 'this' context correctly.
                `
            },
            { dir: 'frontend', name: 'index.ejs', content: `<h1>Hello, Catalysta!</h1>` },
            { dir: 'frontend', name: 'styles.css', content: `body { background-color: #1a1a1a; color: #e0e0e0; }` },
            { dir: 'frontend', name: 'scripts.js', content: `console.log('scripts.js file loaded!');` }
        ]
    };

    const baseDir = path.join(PROJECT_ROOT, config.mainDir);
    const uniqueDirs = [...new Set(config.files.map(f => path.join(baseDir, f.dir)))];

    try {
        await Promise.all(uniqueDirs.map(dir => fs.mkdir(dir, { recursive: true })));

        await Promise.all(config.files.map(async ({ dir, name, content }) => {
            const fullPath = path.join(baseDir, dir, name);
            const relativePath = path.posix.join(config.mainDir, dir, name);
            try {
                await fs.writeFile(fullPath, content.trim(), { flag: 'wx' });
            } catch (err) {
                if (err.code === 'EEXIST') {
                } else {
                    throw err;
                }
            }
        }));

        const sourceFavicon = path.join(PROJECT_ROOT, 'node_modules', 'catalysta', 'favicon.ico');
        const targetFavicon = path.join(baseDir, 'frontend', 'favicon.ico');

        try {
            await fs.access(targetFavicon);
        } catch (accessErr) {
            if (accessErr.code === 'ENOENT') {
                try {
                    await fs.copyFile(sourceFavicon, targetFavicon);
                } catch (copyErr) {
                    if (copyErr.code === 'ENOENT') {
                    } else {
                        throw copyErr;
                    }
                }
            } else {
                throw accessErr;
            }
        }

    } catch (err) {
        console.error(chalk.bgRed.bold(' ERROR '), 'Setup failed.');
        process.exit(1);
    }
}

const TIMEZONE_MAP = {
    'SEOUL': 'Asia/Seoul', 'TOKYO': 'Asia/Tokyo', 'BEIJING': 'Asia/Shanghai', 'DELHI': 'Asia/Kolkata',
    'SYDNEY': 'Australia/Sydney', 'MELBOURNE': 'Australia/Melbourne', 'AUCKLAND': 'Pacific/Auckland',
    'DUBAI': 'Asia/Dubai', 'MOSCOW': 'Europe/Moscow', 'LONDON': 'Europe/London', 'PARIS': 'Europe/Paris',
    'ROME': 'Europe/Rome', 'BERLIN': 'Europe/Berlin', 'ISTANBUL': 'Europe/Istanbul', 'CAIRO': 'Africa/Cairo',
    'NEWYORK': 'America/New_York', 'CHICAGO': 'America/Chicago', 'LA': 'America/Los_Angeles',
    'RIO': 'America/Sao_Paulo', 'MEXICOCITY': 'America/Mexico_City', 'HONOLULU': 'Pacific/Honolulu',
    'DEFAULT': 'UTC'
};


function catalysta(path, handler) {
    const isFunction = (fn) => typeof fn === 'function';
    const registerErrorHandler = (type, fn) => {
        if (!isFunction(fn)) {
            throw new TypeError(`on(${JSON.stringify(type)}) expects a function as the second argument`);
        }
        if (type === 404 || type === 'notfound') {
            customNotFoundHandler = fn;
        } else if (type === 500 || type === 'error') {
            customErrorHandler = fn;
        }
    };
    if (typeof path === 'number' || typeof path === 'string') {
        const normalizedPath = typeof path === 'string' ? path.toLowerCase() : path;
        if ([404, 'notfound', 500, 'error'].includes(normalizedPath)) {
            registerErrorHandler(normalizedPath, handler);
            return;
        }
    }

    if (isFunction(path) && handler === undefined) {
        const boundHandler = path.bind(catalysta);
        app.use(async (req, res, next) => {
            // favicon.ico 요청은 무시하고 바로 다음 미들웨어로 넘기기
            if (req.path === '/favicon.ico') {
                return next();
            }

            try {
                const maybePromise = boundHandler(req, res, next);
                if (maybePromise instanceof Promise) {
                    await maybePromise;
                }
            } catch (err) {
                return next(err);
            }

            if (!res.headersSent) {
                next();
            }
        });
        return;
    }


    if (typeof path === 'string' && isFunction(handler)) {
        router.all(path, handler.bind(catalysta));
    } else {
        throw new TypeError('Invalid arguments passed to on()');
    }
}


catalysta.api = async function(method, url, data = null) {
    try {
        const config = { method, url, ...(data && { data }) };
        const response = await axios(config);
        return response.data;
    } catch (err) {
        console.error(`${method.toUpperCase()} request to ${url} failed:`, err.message);
        return err.response ? err.response.data : { error: err.message };
    }
}

catalysta.writeToFile = false;
catalysta.logTimeZone = 'UTC';

catalysta.timeStamp =  function(city) {
    const upperCity = (city || '').toUpperCase();
    const timezone = TIMEZONE_MAP[upperCity] || TIMEZONE_MAP.DEFAULT;
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23', timeZone: timezone
    });
    const parts = formatter.formatToParts(new Date());
    const pad = (num, size = 2) => String(num).padStart(size, '0');
    const partMap = parts.reduce((acc, part) => {
        if (part.type) acc[part.type] = part.value;
        return acc;
    }, {});
    const year = partMap.year;
    const month = partMap.month;
    const day = partMap.day;
    const hours = pad(partMap.hour);
    const minutes = pad(partMap.minute);
    const seconds = pad(partMap.second);
    const milliseconds = pad(partMap.fractionalSecond, 3);
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

catalysta.logger = function(req, res) {
    if (!req || !res) {
        console.error(chalk.bgRed.bold(' LOGGER:ERROR '), 'Request and response parameters are required.');
        process.exit(1);
    }
    if (typeof req !== 'object' || typeof res !== 'object') {
        console.error(chalk.bgRed.bold(' LOGGER:ERROR '), 'Request and response must be objects.');
        process.exit(1);
    }

    const start = performance.now();

    const parser = new UAParser();
    const ua = parser.setUA(req.headers['user-agent']).getResult();
    const browser = `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`;
    const os = `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`;
    const device = ua.device.type || 'desktop';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown IP';

    res.once('finish', () => {
        const duration = performance.now() - start;
        const statusCode = res.statusCode;
        const timeStamp = this.timeStamp(this.logTimeZone); 
        const logMessage = [
            timeStamp, req.method, req.originalUrl, `${duration.toFixed(2)}ms`, '|',
            `Status: ${statusCode}`, '|', `IP: ${ip}`, '|', `Browser: ${browser}`, '|',
            `OS: ${os}`, '|', `Device: ${device}`
        ].join(' ');
        
        console.log(logMessage);
        if (this.writeToFile) {
            logToFile(logMessage);
        }
    });
}


catalysta.off = function(path) {
    router.all(path, (req, res) => {
        console.log(chalk.bgYellow.bold(' WARN '), `Access to route [${path}] has been disabled.`);
        res.status(403).json({
            "catalysta": { "status": { "code": 403, "desc": "forbidden" } }
        });
    });
}


global.catalysta = catalysta;

(async () => {
    console.log(chalk.bold('Catalista is preparing your project!\n'));
    const majorVersion = parseInt(process.versions.node, 10);
    if (majorVersion < 24) {
        console.error(chalk.bgRed.bold(' ERROR '), "Incompatible Node.js version. Catalysta needs v24 or higher, but you're using", 'v' + majorVersion);
        process.exit(1);
    }
    console.log(chalk.bgGreen.bold(' OK '), 'Linked Node.js', 'v' + majorVersion);

    const majorExpressVersion = parseInt(expressVersion.split('.')[0], 10);
    if (majorExpressVersion < 5) {
        console.error(chalk.bgRed.bold(' ERROR '), "Incompatible Express.js version. Catalysta needs v5 or higher, but you're using", 'v' + expressVersion);
        process.exit(1);
    }
    console.log(chalk.bgGreen.bold(' OK '), 'Linked Express.js', 'v' + majorExpressVersion);

    await setupProjectStructure();

    app.set('view engine', 'ejs');
    app.set('views', path.join(PROJECT_ROOT, 'catalysta', 'frontend'));

    app.use((req, res, next) => {
        if (req.path.endsWith('.ejs')) {
            console.warn(chalk.bgYellow.bold(' WARN '), 'Received a request for an EJS file from the client, but it was denied.');
            res.status(403).json({
                "catalysta": { "status": { "code": 403, "desc": "forbidden" } }
            });
        }
        next();
    });

    app.use(express.static(path.join(PROJECT_ROOT, 'catalysta', 'frontend')));
    
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
        req.api = catalysta.api; 
        res.display = async function (partial, data = {}) {
            if (typeof partial === 'object' && partial !== null && !Array.isArray(partial)) {
                return res.json(partial);
            }
            if (typeof partial !== 'string' || !partial.trim()) {
                console.error(chalk.bgRed.bold(' ERROR '), 'The argument is invalid and must be an object for JSON or a string for view.');
                res.status(500).json({
                    "catalysta": { "status": { "code": 500, "desc": "internalServerError" } }
                });
                process.exit(1);
            }
            const viewPath = path.join(this.app.get('views'), partial + '.ejs');
            let fileExists = false;
            try {
                await fs.stat(viewPath);
                fileExists = true;
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error(chalk.bgRed.bold(' ERROR '), 'There\'s a problem with the', chalk.yellow.bold(partial), 'template file!');
                    return res.status(500).json({
                        "catalysta": { "status": { "code": 500, "desc": "internalServerError" } }
                    });
                }
            }
            const isValidViewName = /^[a-zA-Z0-9_\-\/]+$/.test(partial);
            if (!isValidViewName) {
                return res.send(partial);
            }
            if (!fileExists && Object.keys(data).length === 0) {
                return res.send(partial);
            }
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                data = {};
            }
            res.render(partial, data, (err, content) => {
                if (err) {
                    console.error(chalk.bgRed.bold(' ERROR '), 'Error rendering partial view.');
                    return res.status(500).json({
                        "catalysta": { "status": { "code": 500, "desc": "internalServerError" } }
                    });
                }
                const lower = content.toLowerCase();
                const forbiddenTags = new Set(['<html', '<head', '<body', '<meta', '<title', '<link', '<!doctype']);
                let forbiddenTagFound = null;
                for (const tag of forbiddenTags) {
                    if (lower.includes(tag)) {
                        forbiddenTagFound = tag;
                        break;
                    }
                }
                if (forbiddenTagFound) {
                    const safeTag = forbiddenTagFound.replace(/</g, '&lt;');
                    console.error(chalk.bgRed.bold(' ERROR '), `Partial must not include root HTML tags like ${safeTag}`);
                    return res.status(500).json({
                        "catalysta": { "status": { "code": 500, "desc": "internalServerError" } }
                    });
                }
                const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title || 'Catalysta'}</title>
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/styles.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { line-height: 1.6; font-family: sans-serif; }
    </style>
</head>
<body>
    ${content}
    <script src="/scripts.js"></script>
</body>
</html>`;
                res.send(html.trim());
            });
        };
        const method = req.method.toUpperCase();
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        methods.forEach(m => {
            req['is' + m.charAt(0) + m.slice(1).toLowerCase()] = (method === m);
        });
        next();
    });

    try {
        try {
            const catalystsAbsolutePath = path.join(PROJECT_ROOT, 'catalysta', 'backend', 'catalysts.mjs');
            const catalystsUrl = url.pathToFileURL(catalystsAbsolutePath).href;

            await import(catalystsUrl);
            console.log(chalk.bgGreen.bold(' OK '), 'Linked Catalysta system');

        } catch (err) {
            console.error(chalk.bgRed.bold(' ERROR '), 'Could not load catalysts.mjs file!');
            console.error(chalk.red('Reason:'), err.message);
            process.exit(1); // 종료하지 않고 계속할 수도 있음
        }

        app.use(router);
        app.use((req, res, next) => {
            res.status(404);
            if (typeof customNotFoundHandler === 'function') {
                return customNotFoundHandler(req, res, next);
            }
            res.json({
                "catalysta": { "status": { "code": 404, "desc": "notFound" } }
            });
        });
        app.use((err, req, res, next) => {
            res.status(500);
            if (typeof customErrorHandler === 'function') {
                return customErrorHandler(err, req, res, next);
            }
            console.error(chalk.bgRed.bold(' ERROR '), 'Internal server error.');
            if (!res.headersSent) {
                res.json({
                    "catalysta": { "status": { "code": 500, "desc": "internalServerError" } }
                });
            }
        });
        app.listen(catalysta.port || 4444, () => {
            console.log(chalk.bold('\nCatalysta server running at:'), chalk.green.bold(`http://localhost:${catalysta.port || 4444}`));
        });
    } catch (err) {
        console.error(chalk.bgRed.bold(' ERROR '), 'Could not load catalysta module. Server cannot start.');
        process.exit(1);
    }
})();

export default catalysta;