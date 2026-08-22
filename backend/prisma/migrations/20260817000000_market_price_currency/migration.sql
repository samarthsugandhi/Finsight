-- AlterTable: track the currency each cached price is denominated in.
-- Twelve Data reports this per-symbol (e.g. "INR" for RELIANCE:NSE, "USD"
-- for BTC/USD) — we never assume every price is in rupees.
ALTER TABLE `market_price_cache`
    ADD COLUMN `currency` VARCHAR(191) NULL;
