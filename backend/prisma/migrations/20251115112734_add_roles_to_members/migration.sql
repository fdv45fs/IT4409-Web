/*
  Warnings:

  - You are about to drop the column `role` on the `ChannelMember` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `WorkspaceMember` table. All the data in the column will be lost.
  - Added the required column `roleId` to the `ChannelMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `WorkspaceMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ChannelMember` DROP COLUMN `role`,
    ADD COLUMN `roleId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `WorkspaceMember` DROP COLUMN `role`,
    ADD COLUMN `roleId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelMember` ADD CONSTRAINT `ChannelMember_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
