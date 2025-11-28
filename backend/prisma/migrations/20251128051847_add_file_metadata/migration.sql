/*
  Warnings:

  - Added the required column `extension` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Key` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `File` ADD COLUMN `extension` VARCHAR(191) NOT NULL,
    ADD COLUMN `fileSize` INTEGER NOT NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NOT NULL,
    ADD COLUMN `s3Key` VARCHAR(191) NOT NULL;
