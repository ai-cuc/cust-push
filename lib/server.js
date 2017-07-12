const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const kv = require('koa-convert');

const app = new Koa();
const router = new Router();

app.listen(3003);

require('./dbm.js');

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
  if (m.use) { // 如果是自行控制路由和处理
    m.use(router);
    return;
  }
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

function closeDB() {
  oracledb.getPool('bill').close();
  oracledb.getPool('sms').close();
}
process
  .on('SIGTERM', () => {
    console.log('\nTerminating');
    closeDB();
    process.exit(0);
  })
  .on('SIGINT', () => {
    console.log('\nTerminating');
    closeDB();
    process.exit(0);
  });
