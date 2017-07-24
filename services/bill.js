const Handlebars = require('handlebars');
const crypto = require('crypto');
const secret = require('../lib/secret.js')();

const source = require('fs').readFileSync('./bill2.mustache', {
  encoding: 'utf-8',
});

const template = Handlebars.compile(source);

exports.title = '按照主手机号码和账期获取账单详细一二级条目';
exports.path = '/bill/:serial_number/:cycle_id/:hash';
exports.request = {
  tele: '15620001781', // 要查账单数据的主手机号
  month: '201706', // 账期月份
};

function lastMonth() { // 根据当前时间，获取上一月账期字符串 yyyymm
  const d = new Date();
  return (200000 + (d.getYear() % 100) * 100 + d.getMonth()).toString(10);
}

function addRowspan(rows) {
  const len = rows.length;
  let tele = '';
  const sum = '';
  let teleCount = 0;
  const sumCount = 0;
  for (let i = len - 2; i >= 0; i--) {
    const row = rows[i];
    if (row.F1 !== tele) { // 新开一行
      if (tele) { // 先结束上一组处理
        rows[i + 1].F1rowspan = teleCount;
        rows[i + teleCount].F3colspan = 2;
      }
      teleCount = 1;
      tele = row.F1;
    } else {
      teleCount++;
    }
  }
  rows[0].F1rowspan = teleCount;
  rows[teleCount - 1].F3colspan = 2;
  rows[len - 1].last = true;
}

exports.service = async (ctx, next) => {
  // 计算哈希验证码，进行非法构建 url 访问的检测
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(new Buffer(`${ctx.params.serial_number}.${ctx.params.cycle_id}`, 'ascii'));
  const realHash = hmac.digest('hex');
  console.log(realHash);

  if (realHash !== ctx.params.hash.toLowerCase()) { // 非系统构建的 url/hash
    // console.log(realHash);
    ctx.throw(400, '非法构建url访问');
  }
  if (ctx.params.cycle_id !== lastMonth()) { // 禁止看老账期账单
    ctx.throw(401, '系统只支持访问上一月账单');
  }

  const flowReq = {
    method: 'ecaop.trades.query.comm.flow.qry',
    msg: {
      busiType: '01', // 01手机流量，02上网卡流量
      qryMonth: ctx.params.cycle_id,
      number: ctx.params.serial_number,
    },
  };
  let flowResp;
  try {
    flowRes = await aopCall(flowReq);
    console.log(flowResp);
  } catch (e) {
    // 模拟一个
    flowResp = {
      chargeFlow: '0',
      otherFlow: '1362524',
      otherRemFlow: '3145728',
      otherUseFlow: '0',
      overtopFlow: '0',
      setTotalFlow: '3145728',
      setTotalRemainFlow: '3145728',
      setTotalUseFlag: '0',
      setTotalUseFlow: '0',
      totalFlow: '1362524',
      carryTotalFlow_: '1000000', // 实测 aop 未返回此字段
      carryRemainFlow_: '1000000', // 实测 aop 未返回此字段
    };
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
    v_cur1: {
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
    const result = await c.execute('BEGIN p_sdr_individ_bill_out(:v_serial_number, :v_cycle_id, :v_cur, :v_cur1, :v_resultcode, :v_resulterrinfo); END;', bindvars);
    result.rows = await result.outBinds.v_cur.getRows(1000);
    result.main = (await result.outBinds.v_cur1.getRows(1))[0];
    if (flowResp && flowResp.carryTotalFlow) {
      result.main.carryTotalFlow = Math.floor(parseInt(flowResp.carryTotalFlow) / 1000);
      result.main.carryRemainFlow = Math.floor(parseInt(flowResp.carryRemainFlow) / 1000);
    }
    // ctx.body = JSON.stringify(result, null, 2);
    result.params = ctx.params;
    addRowspan(result.rows);
    // console.log(JSON.stringify(result, null, 2));
    ctx.body = template(result);
    // console.log(result);
  }).catch((e) => {
    console.error('in bill');
    console.error(e);
    // ctx.throw(504, '系统忙，请稍后再试');
    ctx.statusCode = 504;
    ctx.type = 'html';
    ctx.body = '<h1>系统忙，请稍后再试</h1>';
  });
  await next();
};

exports.use = router => router.get('/bill/:serial_number/:cycle_id/:hash', exports.service);
