-- Run this in your Supabase SQL editor to create the token storage table.
CREATE TABLE IF NOT EXISTS user_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT        NOT NULL UNIQUE,
  encrypted_token TEXT    NOT NULL,
  iv          TEXT        NOT NULL,
  auth_tag    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Optional: auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION update_user_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_user_tokens_updated_at();
