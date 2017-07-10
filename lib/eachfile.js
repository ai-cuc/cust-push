/* global cd:true, find:true */
/* eslint-disable import/no-dynamic-require */

require('shelljs/global');

const path = require('path');

cd(path.join(__dirname, '../services'));

module.exports = function eachServices() {
  return function (cb) {
    find('.')
      .filter(f => f.match(/\.js$/))
      .forEach((f) => {
        const m = require(`../services/${f}`);
        const path = `/${f.replace(/\.js$/, '')}`;
        if (typeof m !== 'object' || m.exclude) {
          return; // 老的 module.exports = function *(next) 写法，不予处理
        }
        // path 必须一致
        if (!m.use && path !== m.path) {
          console.error(path, m.path);
          throw new Error(`${path} 没有 path 或和文件路径不一致`);
        }
        cb(f, path, m);
      });
  };
};
