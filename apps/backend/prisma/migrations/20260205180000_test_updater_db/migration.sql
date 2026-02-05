-- Test migration for updater system validation
-- Creates a test table to verify the migration ran successfully

CREATE TABLE IF NOT EXISTS "_test_updater_migration" (
  id SERIAL PRIMARY KEY,
  test_value TEXT DEFAULT 'updater_test_success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a test row to verify migration execution
INSERT INTO "_test_updater_migration" (test_value)
VALUES ('Migration executed at ' || CURRENT_TIMESTAMP);
