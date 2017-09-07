const oracledb = require('oracledb');

oracledb.fetchAsString = [oracledb.DATE, oracledb.NUMBER];
oracledb.outFormat = oracledb.OBJECT;
global.oracledb = oracledb;

const co = require('co');
const cfg = require('../db.cfg.js');

/*
ORA-24413: Invalid number of sessions specified
Cause: An invalid combination of minimum, maximum and increment number of sessions was specified in the OCISessionPoolCreate call.
*/

function createBillPool() {
  return oracledb.createPool({
    user: cfg.bill.user,
    password: cfg.bill.password,
    connectString: cfg.bill.connectString,
    poolMax: 10, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
    poolMin: 10, // start with no connections; let the pool shrink completely
    poolIncrement: 0, // only grow the pool by one connection at a time
    poolTimeout: 600, // terminate connections that are idle in the pool for 60 seconds
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

/* log stats example
Pool statistics:
...total up time (milliseconds): 7145
...total connection requests: 1
...total requests enqueued: 0
...total requests dequeued: 0
...total requests failed: 0
...total request timeouts: 0
...max queue length: 0
...sum of time in queue (milliseconds): 0
...min time in queue (milliseconds): 0
...max time in queue (milliseconds): 0
...avg time in queue (milliseconds): 0
...pool connections in use: 1
...pool connections open: 10
Related pool attributes:
...poolAlias: bill
...queueRequests: true
...queueTimeout (milliseconds): 3000
...poolMin: 10
...poolMax: 10
...poolIncrement: 0
...poolTimeout (seconds): 600
...poolPingInterval: 59
...stmtCacheSize: 2
Related environment variables:
...process.env.UV_THREADPOOL_SIZE: 15
*/

global.getConn = async (dbAlias, txFunc) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbAlias);
    conn.module = 'internet-bill-push';
  } catch (e) {
    console.error(new Date(), 'getConnection exception');
    console.error(e);
    const pool = oracledb.getPool(dbAlias);
    console.error(`pool ${dbAlias} has ${pool.connectionsInUse} connectionsInUse & ${pool.connectionsOpen} connectionsOpen`);
    pool._logStats();
    return;
  }

  try {
    await txFunc(conn);
    await conn.commit();
  } catch (e) {
    console.error(new Date(), 'do transaction exception');
    console.error(e);
    await conn.rollback();
  } finally {
    await conn.close();
  }
};
