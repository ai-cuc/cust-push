exports.title = '按照主手机号码和账期获取账单详细一二级条目';
exports.path = '/getBillByTeleMonth';
exports.request = {
  tele: '15620001781', // 要查账单数据的主手机号
  month: '201706', // 账期月份
};
// curl http://localhost:3003/getBillByTeleMonth?serial_number=15522286631&cycle_id=201705

function* dbcall(c, sp, onames, params) {
  onames = onames.split(',');
  console.log(onames);
  const bindvars = {};
  const formal = onames.map(oname => `:${oname}`).join(', ');
  console.log(onames.map(oname => `:${onames}`));
  onames.forEach((oname) => {
    bindvars[oname] = {
      type: oracledb.CURSOR,
      dir: oracledb.BIND_OUT,
    };
  });
  const sql = `BEGIN ${sp}(${formal}); END;`;
  console.log(sql, bindvars);
  const result = yield c.execute(sql, bindvars);
  return result;
}

function* fetchAllReseltsets(result) {
  console.log('-----');
  const rdata = {};
  const outBinds = result.outBinds;
  for (const n in outBinds) {
    const outBind = outBinds[n];
    if (!outBind) {
      continue;
    }
    rdata[n] = {
      metaData: outBind.metaData,
      rows: yield outBind.getRows(1000),
    };
  }
  return rdata;
}

exports.service = function* getBillByTeleMonth(next) {
  const c = yield oracledb.getConnection('bill');
  c.module = 'internet-bill-push';
  const result = yield c.execute(`
    select * from ucr_act_kafka.ts_b_bill a
    where a.serial_number=:1 and a.cycle_id=:2`, [
      this.request.body.serial_number,
      this.request.body.cycle_id,
    ]);
  this.body = result.rows;
  yield c.close();
  yield next;
};
