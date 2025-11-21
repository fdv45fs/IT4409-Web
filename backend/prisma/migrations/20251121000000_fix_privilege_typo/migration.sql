/*
  Fix typo in role name: WORKSPACE_PRIVILEDGE_MEMBER -> WORKSPACE_PRIVILEGE_MEMBER
  
  This migration updates the role name in the database if it exists.
  Safe to run multiple times (idempotent).
*/

-- Update role name if the typo version exists
UPDATE `Role` 
SET `name` = 'WORKSPACE_PRIVILEGE_MEMBER' 
WHERE `name` = 'WORKSPACE_PRIVILEDGE_MEMBER';

