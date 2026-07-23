CREATE TABLE IF NOT EXISTS "Departments" (
  "DepartmentId" SERIAL PRIMARY KEY,
  "Name" VARCHAR(100) NOT NULL UNIQUE,
  "Description" VARCHAR(500),
  "IsActive" BOOLEAN NOT NULL DEFAULT true,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Roles" (
  "RoleId" SERIAL PRIMARY KEY,
  "Name" VARCHAR(50) NOT NULL UNIQUE,
  "Description" VARCHAR(500),
  "IsSystemRole" BOOLEAN NOT NULL DEFAULT false,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Permissions" (
  "PermissionId" SERIAL PRIMARY KEY,
  "Code" VARCHAR(100) NOT NULL UNIQUE,
  "Description" VARCHAR(500),
  "Module" VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS "RolePermissions" (
  "RoleId" INT NOT NULL REFERENCES "Roles"("RoleId") ON DELETE CASCADE,
  "PermissionId" INT NOT NULL REFERENCES "Permissions"("PermissionId") ON DELETE CASCADE,
  PRIMARY KEY ("RoleId", "PermissionId")
);
CREATE TABLE IF NOT EXISTS "Users" (
  "UserId" SERIAL PRIMARY KEY,
  "FullName" VARCHAR(150) NOT NULL,
  "Email" VARCHAR(150) NOT NULL UNIQUE,
  "Mobile" VARCHAR(20),
  "PasswordHash" VARCHAR(255) NOT NULL,
  "RoleId" INT NOT NULL REFERENCES "Roles"("RoleId"),
  "DepartmentId" INT REFERENCES "Departments"("DepartmentId"),
  "IsActive" BOOLEAN NOT NULL DEFAULT true,
  "MustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "LastLoginAt" TIMESTAMP,
  "FailedLoginAttempts" INT NOT NULL DEFAULT 0,
  "LockedUntil" TIMESTAMP,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "RefreshTokens" (
  "TokenId" BIGSERIAL PRIMARY KEY,
  "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
  "TokenHash" VARCHAR(255) NOT NULL,
  "ExpiresAt" TIMESTAMP NOT NULL,
  "RememberMe" BOOLEAN NOT NULL DEFAULT false,
  "RevokedAt" TIMESTAMP,
  "ReplacedByToken" VARCHAR(255),
  "CreatedByIp" VARCHAR(64),
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
  "TokenId" BIGSERIAL PRIMARY KEY,
  "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
  "TokenHash" VARCHAR(255) NOT NULL,
  "ExpiresAt" TIMESTAMP NOT NULL,
  "UsedAt" TIMESTAMP,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Customers" (
  "CustomerId" SERIAL PRIMARY KEY,
  "Pub5CustomerCode" VARCHAR(50),
  "Name" VARCHAR(150) NOT NULL,
  "Mobile" VARCHAR(20) NOT NULL UNIQUE,
  "AltMobile" VARCHAR(20),
  "Email" VARCHAR(150),
  "Address" VARCHAR(500),
  "City" VARCHAR(100),
  "State" VARCHAR(100),
  "OutstandingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Orders" (
  "OrderId" SERIAL PRIMARY KEY,
  "Pub5OrderNumber" VARCHAR(50),
  "InvoiceNumber" VARCHAR(50),
  "ChallanNumber" VARCHAR(50),
  "CustomerId" INT NOT NULL REFERENCES "Customers"("CustomerId"),
  "Amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "Status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
  "DispatchStatus" VARCHAR(30) NOT NULL DEFAULT 'Pending',
  "OrderDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Attachments" (
  "AttachmentId" BIGSERIAL PRIMARY KEY,
  "OrderId" INT REFERENCES "Orders"("OrderId"),
  "FileType" VARCHAR(30) NOT NULL,
  "FileName" VARCHAR(255) NOT NULL,
  "FilePath" VARCHAR(500) NOT NULL,
  "MimeType" VARCHAR(100) NOT NULL,
  "SizeBytes" BIGINT NOT NULL,
  "UploadedByUserId" INT REFERENCES "Users"("UserId"),
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Messages" (
  "MessageId" BIGSERIAL PRIMARY KEY,
  "CustomerId" INT NOT NULL REFERENCES "Customers"("CustomerId"),
  "SentByUserId" INT REFERENCES "Users"("UserId"),
  "Direction" VARCHAR(10) NOT NULL,
  "MessageType" VARCHAR(20) NOT NULL,
  "Content" TEXT,
  "AttachmentId" BIGINT REFERENCES "Attachments"("AttachmentId"),
  "WhatsAppMessageId" VARCHAR(150),
  "Status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
  "FailReason" VARCHAR(500),
  "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
  "DeletedAt" TIMESTAMP,
  "DeletedByUserId" INT REFERENCES "Users"("UserId"),
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Books" (
  "BookId" SERIAL PRIMARY KEY,
  "Pub5BookCode" VARCHAR(50),
  "Title" VARCHAR(300) NOT NULL,
  "Author" VARCHAR(200),
  "Isbn" VARCHAR(20),
  "Price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "OrderItems" (
  "OrderItemId" SERIAL PRIMARY KEY,
  "OrderId" INT NOT NULL REFERENCES "Orders"("OrderId") ON DELETE CASCADE,
  "BookId" INT NOT NULL REFERENCES "Books"("BookId"),
  "Quantity" INT NOT NULL DEFAULT 1,
  "UnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "LineTotal" DECIMAL(14,2) GENERATED ALWAYS AS ("Quantity" * "UnitPrice") STORED
);
CREATE TABLE IF NOT EXISTS "Notifications" (
  "NotificationId" BIGSERIAL PRIMARY KEY,
  "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
  "Type" VARCHAR(30) NOT NULL,
  "Title" VARCHAR(200) NOT NULL,
  "Body" VARCHAR(1000),
  "IsRead" BOOLEAN NOT NULL DEFAULT false,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Settings" (
  "SettingKey" VARCHAR(100) PRIMARY KEY,
  "SettingValue" TEXT,
  "UpdatedByUserId" INT REFERENCES "Users"("UserId"),
  "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "ActivityLogs" (
  "ActivityLogId" BIGSERIAL PRIMARY KEY,
  "UserId" INT REFERENCES "Users"("UserId"),
  "Action" VARCHAR(100) NOT NULL,
  "Details" TEXT,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "AuditLogs" (
  "AuditLogId" BIGSERIAL PRIMARY KEY,
  "UserId" INT REFERENCES "Users"("UserId"),
  "EventType" VARCHAR(50) NOT NULL,
  "EntityType" VARCHAR(50),
  "EntityId" VARCHAR(50),
  "IpAddress" VARCHAR(64),
  "UserAgent" VARCHAR(300),
  "Metadata" TEXT,
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON "Orders"("CustomerId");
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON "Orders"("InvoiceNumber");
CREATE INDEX IF NOT EXISTS idx_messages_customer ON "Messages"("CustomerId");
CREATE INDEX IF NOT EXISTS idx_orderitems_order ON "OrderItems"("OrderId");
CREATE INDEX IF NOT EXISTS idx_auditlogs_user ON "AuditLogs"("UserId");