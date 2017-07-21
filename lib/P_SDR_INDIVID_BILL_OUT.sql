CREATE OR REPLACE PROCEDURE P_SDR_INDIVID_BILL_OUT(v_serial_number  IN ucr_act_kafka.tf_f_user.serial_number%TYPE,
                                                   v_cycle_id       IN VARCHAR2,

                                              v_cur OUT pk_sd_query.gv_sdqueryshort_syscur, --查询结果集
                                              v_cur1 OUT sys_refcursor, --查询结果集
                                              --------------------以下为必须输出组-----------------------------------
                                              v_resultcode    OUT NUMBER, --错误编号
                                              v_resulterrinfo OUT VARCHAR2 --错误信息
                                              )

  ----------------------------------------------------------------------
  --Procedure:        P_SDR_INDIVID_BILL_OUT
  --Description:      查询个性化账单
  --Title:
  --Author:           liuxy
  --Date:             2017-07-04
  ----------------------------------------------------------------------
 IS
  iv_report_id   VARCHAR2(20);

  vr_user        ucr_act_kafka.tf_f_user%ROWTYPE;
  vr_acct        ucr_act_kafka.tf_f_account%ROWTYPE;
  vr_pay         ucr_act_kafka.tf_f_payrelation%ROWTYPE;

BEGIN
  v_resultcode    := -1;
  v_resulterrinfo := 'P_SDR_INDIVID_BILL_OUT BEGINS!';


  BEGIN

    SELECT *
      INTO vr_user
      FROM ucr_act_kafka.tf_f_user a
     WHERE serial_number = v_serial_number
       AND remove_tag IN ('0', '8');

    EXCEPTION
        WHEN OTHERS THEN
            v_resulterrinfo         := v_serial_number || ':没有找到资料.';
            RETURN;
    END;

    --付费关系判断
    BEGIN
        IF vr_user.Remove_Tag = '0' THEN
            SELECT *
              INTO vr_pay
              FROM ucr_act_kafka.tf_f_payrelation
             WHERE user_id = vr_user.user_id
               AND partition_id = vr_user.partition_id
               AND act_Tag = '1'
               AND default_tag = '1'
               AND v_cycle_id BETWEEN start_cyc_id AND end_cyc_id;
        ELSE
            SELECT *
              INTO vr_pay
              FROM (SELECT *
                       FROM ucr_act_kafka.tf_f_payrelation
                      WHERE user_id = vr_user.user_id
                        AND partition_id = vr_user.partition_id
                        AND act_Tag = '1'
                        AND default_tag = '1'
                      ORDER BY end_cyc_id DESC)
             WHERE rownum = 1;
        END IF;

        SELECT *
          INTO vr_acct
          FROM ucr_act_kafka.tf_f_account
         WHERE acct_id = vr_pay.acct_id
           AND partition_id = MOD(vr_pay.acct_id, 10000);

    EXCEPTION
        WHEN OTHERS THEN
            v_resulterrinfo         := vr_user.Serial_Number || ':取付费关系出错.';
            RETURN;
    END;

    INSERT INTO TM_R_individ_bill
    (serial_number,pay_name,note_name, item_name, fee, a_discnt, writeoff_fee1, sj_fee, fee_ys)
    SELECT CASE WHEN serial_number IS NULL AND pay_name IS NULL THEN '合计：' ELSE serial_number END serial_number,
           pay_name,
           CASE WHEN serial_number IS NOT NULL AND pay_name IS NULL THEN '小计：' ELSE note_name END note_name,
           item_name,
                        CASE WHEN SUM(p.fee) < 1 AND SUM(p.fee) > -1 THEN TO_CHAR(SUM(p.fee), '0.00') ELSE TO_CHAR(SUM(p.fee)) END fee,
                        CASE WHEN SUM(p.a_discnt) < 1 AND SUM(p.a_discnt) > -1 THEN TO_CHAR(SUM(p.a_discnt), '0.00') ELSE TO_CHAR(SUM(p.a_discnt)) END a_discnt,
                        CASE WHEN SUM(p.writeoff_fee1) < 1 AND SUM(p.writeoff_fee1) > -1 THEN TO_CHAR(SUM(p.writeoff_fee1), '0.00') ELSE TO_CHAR(SUM(p.writeoff_fee1)) END writeoff_fee1,
                        CASE WHEN SUM(p.sj_fee) < 1 AND SUM(p.sj_fee) > -1 THEN TO_CHAR(SUM(p.sj_fee), '0.00') ELSE TO_CHAR(SUM(p.sj_fee)) END sj_fee,
                        CASE WHEN SUM(p.fee_ys) < 1 AND SUM(p.fee_ys) > -1 THEN TO_CHAR(SUM(p.fee_ys), '0.00') ELSE TO_CHAR(SUM(p.fee_ys)) END fee_ys FROM (
                        SELECT a.cycle_id,a.serial_number,c.pay_name,(SELECT t.note_item
                            from ucr_act_kafka.td_b_noteitem t
                           WHERE t.rule_id = 76500002
                             AND t.parent_item_code = '-1'
                         connect by prior t.parent_item_code = t.note_item_code
                           AND t.rule_id = 76500002
                     start WITH t.note_item_code = a.integrate_item_code
                            AND t.rule_id = 76500002) note_name,NVL((SELECT t.note_item
                            from ucr_act_kafka.td_b_noteitem t
                           WHERE t.rule_id = 76500002
                             AND t.parent_item_code = '1001'
                         connect by prior t.parent_item_code = t.note_item_code
                           AND t.rule_id = 76500002
                     start WITH t.note_item_code = a.integrate_item_code
                            AND t.rule_id = 76500002),b.item_name) item_name,
                             ( NVL(a.fee,0) + NVL(a.adjust_before,0) + NVL(a.writeoff_fee1,0) + NVL(a.a_discnt,0) ) / 100 fee,NVL(a.adjust_before,0) / 100 adjust_before,NVL(a.a_discnt,0) / 100 a_discnt,NVL(a.writeoff_fee1,0) / 100 writeoff_fee1,
                             NVL(a.fee,0) / 100 sj_fee,NVL(a.adjust_after,0) / 100 adjust_after, NVL((a.fee - a.balance),0) / 100 fee_ys,NVL(a.balance,0) / 100 balance,NVL(a.late_fee,0) / 100 late_fee,NVL((a.late_fee - a.late_balance),0) / 100 late_fee1
                  FROM ucr_act_kafka.ts_b_bill a,ucr_act_kafka.td_b_detailitem b,ucr_act_kafka.tf_f_account c
                 WHERE a.integrate_item_code = b.item_id
                   AND a.acct_id = vr_pay.acct_id
                   AND a.acct_id = c.acct_id
                   AND a.cycle_id = v_cycle_id) p GROUP BY GROUPING SETS((serial_number,pay_name,note_name,item_name),(serial_number),()) ORDER BY serial_number,pay_name;

     OPEN v_cur FOR
     SELECT t.serial_number f1,t.pay_name f2,t.note_name f3,t.item_name f4,'' f5,
            '' f6,'' f7,'' f8,'' f9,'' f10,
            t.fee f11,t.a_discnt f12,t.writeoff_fee1 f13,t.sj_fee f14,t.fee_ys f15,
            0 f16,0 f17,0 f18,0 f19,0 f20 FROM TM_R_individ_bill t;

     OPEN v_cur1 FOR
     SELECT t.serial_number,
     '套餐标准',sum(t.fee) as standard_fee,
     '享受折扣',round(sum(t.a_discnt)/sum(t.fee),2) *100 as discnt_rate,
     '折扣优惠',sum(t.a_discnt) as discnt_fee,
     '赠款',sum(t.writeoff_fee1) as writeoff_fee,
     '实际收款',sum(t.sj_fee) as sj_fee
       FROM TM_R_individ_bill t
      where t.serial_number = v_serial_number
        and t.note_name = '月固定费'
       group by t.serial_number;


  v_resultcode    := 0;
  v_resulterrinfo := 'TRADE OK!';

EXCEPTION
  WHEN OTHERS THEN
    v_resulterrinfo := 'P_SDR_INDIVID_BILL_OUT ERR@' || SQLERRM;
    RETURN;
END;
