const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const fs = require('fs');

if (!fs.existsSync('./database.json'))
  fs.writeFileSync('./database.json', '[]', {encoding: 'utf8'})
if (!fs.existsSync('./upload'))
  fs.mkdirSync('./upload');
const views = require('koa-views');
const co = require('co');
const convert = require('koa-convert');
const json = require('koa-json');
const onerror = require('koa-onerror');
const bodyparser = require('koa-bodyparser');
const logger = require('koa-logger');
const debug = require('debug')('koa2:server');
const auth = require('koa-basic-auth');
let database = require('./database.json') || [];
let counter = database.length;


const path = require('path');

const config = require('./config');
const routes = require('./routes');

const port = process.env.PORT || config.port;

// error handler
onerror(app);

// custom 401 handling
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (401 == err.status) {
      ctx.status = 401;
      ctx.set('WWW-Authenticate', 'Basic');
      ctx.body = 'Auth please enemies';
    } else {
      throw err;
    }
  }
});

app.use(auth({ name: 'olegira', pass: 'fsbprivet' }));

// middlewares
app
  .use(bodyparser())
  .use(json())
  .use(logger())
  .use(require('koa-static')(__dirname + '/public'))
  .use(views(path.join(__dirname, '/views'), {
    options: {settings: {views: path.join(__dirname, 'views')}},
    map: {'pug': 'pug'},
    extension: 'pug'
  }))
  .use(router.routes())
  .use(router.allowedMethods())

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - $ms`)
});


routes(router);

app.on('error', function(err, ctx) {
  console.log(err);
  logger.error('server error', err, ctx)
});

module.exports = app.listen(config.port, () => {
  console.log(`Listening on http://localhost:${config.port}`)
});
