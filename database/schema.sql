/* =========================================================================
   Publisher Operations Portal (POP)
   Database: PublisherOperations
   IMPORTANT: This is a SEPARATE database. PUB5's tables are never touched.
   The Customers/Orders tables below are a REALISTIC PLACEHOLDER schema
   (per project decision) — they will be remapped once the real PUB5
   schema is provided. Everything else is final for Phase 1.
   ========================================================================= */

IF DB_ID('PublisherOperations') IS NULL
BEGIN
    CREATE DATABASE PublisherOperations;
END
GO

USE PublisherOperations;
GO

/* ---------------------------------------------------------------------
   1. Departments
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Departments', 'U') IS NULL
CREATE TABLE dbo.Departments (
    DepartmentId    INT IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(100) NOT NULL UNIQUE,
    Description     NVARCHAR(500) NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------
   2. Roles & Permissions (RBAC)
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
CREATE TABLE dbo.Roles (
    RoleId          INT IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(50) NOT NULL UNIQUE,   -- Admin, Sales, Accounts, Dispatch, CustomerSupport, Manager
    Description     NVARCHAR(500) NULL,
    IsSystemRole    BIT NOT NULL DEFAULT 0,          -- system roles cannot be deleted
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.Permissions', 'U') IS NULL
CREATE TABLE dbo.Permissions (
    PermissionId    INT IDENTITY(1,1) PRIMARY KEY,
    Code            NVARCHAR(100) NOT NULL UNIQUE,  -- e.g. 'orders.view', 'whatsapp.send', 'settings.manage'
    Description     NVARCHAR(500) NULL,
    Module          NVARCHAR(50) NOT NULL           -- e.g. 'Orders', 'WhatsApp', 'Settings'
);
GO

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NULL
CREATE TABLE dbo.RolePermissions (
    RoleId          INT NOT NULL FOREIGN KEY REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE,
    PermissionId    INT NOT NULL FOREIGN KEY REFERENCES dbo.Permissions(PermissionId) ON DELETE CASCADE,
    PRIMARY KEY (RoleId, PermissionId)
);
GO

/* ---------------------------------------------------------------------
   3. Users
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
    UserId              INT IDENTITY(1,1) PRIMARY KEY,
    FullName            NVARCHAR(150) NOT NULL,
    Email               NVARCHAR(150) NOT NULL UNIQUE,
    Mobile              NVARCHAR(20) NULL,
    PasswordHash        NVARCHAR(255) NOT NULL,
    RoleId              INT NOT NULL FOREIGN KEY REFERENCES dbo.Roles(RoleId),
    DepartmentId        INT NULL FOREIGN KEY REFERENCES dbo.Departments(DepartmentId),
    IsActive            BIT NOT NULL DEFAULT 1,
    MustChangePassword  BIT NOT NULL DEFAULT 0,
    LastLoginAt         DATETIME2 NULL,
    FailedLoginAttempts INT NOT NULL DEFAULT 0,
    LockedUntil         DATETIME2 NULL,
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* Rotating refresh tokens (hashed at rest, revocable, supports "Remember Me") */
IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NULL
CREATE TABLE dbo.RefreshTokens (
    TokenId         BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    TokenHash       NVARCHAR(255) NOT NULL,
    ExpiresAt       DATETIME2 NOT NULL,
    RememberMe      BIT NOT NULL DEFAULT 0,
    RevokedAt       DATETIME2 NULL,
    ReplacedByToken NVARCHAR(255) NULL,
    CreatedByIp     NVARCHAR(64) NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* Single-use password reset tokens (hashed, short expiry) */
IF OBJECT_ID('dbo.PasswordResetTokens', 'U') IS NULL
CREATE TABLE dbo.PasswordResetTokens (
    TokenId         BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    TokenHash       NVARCHAR(255) NOT NULL,
    ExpiresAt       DATETIME2 NOT NULL,
    UsedAt          DATETIME2 NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------
   4. Customers  (PLACEHOLDER — will mirror/read from PUB5 in Phase 2)
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Customers', 'U') IS NULL
CREATE TABLE dbo.Customers (
    CustomerId      INT IDENTITY(1,1) PRIMARY KEY,
    Pub5CustomerCode NVARCHAR(50) NULL,   -- link back to PUB5's real customer id once known
    Name            NVARCHAR(150) NOT NULL,
    Mobile          NVARCHAR(20) NOT NULL,
    AltMobile       NVARCHAR(20) NULL,
    Email           NVARCHAR(150) NULL,
    Address         NVARCHAR(500) NULL,
    City            NVARCHAR(100) NULL,
    State           NVARCHAR(100) NULL,
    OutstandingBalance DECIMAL(14,2) NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Customers_Mobile ON dbo.Customers(Mobile);
GO

/* ---------------------------------------------------------------------
   5. Orders (PLACEHOLDER — mirrors PUB5 order/invoice/challan concept)
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Orders', 'U') IS NULL
CREATE TABLE dbo.Orders (
    OrderId         INT IDENTITY(1,1) PRIMARY KEY,
    Pub5OrderNumber NVARCHAR(50) NULL,
    InvoiceNumber   NVARCHAR(50) NULL,
    ChallanNumber   NVARCHAR(50) NULL,
    CustomerId      INT NOT NULL FOREIGN KEY REFERENCES dbo.Customers(CustomerId),
    Amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    Status          NVARCHAR(30) NOT NULL DEFAULT 'Pending',   -- Pending, Invoiced, Dispatched, Completed, Cancelled
    DispatchStatus  NVARCHAR(30) NOT NULL DEFAULT 'Pending',   -- Pending, Packed, Dispatched, Delivered
    OrderDate       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Orders_CustomerId ON dbo.Orders(CustomerId);
CREATE INDEX IX_Orders_InvoiceNumber ON dbo.Orders(InvoiceNumber);
GO

/* ---------------------------------------------------------------------
   6. Attachments (invoice/challan/catalogue/book PDFs, images, docs)
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Attachments', 'U') IS NULL
CREATE TABLE dbo.Attachments (
    AttachmentId    BIGINT IDENTITY(1,1) PRIMARY KEY,
    OrderId         INT NULL FOREIGN KEY REFERENCES dbo.Orders(OrderId),
    FileType        NVARCHAR(30) NOT NULL,   -- Invoice, Challan, Catalogue, Book, Image, Document
    FileName        NVARCHAR(255) NOT NULL,
    FilePath        NVARCHAR(500) NOT NULL,
    MimeType        NVARCHAR(100) NOT NULL,
    SizeBytes       BIGINT NOT NULL,
    UploadedByUserId INT NULL FOREIGN KEY REFERENCES dbo.Users(UserId),
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------
   7. Messages / ChatHistory / ScheduledMessages  (Phase 3 will populate)
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Messages', 'U') IS NULL
CREATE TABLE dbo.Messages (
    MessageId       BIGINT IDENTITY(1,1) PRIMARY KEY,
    CustomerId      INT NOT NULL FOREIGN KEY REFERENCES dbo.Customers(CustomerId),
    SentByUserId    INT NULL FOREIGN KEY REFERENCES dbo.Users(UserId),
    Direction       NVARCHAR(10) NOT NULL,        -- Outgoing, Incoming
    MessageType     NVARCHAR(20) NOT NULL,        -- Text, Image, PDF, Document, Template
    Content         NVARCHAR(MAX) NULL,
    AttachmentId    BIGINT NULL FOREIGN KEY REFERENCES dbo.Attachments(AttachmentId),
    WhatsAppMessageId NVARCHAR(150) NULL,
    Status          NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Sent, Delivered, Read, Failed
    FailReason      NVARCHAR(500) NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Messages_CustomerId ON dbo.Messages(CustomerId);
GO

IF OBJECT_ID('dbo.ScheduledMessages', 'U') IS NULL
CREATE TABLE dbo.ScheduledMessages (
    ScheduledMessageId BIGINT IDENTITY(1,1) PRIMARY KEY,
    CustomerId      INT NOT NULL FOREIGN KEY REFERENCES dbo.Customers(CustomerId),
    CreatedByUserId INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(UserId),
    MessageType     NVARCHAR(20) NOT NULL,
    Content         NVARCHAR(MAX) NULL,
    AttachmentId    BIGINT NULL FOREIGN KEY REFERENCES dbo.Attachments(AttachmentId),
    ScheduledFor    DATETIME2 NOT NULL,
    Status          NVARCHAR(20) NOT NULL DEFAULT 'Scheduled', -- Scheduled, Sent, Cancelled, Failed
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------
   8. Notifications
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
CREATE TABLE dbo.Notifications (
    NotificationId  BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    Type            NVARCHAR(30) NOT NULL,   -- Message, Dispatch, System, Order
    Title           NVARCHAR(200) NOT NULL,
    Body            NVARCHAR(1000) NULL,
    IsRead          BIT NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------
   9. Settings (key/value, JSON payloads for API credentials etc.)
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Settings', 'U') IS NULL
CREATE TABLE dbo.Settings (
    SettingKey      NVARCHAR(100) PRIMARY KEY,
    SettingValue    NVARCHAR(MAX) NULL,   -- JSON-encoded; secrets should be encrypted at rest by app layer
    UpdatedByUserId INT NULL FOREIGN KEY REFERENCES dbo.Users(UserId),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------
   10. ActivityLogs & AuditLogs
   --------------------------------------------------------------------- */
IF OBJECT_ID('dbo.ActivityLogs', 'U') IS NULL
CREATE TABLE dbo.ActivityLogs (
    ActivityLogId   BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NULL FOREIGN KEY REFERENCES dbo.Users(UserId),
    Action          NVARCHAR(100) NOT NULL,     -- e.g. 'ORDER_VIEWED', 'CHAT_ASSIGNED'
    Details         NVARCHAR(MAX) NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
CREATE TABLE dbo.AuditLogs (
    AuditLogId      BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NULL FOREIGN KEY REFERENCES dbo.Users(UserId),
    EventType       NVARCHAR(50) NOT NULL,  -- LOGIN, LOGOUT, MESSAGE_SENT, MESSAGE_DELETED, ROLE_CHANGED, SETTINGS_CHANGED
    EntityType      NVARCHAR(50) NULL,
    EntityId        NVARCHAR(50) NULL,
    IpAddress       NVARCHAR(64) NULL,
    UserAgent       NVARCHAR(300) NULL,
    Metadata        NVARCHAR(MAX) NULL,     -- JSON
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_AuditLogs_UserId ON dbo.AuditLogs(UserId);
CREATE INDEX IX_AuditLogs_EventType ON dbo.AuditLogs(EventType);
GO
