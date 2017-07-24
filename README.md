# 客户账单推送系统

## 功能描述

由其他系统定期向用户发送短信，提供查看该号码上月账单的 url(带有校验码)，
用户打开连接可以看到账单报表。

## url 格式和安全要求

http://${HOST}/bill/${融合业务主手机号码}/${账期}/${校验码}，    
如：    
http://bill.tj.10010.com/bill/15620001781/201706/49BAF1E913E08F937B5E6B27F590E6D3DD98EBE5

oracle 存储过程计算 url 校验码，使用 DBMS_CRYPTO 的 SHA-1 算法计算哈希值，
[参考](http://docs.oracle.com/cd/B19306_01/appdev.102/b14258/d_crypto.htm#i1005082)

注：Data of type VARCHAR2 must be converted to RAW before you can use DBMS_CRYPTO functions to encrypt it.

```plsql
declare
  r raw(1024);
begin
  r := DBMS_CRYPTO.MAC(
   src => UTL_I18N.STRING_TO_RAW ('15620001781.201706'),
   typ => DBMS_CRYPTO.HMAC_SH1,
   key => hextoraw('00112233445566778899aabbccddeeff'));
  dbms_output.put_line(rawtohex(r));
  dbms_output.put_line('http://60.28.151.82:3003/bill/15620001781/201706/' || rawtohex(r));
end;
```

其中校验码是 hmac(serial_number.cycle_id, key) 的结果

系统接收到恶心窥探的 url 时，校验码若不是系统生成，可以检测出来，并且报告 400 "bad request"

## 前后端架构

整体架构保持尽量简单，无会话，无页面流转，无独立部署的数据服务层

* 浏览器侧：像收到彩信或邮件一样，浏览器访问 url 直接得到一个渲染好的页面，不需要带有脚本，尽量内置 css，这样响应比较快
* web应用服务层：保持数据库链接，控制并发；从存储过程获取数据，带入模板进行服务端渲染；提供url校验码检查
* 数据服务层：为了保持架构简单，直接使用存储过程提供数据源，存储过程另外安排人员提供
