-- CreateTable: portfolio_transactions is the new source of truth for
-- quantity/invested amount per holding (BUY/SELL events), replacing the
-- old manually-typed investedAmount/currentValue fields.
CREATE TABLE `portfolio_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `side` ENUM('BUY', 'SELL') NOT NULL,
    `quantity` DECIMAL(18, 6) NOT NULL,
    `price` DECIMAL(14, 4) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `holdingId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `portfolio_transactions_holdingId_idx`(`holdingId`),
    INDEX `portfolio_transactions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: market_price_cache is the persistent, app-wide cache the
-- Portfolio module reads from. It is populated by a background refresh
-- loop (marketData.service.ts) — the Portfolio module never calls the
-- external market API directly.
CREATE TABLE `market_price_cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(191) NOT NULL,
    `assetType` ENUM('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'GOLD', 'FIXED_DEPOSIT') NOT NULL,
    `price` DECIMAL(14, 4) NULL,
    `previousPrice` DECIMAL(14, 4) NULL,
    `changePct` DECIMAL(8, 4) NULL,
    `lastSuccessfulFetch` DATETIME(3) NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `source` VARCHAR(191) NOT NULL,
    `status` ENUM('SUCCESS', 'STALE', 'UNAVAILABLE') NOT NULL DEFAULT 'UNAVAILABLE',
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `market_price_cache_symbol_key`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add the new holding fields (symbol/manualPrice for the
-- market-priced and manually-priced types, principal/interestRate/dates
-- for Fixed Deposits, which never get BUY/SELL transactions at all).
ALTER TABLE `portfolio_holdings`
    ADD COLUMN `symbol` VARCHAR(191) NULL,
    ADD COLUMN `manualPrice` DECIMAL(14, 4) NULL,
    ADD COLUMN `principal` DECIMAL(12, 2) NULL,
    ADD COLUMN `interestRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `maturityDate` DATETIME(3) NULL,
    ADD COLUMN `maturityAmount` DECIMAL(12, 2) NULL;

-- Data migration: the old model had no transaction history, just a single
-- typed-in investedAmount/currentValue per holding. To avoid silently
-- resetting everyone's existing holdings to zero, each non-FD holding with
-- a positive investedAmount gets ONE synthetic BUY transaction of
-- quantity=1 at price=investedAmount (preserving the exact invested total),
-- and manualPrice is set to the old currentValue so the holding keeps
-- showing its previous value immediately after migration — until the user
-- adds a real symbol (for STOCK/CRYPTO live pricing) or updates the price
-- manually (for MUTUAL_FUND/GOLD).
INSERT INTO `portfolio_transactions` (`side`, `quantity`, `price`, `date`, `createdAt`, `holdingId`, `userId`)
SELECT 'BUY', 1, `investedAmount`, `createdAt`, NOW(3), `id`, `userId`
FROM `portfolio_holdings`
WHERE `type` != 'FIXED_DEPOSIT' AND `investedAmount` > 0;

UPDATE `portfolio_holdings`
SET `manualPrice` = `currentValue`
WHERE `type` != 'FIXED_DEPOSIT';

-- Fixed Deposits never had a meaningful "current value" under the old
-- model (it was just re-typed invested amount in practice) — migrate
-- investedAmount into principal, the new FD-specific source of truth.
-- interestRate/startDate/maturityDate/maturityAmount are left NULL; the
-- user should fill these in for accurate accrual calculations.
UPDATE `portfolio_holdings`
SET `principal` = `investedAmount`
WHERE `type` = 'FIXED_DEPOSIT';

-- AlterTable: drop the old manually-entered fields now that their data has
-- been preserved above.
ALTER TABLE `portfolio_holdings`
    DROP COLUMN `investedAmount`,
    DROP COLUMN `currentValue`;

-- AddForeignKey
ALTER TABLE `portfolio_transactions` ADD CONSTRAINT `portfolio_transactions_holdingId_fkey` FOREIGN KEY (`holdingId`) REFERENCES `portfolio_holdings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `portfolio_transactions` ADD CONSTRAINT `portfolio_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
