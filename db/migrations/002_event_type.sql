-- 活動類型。
--
-- 漏掉這張表的代價在第一次交叉驗證就出現了：SQL 算出 83 場、JS 算出 67 場。
-- 差別在「快閃店」開十天算一場、不是十場，而少了類型就判斷不出來。
--
-- 一場活動可以同時是多種類型（「EXPO／Talk／手渡／上映會」），
-- 所以是多對多，不是一個欄位。

CREATE TABLE event_type (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  name_norm  text NOT NULL,
  -- 期間型：這種活動是一段時間而不是一場演出，跨很多天也只算一場
  is_span    boolean NOT NULL DEFAULT false,
  CONSTRAINT event_type_name_norm_key UNIQUE (name_norm)
);

CREATE TABLE event_event_type (
  event_id       bigint NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  event_type_id  bigint NOT NULL REFERENCES event_type(id) ON DELETE CASCADE,
  -- 第一個類型是主要類型（「EXPO／Talk」的 EXPO），排序用
  position       smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, event_type_id)
);

CREATE INDEX event_event_type_type_idx ON event_event_type (event_type_id);

-- 場次的推算規則寫成 view，讓 SQL 與 JS 有同一份定義可以對。
CREATE VIEW event_sessions AS
SELECT
  e.id,
  e.stable_id,
  (coalesce(e.ends_on, e.starts_on) - e.starts_on + 1)::int AS days,
  EXISTS (
    SELECT 1 FROM event_event_type eet
    JOIN event_type t ON t.id = eet.event_type_id
    WHERE eet.event_id = e.id AND t.is_span
  ) AS is_span,
  CASE
    WHEN e.sessions IS NOT NULL THEN e.sessions
    WHEN EXISTS (
      SELECT 1 FROM event_event_type eet
      JOIN event_type t ON t.id = eet.event_type_id
      WHERE eet.event_id = e.id AND t.is_span
    ) THEN 1
    ELSE greatest(1, (coalesce(e.ends_on, e.starts_on) - e.starts_on + 1)::int)
  END AS sessions
FROM event e
WHERE e.starts_on IS NOT NULL;
