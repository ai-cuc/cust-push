console.log(1);
const oracledb = require('oracledb');

console.log(2);

const co = require('co');
const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const kv = require('koa-convert');


process.env.UV_THREADPOOL_SIZE = 10;
oracledb.fetchAsString = [oracledb.DATE];
oracledb.outFormat = oracledb.OBJECT;
global.oracledb = oracledb;

const app = new Koa();
const router = new Router();

app.listen(3003);

co(function* () {
  try {
    yield oracledb.createPool({
      user: 'DEMO',
      password: 'demo',
      connectString: '132.177.101.40/jcss',
      poolMax: 6, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      poolMin: 4, // start with no connections; let the pool shrink completely
      poolIncrement: 1, // only grow the pool by one connection at a time
      poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      poolPingInterval: 60, // check aliveness of connection if in the pool for 60 seconds
      queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
      queueTimeout: 1000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
      poolAlias: 'jcss', // could set an alias to allow access to the pool via a name.
      stmtCacheSize: 2, // number of statements that are cached in the statement cache of each connection
      _enableStats: true, // default is false
    });
    console.log('database connected (jcss)');

    yield oracledb.createPool({
      user: 'UCR_UNP',
      password: 'Ucr_unp%2015',
      // ssh -fN -L '*:17514:132.175.9.14:1521' injectjs@132.175.9.117
      connectString: '192.168.31.215:17514/ngcrm2',
      poolMax: 6, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      poolMin: 4, // start with no connections; let the pool shrink completely
      poolIncrement: 1, // only grow the pool by one connection at a time
      poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      poolPingInterval: 60, // check aliveness of connection if in the pool for 60 seconds
      queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
      queueTimeout: 1000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
      poolAlias: 'sms', // could set an alias to allow access to the pool via a name.
      stmtCacheSize: 2, // number of statements that are cached in the statement cache of each connection
      _enableStats: true, // default is false
    });
    console.log('database connected (sms)');

    yield oracledb.createPool({
      user: 'UCR_ODS_QURY',
      password: 'H_x3v1',
      // ssh -fN -L '*:17613:132.176.9.13:1521' injectjs@132.176.9.109
      // 卡夫卡 UCR_ODS_QURY/H_x3v1@192.168.31.215:17613/ngods
      // 卡夫卡 UCR_STA_kafka/P_ks6zcd@192.168.31.215:17613/ngods
      connectString: '192.168.31.215:17613/ngods',
      poolMax: 6, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      poolMin: 4, // start with no connections; let the pool shrink completely
      poolIncrement: 1, // only grow the pool by one connection at a time
      poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      poolPingInterval: 60, // check aliveness of connection if in the pool for 60 seconds
      queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
      queueTimeout: 1000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
      poolAlias: 'bill', // could set an alias to allow access to the pool via a name.
      stmtCacheSize: 2, // number of statements that are cached in the statement cache of each connection
      _enableStats: true, // default is false
    });
    console.log('database connected (bill)');
  } catch (e) {
    console.error(e);
  }
});

app.on('error', (err) => {
  console.error('server error', err);
  this.status = 500;
});

// 获取请求体，解析成 js 数据，目前看必须是第一个中间件
app.use(koaBody({
  formLimit: 1 * 1000 * 1000, // 上传大小 1M 以内都允许，默认是 56kb
}));

app.use(function* (next) {
  if (!this.request.body) request.body = {};
  Object.assign(this.request.body, this.query);
  yield next;
});

// 任何情形，允许跨域访问
app.use(function* (next) {
  this.set('Access-Control-Allow-Origin', '*');
  // console.log(`${this.method} ${this.url}`);
  yield next;
});

// 检查 options，当希望本服务不提供模拟服务，而是代理到艾扑服务端时
app.use(function* (next) {
  // yield next; // 暂时先不启用
  if (this.method === 'OPTIONS') {
    // 在这里同意
    this.response.status = 202;
    this.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    this.set('Access-Control-Allow-Headers', 'content-type');
  } else {
    yield next;
  }
});

require('./eachfile.js')()((f, path, m) => {
  // 检查必要属性是否齐全
  if (!m.title) {
    throw new Error(`${path} 没有 title`);
  }
  if (!m.request && !m.client) {
    throw new Error(`${path} 没有 request 和 client，至少需要填一项`);
  }
  if (!m.response && !m.service) {
    throw new Error(`${path} 没有 reponse 和 service，至少需要填一项`);
  }

  // 挂载模拟服务
  // 支持 exports.response 为写死响应模式(一般刚刚定的接口，写个响应范例)
  // 支持 exports.service 为处理函数模式（继续演进模拟服务：模拟服务数据要动态，要响应请求，要做判断处理）
  const handler = m.service;
  console.log(f, path, m);
  if (!handler) return;
  const handler2 = kv(handler);
  router.get(path, handler2);
  router.post(path, handler2);
});

app.use(router.routes());

process
  .on('SIGTERM', () => {
    console.log('\nTerminating');
    oracledb.getPool('jcss').close();
    process.exit(0);
  })
  .on('SIGINT', () => {
    console.log('\nTerminating');
    oracledb.getPool('jcss').close();
    process.exit(0);
  });
