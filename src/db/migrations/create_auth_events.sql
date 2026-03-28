CREATE TABLE IF NOT EXISTS auth_events (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT        NOT NULL, -- 'login_success' | 'login_fail' | 'logout'
  user_id    TEXT,                 -- NULL for login_fail (user not yet known)
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_events_user_id_idx ON auth_events (user_id);
CREATE INDEX IF NOT EXISTS auth_events_created_at_idx ON auth_events (created_at DESC);
