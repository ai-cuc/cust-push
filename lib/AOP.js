const dateFns = require('date-fns');
const axios = require('axios');
const querystring = require('querystring');

const loginInfo = {
  // 以下为各个请求基本固定的参数项目
  province: '13',
  city: '130',
  district: '022',
  channelType: 'woesale',
  operatorId: 'LTHXY130',
  channelId: '123',
  opeSysType: 2, // 办理业务系统： 1： ESS 2： CBSS（ 北六省） 3： CBSS（ 南25省）
};

function AOP(url) {
  function pack(data) {
    console.log(JSON.stringify(data, null, 2));
    data.msg = JSON.stringify(data.msg);
    console.log(`curl ${url} -vv -d '${querystring.stringify(data)}'`);
    return querystring.stringify(data);
  }

  const instance = axios.create({
    timeout: 1000, // 超时就放弃了
  });

  return function call(req) {
    // const beginTime = Date.now();
    return instance({
      method: 'POST',
      url,
      responseType: 'json',
      data: {
        appkey: 'tjpre.sub', // 接入放标识, EC-AOP分配给应用的appkey。
        // sign: undefined, // API输入参数签名结果，签名方式(MD5或HMAC)由EC-AOP在分配应用时指定。
        apptx: Date.now().toString(), // 请求方流水号,由请求方生成
        timestamp: dateFns.format(new Date(), 'YYYY-MM-DD HH:mm:ss'), // '2017-07-21 16:07:00',
        method: req.method,
        // bizkey: req.bizkey,
        msg: Object.assign({}, loginInfo, req.msg),
      },
      transformRequest: [pack],
      // validateStatus: status => (status >= 200 && status < 300), // default
      validateStatus: () => true,
    }).then((response) => {
      // console.log('time(ms)', Date.now() - beginTime, response.status);
      if (response.data.code) { // 响应码报错，升起异常
        throw response.data;
      }
      return response.data;
    }).catch((e) => {
      // console.error(e.response.config);
      // console.error(e.response.data);
      console.error(e);
      throw e;
    });
  };
}

const aopUrl = {
  development: 'http://132.176.9.109:18003/aoptest',
  production: 'http://132.35.88.104/aop/aopservlet',
}[process.env.NODE_ENV || 'development'];

global.aopCall = AOP(aopUrl);

module.exports = AOP;
