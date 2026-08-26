-- 最常出現的人，以及那些次數其實是什麼。
SELECT
  p.name                                       AS 人物,
  count(*)                                     AS 筆數,
  count(*) FILTER (WHERE e.tier = 'official')  AS 官方本體,
  count(*) FILTER (WHERE e.tier = 'strong')    AS 強關聯,
  count(*) FILTER (WHERE e.tier = 'weak')      AS 弱關聯,
  min(e.year)                                  AS 首次,
  max(e.year)                                  AS 最近
FROM appearance a
JOIN person p ON p.id = a.person_id
JOIN event  e ON e.id = a.event_id
GROUP BY p.name
ORDER BY 筆數 DESC, 人物
LIMIT 8;
