/* =========================================================================
   Migration 003 — soft-delete support for WhatsApp messages
   WhatsApp Business API doesn't support recalling a message from the
   customer's phone (unlike the consumer app), so "delete" here means
   "hide from our own chat view" - the message stays sent on the
   customer's device. Safe to re-run (guarded).
   ========================================================================= */

USE PublisherOperations;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'IsDeleted'
)
BEGIN
    ALTER TABLE dbo.Messages ADD IsDeleted BIT NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'DeletedAt'
)
BEGIN
    ALTER TABLE dbo.Messages ADD DeletedAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'DeletedByUserId'
)
BEGIN
    ALTER TABLE dbo.Messages ADD DeletedByUserId INT NULL;
    ALTER TABLE dbo.Messages ADD CONSTRAINT FK_Messages_DeletedByUser
        FOREIGN KEY (DeletedByUserId) REFERENCES dbo.Users(UserId);
END
GO