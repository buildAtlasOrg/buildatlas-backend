CREATE TABLE IF NOT EXISTS workflow_jobs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  owner       TEXT        NOT NULL,
  repo        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'ok' | 'error'
  commit_sha  TEXT,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_jobs_user_id_idx ON workflow_jobs (user_id);
CREATE INDEX IF NOT EXISTS workflow_jobs_status_idx  ON workflow_jobs (status);

CREATE OR REPLACE FUNCTION update_workflow_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_jobs_updated_at
  BEFORE UPDATE ON workflow_jobs
  FOR EACH ROW EXECUTE FUNCTION update_workflow_jobs_updated_at();
