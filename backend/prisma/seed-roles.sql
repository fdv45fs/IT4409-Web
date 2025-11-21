-- Seed script for roles
-- Run this to ensure all roles exist in the database
-- Usage: mysql -u user -p database < seed-roles.sql

-- Insert roles if they don't exist (using INSERT IGNORE to avoid duplicates)
INSERT IGNORE INTO `Role` (`id`, `name`, `description`, `createdAt`)
VALUES
  (UUID(), 'WORKSPACE_ADMIN', 'Administrator of workspace', NOW()),
  (UUID(), 'WORKSPACE_PRIVILEGE_MEMBER', 'Workspace member with privilege to create channels', NOW()),
  (UUID(), 'WORKSPACE_MEMBER', 'Regular workspace member', NOW()),
  (UUID(), 'CHANNEL_ADMIN', 'Administrator of channel', NOW()),
  (UUID(), 'CHANNEL_MEMBER', 'Regular channel member', NOW());

-- Show all roles
SELECT * FROM `Role`;

