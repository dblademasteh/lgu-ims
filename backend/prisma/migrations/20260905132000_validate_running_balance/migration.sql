-- Validate runningBalance on LedgerEntry insert/update
CREATE OR REPLACE FUNCTION validate_running_balance()
RETURNS TRIGGER AS $$
DECLARE
  computed_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(inflow - outflow), 0) INTO computed_balance
  FROM "LedgerEntry"
  WHERE "itemId" = NEW."itemId" AND "id" != NEW."id";

  IF ABS((computed_balance + NEW.inflow - NEW.outflow) - NEW."runningBalance") > 0.01 THEN
    RAISE EXCEPTION 'Invalid runningBalance for LedgerEntry on item %: expected %, got %', NEW."itemId", computed_balance + NEW.inflow - NEW.outflow, NEW."runningBalance";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_running_balance_validate ON "LedgerEntry";
CREATE TRIGGER ledger_running_balance_validate
  BEFORE INSERT OR UPDATE ON "LedgerEntry"
  FOR EACH ROW EXECUTE FUNCTION validate_running_balance();
