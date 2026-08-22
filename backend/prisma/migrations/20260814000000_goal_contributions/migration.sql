-- CreateTable: goal_contributions is the new source of truth for how much
-- of a user's savings has been allocated to each goal.
CREATE TABLE `goal_contributions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(12, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `goalId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `goal_contributions_userId_idx`(`userId`),
    INDEX `goal_contributions_goalId_idx`(`goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `goal_contributions` ADD CONSTRAINT `goal_contributions_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `goal_contributions` ADD CONSTRAINT `goal_contributions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: preserve any progress users already recorded under the
-- old manually-set `savedAmount` column by converting it into a real
-- GoalContribution row, so nobody's existing goal progress is silently
-- reset to zero by this redesign.
INSERT INTO `goal_contributions` (`amount`, `date`, `note`, `createdAt`, `goalId`, `userId`)
SELECT `savedAmount`, `createdAt`, 'Migrated from previous saved amount', NOW(3), `id`, `userId`
FROM `goals`
WHERE `savedAmount` > 0;

-- AlterTable: savedAmount is no longer stored — it is now always computed
-- as SUM(goal_contributions.amount) for the goal, in application code.
ALTER TABLE `goals` DROP COLUMN `savedAmount`;
