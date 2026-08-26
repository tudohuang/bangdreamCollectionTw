-- 統計口徑：一筆紀錄不等於一場演出，也不等於一個活動日。
-- 場次的推算規則封在 event_sessions view 裡，SQL 與 JS 共用同一份定義。
SELECT
  (SELECT count(*) FROM event)                          AS 活動紀錄,
  (SELECT count(*) FROM event_sessions WHERE days > 1)  AS 跨日筆數,
  (SELECT count(DISTINCT d)
     FROM event e,
          generate_series(e.starts_on, coalesce(e.ends_on, e.starts_on), interval '1 day') AS d
    WHERE e.starts_on IS NOT NULL)                      AS 活動日,
  (SELECT sum(sessions) FROM event_sessions)            AS 推估場次;
