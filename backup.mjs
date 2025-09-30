import fs from 'fs/promises';
import url from 'url';
import path from 'path';
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

const app = express();
const router = express.Router();

const logFilePath = path.join(__dirname, 'catalysta', 'access.log');
const MAX_LOG_LINES = 1000;
// Promise 체인을 통해 파일 쓰기 작업을 순차적으로 큐에 넣음
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


// 로그 메시지를 파일에 비동기적으로 기록
// 최대 라인 수를 초과하면 로그를 자름
// HTTP 응답을 차단하지 않기 위해 큐를 통해 호출
async function logToFile(logMessage) {
    // Appends a new file write operation to the queue.
    logQueue = logQueue.then(async () => {
        try {
            // 1. 로그 추가
            await fs.appendFile(logFilePath, logMessage + '\n', 'utf8');

            // 2. 라인 수 확인 및 자르기
            const data = await fs.readFile(logFilePath, 'utf8');
            const lines = data.split('\n');

            if (lines.length > MAX_LOG_LINES) {
                // 가장 최근 로그 MAX_LOG_LINES개만 유지
                const trimmedLines = lines.slice(-MAX_LOG_LINES);
                const newContent = trimmedLines.join('\n');
                
                // 덮어쓰기
                await fs.writeFile(logFilePath, newContent, 'utf8');
            }
        } catch (err) {
            console.error(chalk.bgRed.bold('ERROR'), 'Failed to write to log file:', err);
        }
    }).catch(err => {
        // 큐 자체에서 발생한 오류 처리 및 큐 리셋
        console.error(chalk.bgRed.bold('ERROR'), 'An error occurred in the log queue:', err);
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
import catalysta from 'catalysta';
// Catalysta should use traditional function syntax to access 'this' correctly
// 예: catalysta.on('/', function(req, res) { this.logger(req, res); res.display('index'); });
                `
            },
            { dir: 'frontend', name: 'styles.css', content: `body { background-color: #1a1a1a; color: #e0e0e0; }` },
            { dir: 'frontend', name: 'scripts.js', content: `alert('scripts.js file loaded!');` }
        ]
    };

    const baseDir = path.join(__dirname, config.mainDir);
    const uniqueDirs = [...new Set(config.files.map(f => path.join(baseDir, f.dir)))];

    try {
        await Promise.all(uniqueDirs.map(dir => fs.mkdir(dir, { recursive: true })));

        await Promise.all(config.files.map(async ({ dir, name, content }) => {
            const fullPath = path.join(baseDir, dir, name);
            const relativePath = path.posix.join(config.mainDir, dir, name);
            try {
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


const TIMEZONE_MAP = {
    // 아시아/태평양
    'SEOUL': 'Asia/Seoul',
    'TOKYO': 'Asia/Tokyo',
    'BEIJING': 'Asia/Shanghai', 
    'DELHI': 'Asia/Kolkata',
    'SYDNEY': 'Australia/Sydney',
    'MELBOURNE': 'Australia/Melbourne',
    'AUCKLAND': 'Pacific/Auckland',
    'DUBAI': 'Asia/Dubai',        
    
    // 유럽/중동
    'MOSCOW': 'Europe/Moscow',
    'LONDON': 'Europe/London',
    'PARIS': 'Europe/Paris',
    'ROME': 'Europe/Rome',
    'BERLIN': 'Europe/Berlin',
    'ISTANBUL': 'Europe/Istanbul',  
    'CAIRO': 'Africa/Cairo',        
    
    // 미주
    'NEWYORK': 'America/New_York',
    'CHICAGO': 'America/Chicago',
    'LA': 'America/Los_Angeles',
    'RIO': 'America/Sao_Paulo',     
    'MEXICOCITY': 'America/Mexico_City', 
    'HONOLULU': 'Pacific/Honolulu', 
    
    // 파라미터가 없거나 일치하지 않을 때
    'DEFAULT': 'UTC'
};


let customNotFoundHandler = null;
let customErrorHandler = null;


const catalysta = {

    async api(method, url, data = null) {
        try {
            const config = { method, url, ...(data && { data }) };
            const response = await axios(config);
            return response.data;
        } catch (err) {
            console.error(`${method.toUpperCase()} request to ${url} failed:`, err.message);
            return err.response ? err.response.data : { error: err.message };
        }
    },

    writeToFile: false,
    logTimeZone: 'UTC', 

    timeStamp(city) {
        const upperCity = (city || '').toUpperCase();
        const timezone = TIMEZONE_MAP[upperCity] || TIMEZONE_MAP.DEFAULT;

        const formatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3, 
            hourCycle: 'h23', // 24시간 표기
            timeZone: timezone
        });

        const parts = formatter.formatToParts(new Date());
        const pad = (num, size = 2) => String(num).padStart(size, '0');
        const partMap = parts.reduce((acc, part) => {
            if (part.type) {
                 acc[part.type] = part.value;
            }
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
    },

    // 요청에 대한 로그를 콘솔과 파일에 기록
    logger(req, res) {
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

            const timeStamp = this.timeStamp(this.logTimeZone); 

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

    // Express 미들웨어 설정
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'catalysta', 'frontend'));
    app.use(express.static(path.join(__dirname, 'catalysta', 'frontend')));
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true }));


    // 커스텀 미들웨어 설정
    app.use((req, res, next) => {
        // Prevents direct access to EJS files.
        if (req.path.endsWith('.ejs')) {
            return res.status(404).send('Not Found');
        }

        req.api = catalysta.api; 

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
                await fs.stat(viewPath);
                fileExists = true;
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Error checking for view file:', error);
                    return res.status(500).send('Internal Server Error.');
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
                    console.error('Partial render error:', err);
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

    try {
        // Loads a custom module using top-level await.
        await import('./catalysta/backend/catalysts.mjs');

        // 라우터 등록
        app.use(router);

        // 404 핸들러
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

        // 500 에러 핸들러
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