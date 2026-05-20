-- Optional: run after `railway connect mysql` (paste into mysql>) if your user has privilege.
-- Managed MySQL often blocks SET GLOBAL; then rely on app indexes + per-key queries only.

SHOW VARIABLES LIKE 'sort_buffer_size';

-- Example (4 MiB); adjust if allowed:
-- SET GLOBAL sort_buffer_size = 4194304;
