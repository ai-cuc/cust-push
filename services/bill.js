const Handlebars = require('handlebars');
const crypto = require('crypto');
const secret = require('../lib/secret.js');

const source = require('fs').readFileSync('./bill.mustache', {
  encoding: 'utf-8',
});

const template = Handlebars.compile(source);

exports.title = '按照主手机号码和账期获取账单详细一二级条目';
exports.path = '/bill/:serial_number/:cycle_id/:hash';
exports.request = {
  tele: '15620001781', // 要查账单数据的主手机号
  month: '201706', // 账期月份
};

exports.service = async (ctx, next) => {
  // 计算哈希验证码，进行非法构建 url 访问的检测
  const hash = crypto.createHash('sha512');
  const data = `${ctx.params.serial_number}.${ctx.params.cycle_id}.${secret}`;
  hash.update(data);
  const realHash = hash.digest('hex');
  if (realHash !== ctx.params.hash) { // 非系统构建的 url/hash
    ctx.body = '非法访问请求';
    return;
  }

  const bindvars = {
    v_serial_number: {
      val: ctx.params.serial_number,
      type: oracledb.STRING,
      dir: oracledb.BIND_IN,
    },
    v_cycle_id: {
      val: ctx.params.cycle_id,
      type: oracledb.STRING,
      dir: oracledb.BIND_IN,
    },
    v_cur: {
      type: oracledb.CURSOR,
      dir: oracledb.BIND_OUT,
    },
    v_resultcode: {
      type: oracledb.NUMBER,
      dir: oracledb.BIND_OUT,
    },
    v_resulterrinfo: {
      type: oracledb.STRING,
      dir: oracledb.BIND_OUT,
    },
  };
  await getConn('bill', async (c) => {
    const result = await c.execute('BEGIN p_sdr_individ_bill_out(:v_serial_number, :v_cycle_id, :v_cur, :v_resultcode, :v_resulterrinfo); END;', bindvars);
    result.rows = await result.outBinds.v_cur.getRows(1000);
    // ctx.body = JSON.stringify(result, null, 2);
    result.params = ctx.params;
    ctx.body = template(result);
    // console.log(result);
  });
  await next();
};

exports.use = router => router.get('/bill/:serial_number/:cycle_id/:hash', exports.service);
