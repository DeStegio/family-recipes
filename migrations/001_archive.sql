CREATE TABLE account (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'reader'))
);

CREATE TABLE session (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX session_expiration ON session (expires_at);

CREATE TABLE login_attempt (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
CREATE INDEX login_attempt_expiration ON login_attempt (resets_at);

CREATE TABLE recipe (
  id text PRIMARY KEY,
  head integer NOT NULL DEFAULT 1 CHECK (head > 0),
  published integer CHECK (published <= head AND published > 0),
  linked_to text REFERENCES recipe(id),
  variant_of text REFERENCES recipe(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE original (
  id uuid PRIMARY KEY,
  object_key text UNIQUE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  sha256 text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recipe_original (
  recipe_id text NOT NULL REFERENCES recipe(id),
  original_id uuid NOT NULL REFERENCES original(id),
  position integer NOT NULL CHECK (position > 0),
  PRIMARY KEY (recipe_id, original_id),
  UNIQUE (recipe_id, position)
);

CREATE TABLE recipe_version (
  recipe_id text NOT NULL REFERENCES recipe(id),
  revision integer NOT NULL CHECK (revision > 0),
  actor_id uuid NOT NULL REFERENCES account(id),
  action text NOT NULL,
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, revision)
);

CREATE TABLE source_version (
  recipe_id text NOT NULL,
  revision integer NOT NULL,
  original_id uuid NOT NULL,
  transcription text NOT NULL,
  description text,
  PRIMARY KEY (recipe_id, revision, original_id),
  FOREIGN KEY (recipe_id, revision) REFERENCES recipe_version(recipe_id, revision),
  FOREIGN KEY (recipe_id, original_id) REFERENCES recipe_original(recipe_id, original_id)
);

CREATE TABLE review_issue (
  recipe_id text NOT NULL,
  revision integer NOT NULL,
  issue_id uuid NOT NULL,
  detail jsonb NOT NULL,
  PRIMARY KEY (recipe_id, revision, issue_id),
  FOREIGN KEY (recipe_id, revision) REFERENCES recipe_version(recipe_id, revision)
);

CREATE FUNCTION reject_archive_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Archive records are append-only';
END;
$$;

CREATE TRIGGER immutable_original BEFORE UPDATE OR DELETE ON original
  FOR EACH ROW EXECUTE FUNCTION reject_archive_mutation();
CREATE TRIGGER immutable_membership BEFORE UPDATE OR DELETE ON recipe_original
  FOR EACH ROW EXECUTE FUNCTION reject_archive_mutation();
CREATE TRIGGER immutable_recipe_version BEFORE UPDATE OR DELETE ON recipe_version
  FOR EACH ROW EXECUTE FUNCTION reject_archive_mutation();
CREATE TRIGGER immutable_source_version BEFORE UPDATE OR DELETE ON source_version
  FOR EACH ROW EXECUTE FUNCTION reject_archive_mutation();
CREATE TRIGGER immutable_issue_version BEFORE UPDATE OR DELETE ON review_issue
  FOR EACH ROW EXECUTE FUNCTION reject_archive_mutation();
