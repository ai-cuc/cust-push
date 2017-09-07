const oracledb = require('oracledb');

process.env.UV_THREADPOOL_SIZE = 10;
oracledb.fetchAsString = [oracledb.DATE, oracledb.NUMBER];
oracledb.outFormat = oracledb.OBJECT;
global.oracledb = oracledb;

const co = require('co');
const cfg = require('../db.cfg.js');

function createBillPool() {
  return oracledb.createPool({
    user: cfg.bill.user,
    password: cfg.bill.password,
    connectString: cfg.bill.connectString,
    poolMax: 20, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
    poolMin: 10, // start with no connections; let the pool shrink completely
    poolIncrement: 1, // only grow the pool by one connection at a time
    poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
    poolPingInterval: 59, // check aliveness of connection if in the pool for 60 seconds
    queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
    queueTimeout: 3000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
    poolAlias: 'bill', // could set an alias to allow access to the pool via a name.
    stmtCacheSize: 2, // number of statements that are cached in the statement cache of each connection
    _enableStats: true, // default is false
  });
}
const bill = createBillPool();
// setInterval(createBillPool, 10 * 1000); 试验是否能重复创建连接池
co(async () => {
  try {
    await bill;
    console.log('database connected (bill)');
  } catch (e) {
    console.error(e);
  }
});

function createSms() {
  return oracledb.createPool({
    user: cfg.sms.user,
    password: cfg.sms.password,
    connectString: cfg.sms.connectString,
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
}

global.getConn = async (dbAlias, txFunc) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbAlias);
    conn.module = 'internet-bill-push';
  } catch (e) {
    console.log(new Date());
    console.log(e);
  }

  try {
    await txFunc(conn);
    await conn.commit();
  } catch (e) {
    console.log(e);
    await conn.rollback();
  } finally {
    await conn.close();
  }
};
