-- ============================================================================
--  SmartLight — Database triggers / functions
-- ============================================================================
--  Run after `prisma db push` (or migration deploy) to install helpers that
--  Prisma cannot express in schema.prisma.  Idempotent: every CREATE uses
--  IF NOT EXISTS / OR REPLACE so re-running the file is safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  ensure_inventory_for_variant()
--
--  Auto-create an `inventory` row (warehouse MAIN, on_hand = 0) every time a
--  new `product_variant` is inserted, and back-fill any variants that
--  currently exist without one.
--
--  Why: catalog service.createVariant tries to do this in a transaction, but
--  any partial failure (e.g. a downstream constraint) would leave the
--  variant visible on the storefront while the inventory page silently hides
--  it.  Doing it at the DB layer makes "variant without inventory row" an
--  impossible state.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ensure_inventory_for_variant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (
    id,
    product_variant_id,
    warehouse_code,
    on_hand,
    reserved,
    available,
    low_stock_threshold,
    allow_backorder,
    created_at,
    updated_at
  )
  VALUES (
    'inv-' || substr(md5(NEW.id), 1, 24),
    NEW.id,
    'MAIN',
    0,
    0,
    0,
    5,
    false,
    now(),
    now()
  )
  ON CONFLICT (product_variant_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_inventory_for_variant ON product_variant;
CREATE TRIGGER trg_ensure_inventory_for_variant
  AFTER INSERT ON product_variant
  FOR EACH ROW
  EXECUTE FUNCTION ensure_inventory_for_variant();

-- Backfill any existing variants that are missing their inventory row.
INSERT INTO inventory (
  id,
  product_variant_id,
  warehouse_code,
  on_hand,
  reserved,
  available,
  low_stock_threshold,
  allow_backorder,
  created_at,
  updated_at
)
SELECT
  'inv-' || substr(md5(pv.id), 1, 24),
  pv.id,
  'MAIN',
  0,
  0,
  0,
  5,
  false,
  now(),
  now()
FROM product_variant pv
LEFT JOIN inventory i ON i.product_variant_id = pv.id
WHERE i.id IS NULL
ON CONFLICT (product_variant_id) DO NOTHING;
