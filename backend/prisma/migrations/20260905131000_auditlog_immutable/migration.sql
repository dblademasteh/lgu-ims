-- Prevent updates and deletes on AuditLog
CREATE OR REPLACE FUNCTION prevent_auditlog_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is immutable. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditlog_update_prevent ON "AuditLog";
CREATE TRIGGER auditlog_update_prevent
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_auditlog_modification();
