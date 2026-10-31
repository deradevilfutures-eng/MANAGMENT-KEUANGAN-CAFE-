-- Racik migration 006: username-based sign in.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
UPDATE users SET username = lower(regexp_replace(split_part(email,'@',1),'[^a-zA-Z0-9._-]','','g')) || '_' || left(replace(id::text,'-',''),6)
WHERE username IS NULL OR btrim(username)='';
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_org_username_unique ON users (organization_id, lower(username));
