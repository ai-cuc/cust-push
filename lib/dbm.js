const oracledb = require('oracledb');

process.env.UV_THREADPOOL_SIZE = 10;
oracledb.fetchAsString = [oracledb.DATE];
oracledb.outFormat = oracledb.OBJECT;
global.oracledb = oracledb;

const co = require('co');

co(async () => {
  try {
    await oracledb.createPool({
      user: 'UCR_STA_kafka',
      password: 'P_ks6zcd',
      // ssh -fN -L '*:17613:132.176.9.13:1521' injectjs@132.175.9.117
      // 卡夫卡 UCR_ODS_QURY/H_x3v1@192.168.31.215:17613/ngods
      // 卡夫卡 UCR_STA_kafka/P_ks6zcd@192.168.31.215:17613/ngods
      connectString: '192.168.31.215:17613/ngods',
      poolMax: 6, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      poolMin: 4, // start with no connections; let the pool shrink completely
      poolIncrement: 1, // only grow the pool by one connection at a time
      poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      poolPingInterval: 60, // check aliveness of connection if in the pool for 60 seconds
      queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
      queueTimeout: 1000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
      poolAlias: 'bill', // could set an alias to allow access to the pool via a name.
      stmtCacheSize: 2, // number of statements that are cached in the statement cache of each connection
      _enableStats: true, // default is false
    });
    console.log('database connected (bill)');
  } catch (e) {
    console.error(e);
  }

  await oracledb.createPool({
    user: 'UCR_UNP',
    password: 'Ucr_unp%2015',
    // ssh -fN -L '*:17514:132.175.9.14:1521' injectjs@132.175.9.117
    connectString: '192.168.31.215:17514/ngcrm2',
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
  console.log('database connected (sms)');
});

global.getConn = async (dbAlias, txFunc) => {
  const conn = await oracledb.getConnection(dbAlias);
  conn.module = 'internet-bill-push';
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
