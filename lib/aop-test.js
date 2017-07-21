// import { format, compareAsc } from 'date-fns/esm';

const dateFns = require('date-fns');
const axios = require('axios');
const {
  URLSearchParams,
} = require('url');
const querystring = require('querystring');

const payload = 'appkey=tjpre.sub&method=ecaop.trades.query.resi.snres.qry&&apptx=1&&bizkey=TS-MI-001&timestamp=2017-07-21 16:54:00&msg={}';

function pack(data) {
  console.log(JSON.stringify(data, null, 2));
  data.msg = JSON.stringify(data.msg);

  console.log(1, querystring.stringify(data));
  const params = new URLSearchParams(data);
  console.log(2, params.toString());

  return querystring.stringify(data);
  // return params.toString();
}

axios({
  method: 'POST',
  url: 'http://132.176.9.109:18003/aoptest',
  // url: 'http://132.35.88.104/aop/aopservlet',
  responseType: 'json',
  data: {
    appkey: 'tjpre.sub', // 接入放标识, EC-AOP分配给应用的appkey。
    // sign: undefined, // API输入参数签名结果，签名方式(MD5或HMAC)由EC-AOP在分配应用时指定。
    apptx: Date.now().toString(), // 请求方流水号,由请求方生成
    timestamp: dateFns.format(new Date(), 'YYYY-MM-DD HH:mm:ss'), // '2017-07-21 16:07:00',

    // method: 'ecaop.trades.query.resi.snres.qry', // open api接口名称, 见业务api说明文档
    // bizkey: 'TS-MI-001', // 业务编码,具体参考业务规范
    method: 'ecaop.trades.query.comm.brdband.check',
    bizkey: 'TS-KD-001',

    msg: {
      // 以下为各个请求基本固定的参数项目
      province: 'TJ',
      city: 'TJ',
      district: '',
      channelType: '',
      operatorId: '',
      channelId: '',
      opeSysType: 2, // 办理业务系统： 1： ESS 2： CBSS（ 北六省） 3： CBSS（ 南25省）

      // 以下为各个请求特定的参数
      authAcctId: '02227277121',
      serialNumber: '02227277121',
    },
  },
  transformRequest: [pack],
}).then((response) => {
  console.log(response);
  // response.data.pipe(fs.createWriteStream('ada_lovelace.jpg'));
}).catch((e) => {
  console.error(e.response.config);
  console.error(e.response.data);
});
