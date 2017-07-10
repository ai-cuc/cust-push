exports.title = '发送OTP短信密码(查短信发送表)';
exports.path = '/sendSMSPassword';
exports.request = {
  tele: '15620001781', // 发送目标号码
  content: '账单访问密码为123456,5分钟内有效', // 发送内容
};
// curl http://localhost:3003/sendSMSPassword

// 直接从 PLSQL developer IDE 中竖排展示行后粘贴出来，替换 tab 为 ": "
const bind = `
SMS_NOTICE_ID: TO_NUMBER(uop_crm1.f_sys_getseqid('0022','seq_smssend_id'))
EPARCHY_CODE: '0022'
IN_MODE_CODE: '0'
SMS_CHANNEL_CODE: '11'
SEND_OBJECT_CODE: 3
SEND_TIME_CODE: 10
RECV_OBJECT_TYPE: '00'
RECV_OBJECT: :RECV_OBJECT
ID: 0
SMS_TYPE_CODE: '10'
SMS_KIND_CODE: '05'
NOTICE_CONTENT_TYPE: '0'
NOTICE_CONTENT: :NOTICE_CONTENT
FORCE_REFER_COUNT: 1
REFER_TIME: :REFER_TIME
REFER_STAFF_ID: 'TEST0032'
REFER_DEPART_ID: '10501'
DEAL_TIME: :DEAL_TIME
DEAL_STATE: '0'
REMARK: '互联网账单推送访问OTP密码短信校验码。'
REVC2: '30'
MONTH: :MONTH
`;
let colnames = [];
let colvalues = [];
bind.split('\n').slice(1, -1).forEach((line, i) => {
  const nv = line.split(': ');
  colnames.push(nv[0]);
  colvalues.push(nv[1]);
  console.log(nv);
});
colnames = colnames.join(',');
colvalues = colvalues.join(',');
const SQL = `insert into ucr_crm1.ti_o_sms(${colnames}) values (${colvalues})`;
console.log(SQL);

exports.service = function* sendSMSPassword(next) {
  const c = yield oracledb.getConnection('sms');
  c.module = 'internet-bill-push';

  // 先尝试下能查询访问吗
  const result = yield c.execute(`
    SELECT * FROM ucr_crm1.ti_o_sms a WHERE a.recv_object = :1`, [
      '17612283505',
    ]);
  this.body = result.rows;

  // 插入
  if (1) {
    const result = yield c.execute(SQL, {
      RECV_OBJECT: '15620001781',
      NOTICE_CONTENT: 'OTP test',
      REFER_TIME: '2017-06-30 16:21:27',
      DEAL_TIME: '2017-06-30 16:21:27',
      MONTH: 6,
    });
    yield c.commit();
    this.body = result;
  }

  yield c.close();
  yield next;
};
