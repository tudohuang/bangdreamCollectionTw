-- 活動關聯到樂團時，Sheet 可以再指定一個角色：「Pastel＊Palettes／白鷺千聖」。
--
-- 這是 db:export 的對帳抓出來的：28 筆活動倒回來之後角色不見了，
-- 因為 event_band 只存了樂團。而那個角色不是裝飾 —— 它就是
-- 「這一場是千聖個人的，不是整團的」這件事本身。少了它，
-- 本體／個人的分野在資料庫裡就重建不出來。
--
-- 放在 event_band 而不是 appearance：它描述的是「這一場與這個團的關係」，
-- 不是「某個人出演了什麼」。同一場可以關聯兩個團、各自帶一個角色。

ALTER TABLE event_band ADD COLUMN role_name text;

COMMENT ON COLUMN event_band.role_name IS
  'Sheet 的「團體／關聯」欄在「／」後面的角色名，例如「白鷺千聖」。整團的場次留 NULL。';

-- 空字串與 NULL 混用會讓查詢變成兩種寫法都要顧，直接擋掉
ALTER TABLE event_band ADD CONSTRAINT event_band_role_not_blank
  CHECK (role_name IS NULL OR btrim(role_name) <> '');
