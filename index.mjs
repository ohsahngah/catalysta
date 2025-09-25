import fs from 'fs/promises';
import url from 'url';
import path from 'path';
import axios from 'axios';
import express from 'express';
import chalk, { colorNames } from 'chalk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const expressPkg = require('express/package.json');
const expressVersion = expressPkg.version;


const UAParser = require('ua-parser-js');


const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const router = express.Router();

const logFilePath = path.join(__dirname, 'catalysta', 'access.log');
const MAX_LOG_LINES = 1000;
// Creates a Promise chain to queue file write operations, ensuring they run sequentially to prevent file corruption.
let logQueue = Promise.resolve();


const majorVersion = parseInt(process.versions.node, 10);
if (majorVersion < 24) {
    console.error(chalk.bgRed.bold('ERROR'), "Incompatible Node.js version. Catalysta needs v24 or higher, but you're using", 'v' + majorVersion);
    process.exit(1);
}
console.log(chalk.bgGreen.bold('READY'), 'Node.js', 'v' + majorVersion);


const majorExpressVersion = parseInt(expressVersion.split('.')[0], 10);
if (majorExpressVersion < 5) {
    console.error(chalk.bgRed.bold('ERROR'), "Incompatible Express.js version. Catalysta needs v5 or higher, but you're using", 'v' + expressVersion);
    process.exit(1);
}
console.log(chalk.bgGreen.bold('READY'), 'Express.js', 'v' + majorExpressVersion);



async function logToFile(logMessage) {
    // Appends a new file write operation to the queue. It will only execute after the previous operation completes.
    logQueue = logQueue.then(async () => {
        try {
            // Appends the new log to the end of the file. The file is created if it doesn't exist.
            await fs.appendFile(logFilePath, logMessage + '\n', 'utf8');

            // Reads the entire content of the file.
            const data = await fs.readFile(logFilePath, 'utf8');
            const lines = data.split('\n');

            // If the line count exceeds the maximum, trim the oldest logs.
            if (lines.length > MAX_LOG_LINES) {
                // Slices the array to keep only the most recent MAX_LOG_LINES.
                const trimmedLines = lines.slice(-MAX_LOG_LINES);
                const newContent = trimmedLines.join('\n');
                
                // Overwrites the file with the trimmed content.
                await fs.writeFile(logFilePath, newContent, 'utf8');
            }
        } catch (err) {
            console.error(chalk.bgRed.bold('ERROR'), 'Failed to write to log file:', err);
        }
    }).catch(err => {
        // Catches any errors that occur within the queue itself.
        console.error(chalk.bgRed.bold('ERROR'), 'An error occurred in the log queue:', err);
        // Reset the queue to ensure it doesn't stall if an error occurs.
        logQueue = Promise.resolve();
    });
}



// Improves readability and performance by separating the file creation logic into an asynchronous function.
async function setupProjectStructure() {
    const config = {
        mainDir: 'catalysta',
        files: [
            {
                dir: 'backend',
                name: 'catalysts.mjs',
                content: `
import catalysta from 'catalysta';
// Catalysta should use traditional function syntax to access 'this' correctly
                `
            },
            { dir: 'frontend', name: 'styles.css', content: `body { background-color: #1a1a1a; color: #e0e0e0; }` },
            { dir: 'frontend', name: 'scripts.js', content: `alert('scripts.js file loaded!');` }
        ]
    };

    const baseDir = path.join(__dirname, config.mainDir);
    const uniqueDirs = [...new Set(config.files.map(f => path.join(baseDir, f.dir)))];

    try {
        // Creates directories in parallel.
        await Promise.all(uniqueDirs.map(dir => fs.mkdir(dir, { recursive: true })));

        // Creates files in parallel.
        await Promise.all(config.files.map(async ({ dir, name, content }) => {
            const fullPath = path.join(baseDir, dir, name);
            const relativePath = path.posix.join(config.mainDir, dir, name);
            try {
                // Using the 'wx' flag causes an error if the file exists, avoiding race conditions associated with fs.existsSync.
                await fs.writeFile(fullPath, content.trim(), { flag: 'wx' });
                console.log(`Created: ${relativePath}`);
            } catch (err) {
                if (err.code === 'EEXIST') {
                    console.log(`Exists: ${relativePath}`);
                } else {
                    throw err;
                }
            }
        }));
        console.log('\nProject setup complete!');
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'catalysta', 'frontend'));
app.use(express.static(path.join(__dirname, 'catalysta', 'frontend')));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    // Prevents direct access to EJS files.
    if (req.path.endsWith('.ejs')) {
        return res.status(404).send('Not Found');
    }

    req.api = __api;

    res.display = async function (partial, data = {}) {
        // JSON branching: If the first argument is an object, handle it with res.json().
        if (typeof partial === 'object' && partial !== null && !Array.isArray(partial)) {
            return res.json(partial);
        }

        // From this point on, partial should be a string.
        if (typeof partial !== 'string' || !partial.trim()) {
            return res.status(400).send('Invalid argument: Must be an object for JSON, a view name, or a string for plain text.');
        }

        const viewPath = path.join(this.app.get('views'), partial + '.ejs');
        let fileExists = false;
        try {
            // Check the file status to determine if it exists.
            await fs.stat(viewPath);
            fileExists = true;
        } catch (error) {
            // Consider errors other than file not found (ENOENT) as server errors.
            if (error.code !== 'ENOENT') {
                console.error('Error checking for view file:', error);
                return res.status(500).send('Internal Server Error.');
            }
            // If the file does not exist, fileExists remains false.
        }

        // Check if 'partial' contains any special characters or spaces.
        // Valid view names only allow letters, numbers, underscores (_), hyphens (-), and slashes (/).
        const isValidViewName = /^[a-zA-Z0-9_\-\/]+$/.test(partial);

        // 만약 유효하지 않은 문자(공백, 특수문자 등)가 포함되어 있다면,
        // 파일 존재 여부나 data 객체 유무와 상관없이 즉시 일반 문자열로 전송합니다.
        if (!isValidViewName) {
            return res.send(partial);
        }

        // If invalid characters (spaces, special characters, etc.) are included,
        // send as a plain string immediately, regardless of file existence or the presence of a data object.
        if (!fileExists && Object.keys(data).length === 0) {
            return res.send(partial);
        }

        // If the file exists, render the EJS template.
        // If the file is missing but data is provided, it's correct behavior for res.render to throw an error.
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            data = {};
        }

        res.render(partial, data, (err, content) => {
            if (err) {
                // Error occurred during template rendering (e.g., data provided but file is missing)
                console.error('Partial render error:', err);
                // You can show a friendly error message including the file path.
                if (err.message.includes('Failed to lookup view')) {
                    return res.status(404).send(`Template not found: ${partial}.ejs`);
                }
                return res.status(500).send('Error rendering partial view.');
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
                return res.status(400).send(`Partial must not include root HTML tags like ${safeTag}`);
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

    // Adds flags for request methods such as isGet and isPost.
    const method = req.method.toUpperCase();
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    methods.forEach(m => {
        req['is' + m.charAt(0) + m.slice(1).toLowerCase()] = (method === m);
    });

    next();
});


// API Helper
async function __api(method, url, data = null) {
    try {
        const config = { method, url, ...(data && { data }) };
        const response = await axios(config);
        return response.data;
    } catch (err) {
        console.error(`${method.toUpperCase()} request to ${url} failed:`, err.message);
        return null;
    }
}

let customNotFoundHandler = null;
let customErrorHandler = null;


const catalysta = {
    api: __api,
    writeToFile: false,

    timeStamp() {
        const now = new Date();
        const pad = (num, size = 2) => String(num).padStart(size, '0');
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    },

    logger(req, res) {
        const timeStamp = this.timeStamp();
        const start = performance.now();

        const parser = new UAParser();
        const ua = parser.setUA(req.headers['user-agent']).getResult();

        const browser = `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`;
        const os = `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`;
        const device = ua.device.type || 'desktop';

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        res.once('finish', () => {
            const duration = performance.now() - start;
            const statusCode = res.statusCode;

            const logMessage = [
                timeStamp,
                req.method,
                req.originalUrl,
                `${duration.toFixed(2)}ms`,
                '|',
                `Status: ${statusCode}`,
                '|',
                `IP: ${ip}`,
                '|',
                `Browser: ${browser}`,
                '|',
                `OS: ${os}`,
                '|',
                `Device: ${device}`
            ].join(' ');

            console.log(logMessage);

            // Asynchronously log to the file if `this.writeToFile` is true.
            // We don't await this call, so it doesn't block the HTTP response.
            // A background queue handles file writes to prevent corruption.
            if (this.writeToFile) {
                logToFile(logMessage);
            }
        });
    },


    // The server understood the request but refuses to authorize it.
    off(path) {
        router.all(path, (req, res) => {
            console.log(`Access to route [${path}] has been disabled (403 Forbidden).`);
            res.status(403).json({
                "catalysta": {
                    "status": {
                        "code": 403,
                        "desc": "forbidden"
                    }
                }
            });
        });
    },


    on(path, handler) {
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

        // Register general middleware: on(fn)
        if (isFunction(path) && handler === undefined) {
            const boundHandler = path.bind(this);
            app.use((req, res, next) => {
                try {
                    boundHandler(req, res, next);
                    if (!res.headersSent) next();
                } catch (err) {
                    next(err);
                }
            });
            return;
        }

        // Register route: on(path, handler)
        if (typeof path === 'string' && isFunction(handler)) {
            router.all(path, handler.bind(this));
        } else {
            throw new TypeError('Invalid arguments passed to on()');
        }
    }

};



(async () => {
    await setupProjectStructure();

    try {
        // Loads a custom module using top-level await.
        await import('./catalysta/backend/catalysts.mjs');

        app.use(router);

        app.use((req, res, next) => {
            res.status(404);
            if (typeof customNotFoundHandler === 'function') {
                return customNotFoundHandler(req, res, next);
            }
            res.json({
                "catalysta": {
                    "status": {
                        "code": 404,
                        "desc": "notFound"
                    }
                }
            });
        });

        app.use((err, req, res, next) => {
            res.status(500);
            if (typeof customErrorHandler === 'function') {
                return customErrorHandler(err, req, res, next);
            }
            console.error(chalk.red.bold('INTERNAL SERVER ERROR:', err.stack));
            if (!res.headersSent) {
                res.json({
                    "catalysta": {
                        "status": {
                            "code": 500,
                            "desc": "internalServerError"
                        }
                    }
                });
            }
        });

        app.listen(catalysta.port || 4444, () => {
            console.log(`\nCatalysta server running at: http://localhost:${catalysta.port || 4444}`);
        });

    } catch (err) {
        console.error('Critical: Could not load catalysta module. Server cannot start.', err);
        process.exit(1);
    }

    // The loaded file is treated as the catalysta module itself.
    global.catalysta = catalysta;
    
})();

export default catalysta;
