/*
UCR_ODS_QURY/H_x3v1@132.176.9.13:1521/ngods
select * from ucr_act_kafka.ts_b_bill;
rsync -av kafka.js injectjs@132.176.9.109:oradb
*/

const co = require('co');
const oracledb = require('oracledb');

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

co(function* () {
  const pool = yield oracledb.createPool({
    user: 'UCR_ODS_QURY',
    password: 'H_x3v1',
    connectString_: '132.176.9.13:1521/ngods',
    connectString: '127.0.0.1:17613/ngods',
    poolMax: 4, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
    poolMin: 3, // start with no connections; let the pool shrink completely
    poolIncrement: 1, // only grow the pool by one connection at a time
    poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
    poolPingInterval: 60, // check aliveness of connection if in the pool for 60 seconds
    queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
    queueTimeout: 60000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
    poolAlias: 'myalias', // could set an alias to allow access to the pool via a name.
    stmtCacheSize: 0, // number of statements that are cached in the statement cache of each connection
  });

  const connection = yield pool.getConnection();
  console.log('connected to oracle database');
  connection.clientId = 'push-bill';
  connection.module = 'oracledb-test';
  connection.action = 'test';
  let result;
  try {
    result = yield connection.execute('select * from ucr_act_kafka.ts_b_bill where rownum <= :n', [1], {
      outFormat: oracledb.OBJECT,
    });
    // printResult(result);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e) {
    console.error(e);
  }

  yield new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  yield connection.close();
});

process
  .on('SIGTERM', () => {
    console.log('\nTerminating');
    process.exit(0);
  })
  .on('SIGINT', () => {
    console.log('\nTerminating');
    process.exit(0);
  });
