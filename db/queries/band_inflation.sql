-- 樂團虛胖：被列在活動上 ≠ 這個團本體來過。
--
-- 這是這份資料最容易被誤讀的地方。成員以個人身分來台時，
-- 活動仍會標註她所屬的團，所以「出現次數」跟「本體來台次數」是兩件事。
SELECT
  b.name                                                   AS 樂團,
  count(*)                                                 AS 出現筆數,
  count(*) FILTER (WHERE e.tier = 'official')              AS 本體,
  count(*) FILTER (WHERE e.tier <> 'official')             AS 非本體,
  round(100.0 * count(*) FILTER (WHERE e.tier = 'official') / count(*), 0) AS 本體佔比
FROM event_band eb
JOIN band  b ON b.id = eb.band_id
JOIN event e ON e.id = eb.event_id
GROUP BY b.name
HAVING count(*) >= 3
ORDER BY 本體佔比 ASC, 出現筆數 DESC;
