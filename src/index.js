const winston    = require('winston');
const Koa        = require('koa');
const serve      = require('koa-static');
const websockify = require('koa-websocket');
const fsp        = require('fs').promises;
const Handler    = require('./handler');

require('dotenv').config();

// define logger
winston.add(new winston.transports.Console({
    level:  process.env.LOGGER_LEVEL || 'warn',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf((info) => {
            const meta = JSON.stringify(Object.assign({}, info, {
                level:     undefined,
                message:   undefined,
                timestamp: undefined,
                splat:     undefined,
            }));

            const level = info.level + (info.level.length < 15 ? ' '.repeat(15 - info.level.length) : '');

            if (meta !== '{}') {
                return `[${level}] [${info.timestamp}] ${info.message} ${meta}`;
            }

            return `[${level}] [${info.timestamp}] ${info.message}`;
        })
    )
}));

// create and start server
const app = websockify(new Koa());

app.ws.use(async (ctx) => new Handler(ctx.websocket));
app.use(serve(__dirname + '/../public'));
app.use(serve(__dirname + '/../node_modules'));
app.use(async (ctx) => ctx.body = await fsp.readFile(__dirname + '/../public/index.html'));

app.listen({
    host: process.env.HOST,
    port: process.env.PORT,
}, () => winston.debug('Listening at ' + process.env.HOST + ':' + process.env.PORT));

