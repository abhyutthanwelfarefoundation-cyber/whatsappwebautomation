/* =========================================================================
   Migration 002 — Phase 2 additions
   Adds Books + OrderItems so "books purchased" per order/customer can be
   shown, without altering anything from Phase 1. Safe to re-run (guarded).
   Run this AFTER schema.sql + seed.sql have already been applied.
   ========================================================================= */

USE PublisherOperations;
GO

IF OBJECT_ID('dbo.Books', 'U') IS NULL
CREATE TABLE dbo.Books (
    BookId          INT IDENTITY(1,1) PRIMARY KEY,
    Pub5BookCode    NVARCHAR(50) NULL,     -- link to PUB5's real book/title code once known
    Title           NVARCHAR(300) NOT NULL,
    Author          NVARCHAR(200) NULL,
    Isbn            NVARCHAR(20) NULL,
    Price           DECIMAL(12,2) NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
CREATE TABLE dbo.OrderItems (
    OrderItemId     INT IDENTITY(1,1) PRIMARY KEY,
    OrderId         INT NOT NULL FOREIGN KEY REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    BookId          INT NOT NULL FOREIGN KEY REFERENCES dbo.Books(BookId),
    Quantity        INT NOT NULL DEFAULT 1,
    UnitPrice       DECIMAL(12,2) NOT NULL DEFAULT 0,
    LineTotal       AS (Quantity * UnitPrice) PERSISTED
);
GO
CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems(OrderId);
CREATE INDEX IX_OrderItems_BookId ON dbo.OrderItems(BookId);
GO
