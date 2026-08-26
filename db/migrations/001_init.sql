-- 邦邦來台圖鑑：初始 schema
--
-- 設計原則
--   1. 代理鍵與展示編號分開。這不是潔癖 —— 2026-08 在 Sheet 中間插了一列，
--      編號整批位移，綁編號的心得檔全部對到別場活動。展示用的號碼會變，
--      被別的東西參照的鍵不能變。
--   2. 約束寫在資料庫裡，不是寫在應用程式裡。應用程式會有很多支，
--      資料庫只有一個，它是最後一道防線。
--   3. 每張表都留 source 註記，之後要追「這筆是誰寫的、從哪來的」才有依據。

-- ---------------------------------------------------------------- 型別
-- 「本體／擦邊」兩分法不夠用：同一位聲優可能是自己的個人 LIVE，
-- 也可能只是去別的作品站台，全部算「擦邊」會讓樂團的出現次數虛胖。
CREATE TYPE relation_tier AS ENUM ('official', 'strong', 'weak');

-- 這一筆的關聯程度是人工確認的，還是程式依規則推的。
-- 統計要能講「其中 N 筆是推論的」，可信度才守得住。
CREATE TYPE provenance AS ENUM ('sheet', 'inferred');

CREATE TYPE urgency AS ENUM ('normal', 'critical');

-- ---------------------------------------------------------------- 維度
CREATE TABLE person (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  -- 名字會有異體字（上坂堇／上坂菫）與羅馬拼音，正規化後的形式才適合當唯一鍵
  name_norm     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_name_norm_key UNIQUE (name_norm),
  CONSTRAINT person_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE band (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  name_norm     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT band_name_norm_key UNIQUE (name_norm)
);

-- 名冊：誰屬於哪個團。以「名冊」分頁為準，不從活動反推 ——
-- 聯合場次一列塞十個人，反推會把同台的團全算到每個人頭上。
CREATE TABLE band_member (
  band_id       bigint NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  person_id     bigint NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  role_name     text,                       -- 飾演的角色，例如「戶山香澄」
  PRIMARY KEY (band_id, person_id)
);

CREATE TABLE venue (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  name_norm     text NOT NULL,
  city          text,
  lat           double precision,
  lng           double precision,
  CONSTRAINT venue_name_norm_key UNIQUE (name_norm),
  -- 座標要嘛兩個都有，要嘛兩個都沒有；只有一個是資料錯誤
  CONSTRAINT venue_latlng_together CHECK ((lat IS NULL) = (lng IS NULL)),
  CONSTRAINT venue_lat_range CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  CONSTRAINT venue_lng_range CHECK (lng IS NULL OR lng BETWEEN -180 AND 180)
);

-- 同一個場館的別名。「南港展覽館一館」與「台北南港展覽館一館 4 樓」是同一個地方，
-- 不合併的話場館統計會拆成兩筆。
CREATE TABLE venue_alias (
  alias_norm    text PRIMARY KEY,
  venue_id      bigint NOT NULL REFERENCES venue(id) ON DELETE CASCADE
);

CREATE TABLE organizer (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  name_norm     text NOT NULL,
  CONSTRAINT organizer_name_norm_key UNIQUE (name_norm)
);

-- ---------------------------------------------------------------- 事實
CREATE TABLE event (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- 永久鍵：照片、心得檔名、打卡備份碼、分享網址都綁它，給了就不能再變
  stable_id     integer NOT NULL,
  -- 展示用的圖鑑編號 #042，可以隨時重排
  display_no    integer NOT NULL,
  title         text NOT NULL,
  starts_on     date,
  ends_on       date,
  venue_id      bigint REFERENCES venue(id) ON DELETE SET NULL,
  tier          relation_tier NOT NULL DEFAULT 'weak',
  tier_source   provenance NOT NULL DEFAULT 'inferred',
  urgency       urgency NOT NULL DEFAULT 'normal',
  is_full_band  boolean NOT NULL DEFAULT false,
  -- 這一筆實際有幾場演出。留空代表還沒逐筆確認，統計時用天數推。
  sessions      smallint,
  ticket_on     date,
  cover_url     text,
  description   text,
  one_line      text,
  impression    text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT event_stable_id_key UNIQUE (stable_id),
  CONSTRAINT event_display_no_key UNIQUE (display_no),
  CONSTRAINT event_title_not_blank CHECK (btrim(title) <> ''),
  -- 結束不能早於開始。這種錯打字就會發生，讓資料庫擋掉
  CONSTRAINT event_dates_ordered CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
  CONSTRAINT event_sessions_positive CHECK (sessions IS NULL OR sessions > 0),
  -- 開賣日不該晚於演出日
  CONSTRAINT event_ticket_before_show CHECK (ticket_on IS NULL OR starts_on IS NULL OR ticket_on <= starts_on)
);

-- 由日期算出來的欄位。存成 generated 而不是每次查再算，
-- 這樣才建得了索引，年份／月份的篩選也不用寫函式。
ALTER TABLE event
  ADD COLUMN year  integer GENERATED ALWAYS AS (EXTRACT(YEAR  FROM starts_on)::int) STORED,
  ADD COLUMN month integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM starts_on)::int) STORED;

-- 陣容：帶屬性的多對多。一場最多 10 人，一人最多 8 場。
CREATE TABLE appearance (
  event_id      bigint NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  person_id     bigint NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  -- 這場是以哪個團的身分出演；個人來台時為 NULL
  as_band_id    bigint REFERENCES band(id) ON DELETE SET NULL,
  PRIMARY KEY (event_id, person_id)   -- 同一場不會出現同一個人兩次
);

-- 活動關聯到的樂團。跟 appearance 分開，因為「Roselia 出現在這場」
-- 與「某位 Roselia 成員來了」是兩件事 —— 混在一起就是樂團虛胖的來源。
CREATE TABLE event_band (
  event_id      bigint NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  band_id       bigint NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, band_id)
);

CREATE TABLE event_organizer (
  event_id      bigint NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  organizer_id  bigint NOT NULL REFERENCES organizer(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, organizer_id)
);

CREATE TABLE event_source (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id      bigint NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  url           text NOT NULL,
  CONSTRAINT event_source_unique UNIQUE (event_id, url)
);

-- 更新日誌：每次同步 Sheet 的異動。這是站上「最近公布了誰」的唯一來源，
-- 因為 Sheet 本身不記「什麼時候被加進來」。
CREATE TABLE event_change (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id      bigint NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  changed_on    date NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('added', 'changed')),
  fields        text[] NOT NULL DEFAULT '{}',
  CONSTRAINT event_change_unique UNIQUE (event_id, changed_on, kind)
);

-- ---------------------------------------------------------------- 索引
-- 這些是實際會被查的路徑：依年份看、依人看、依團看、依日期排。
CREATE INDEX event_year_idx        ON event (year);
CREATE INDEX event_starts_on_idx   ON event (starts_on);
CREATE INDEX event_tier_idx        ON event (tier);
CREATE INDEX appearance_person_idx ON appearance (person_id);
CREATE INDEX event_band_band_idx   ON event_band (band_id);
CREATE INDEX event_change_date_idx ON event_change (changed_on DESC);
