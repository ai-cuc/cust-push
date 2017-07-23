// import { format, compareAsc } from 'date-fns/esm';


const req1 = {
  method: 'ecaop.trades.query.comm.flow.qry',
  msg: {
    busiType: '01', // 01手机流量，02上网卡流量
    qryMonth: '201706',
    number: '15620001781',
  },
};

const req2 = {
  method: 'ecaop.trades.query.resi.snres.qry',
  msg: {
    authAcctId: '02227277121',
    serialNumber: '02227277121',
  },
};

/* in /ngbss/preorder/nginx/conf/nginx.conf
location / aoptest {
  proxy_pass http: //132.35.81.217:8000/aop/test;
  #proxy_pass http: //132.35.88.104/aop/aopservlet;
}
*/

// method: 'ecaop.trades.query.resi.snres.qry', // open api接口名称, 见业务api说明文档
// bizkey: 'TS-MI-001', // 业务编码,具体参考业务规范

// method: 'ecaop.trades.query.comm.brdband.check',
// bizkey: 'TS-KD-001',

const AOP = require('./AOP.js');

const aopTest = AOP('http://132.176.9.109:18003/aoptest');
const aopProd = AOP('http://132.35.88.104/aop/aopservlet');
aopTest(req1);

const sampleResp = {
  chargeFlow: '3145728',
  otherFlow: '3335476',
  otherRemFlow: '11534336',
  otherUseFlow: '3145728',
  overtopFlow: '0',
  setTotalFlow: '11534336',
  setTotalRemainFlow: '8388608',
  setTotalUseFlag: '0',
  setTotalUseFlow: '3145728',
  totalFlow: '3335476',
};

const sample15620001781 = {
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
};
