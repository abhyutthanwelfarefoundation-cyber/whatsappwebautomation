CREATE TABLE IF NOT EXISTS "ScheduledMessages" (
  "ScheduledMessageId" BIGSERIAL PRIMARY KEY,
  "CustomerId" INT NOT NULL REFERENCES "Customers"("CustomerId"),
  "CreatedByUserId" INT NOT NULL REFERENCES "Users"("UserId"),
  "MessageType" VARCHAR(20) NOT NULL,
  "Content" TEXT,
  "AttachmentId" BIGINT REFERENCES "Attachments"("AttachmentId"),
  "InvoiceReference" VARCHAR(100),
  "ScheduledFor" TIMESTAMP NOT NULL,
  "Status" VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
  "FailReason" VARCHAR(500),
  "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_due ON "ScheduledMessages"("Status", "ScheduledFor");