/* =========================================================================
   Sample data — for local testing of Customers/Orders/Books modules
   before the real PUB5 connection is wired up in Phase 2.5.
   Safe to run multiple times (guarded by NOT EXISTS checks).
   ========================================================================= */

USE PublisherOperations;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Customers WHERE Mobile = '9812345001')
INSERT INTO dbo.Customers (Pub5CustomerCode, Name, Mobile, Email, Address, City, State, OutstandingBalance) VALUES
('PUB5-C-1001', 'Ramesh Book Depot', '9812345001', 'ramesh.depot@example.com', '12 MG Road', 'Raipur', 'Chhattisgarh', 4500.00),
('PUB5-C-1002', 'Saraswati Book House', '9812345002', 'saraswati.books@example.com', '45 Station Road', 'Bhopal', 'Madhya Pradesh', 0.00),
('PUB5-C-1003', 'Vidya Niketan School', '9812345003', 'accounts@vidyaniketan.example.com', '8 School Lane', 'Nagpur', 'Maharashtra', 12800.50),
('PUB5-C-1004', 'Gyan Ganga Traders', '9812345004', 'gg.traders@example.com', '221 Market Yard', 'Mahasamund', 'Chhattisgarh', 2100.00);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Books WHERE Isbn = '9788178990001')
INSERT INTO dbo.Books (Pub5BookCode, Title, Author, Isbn, Price) VALUES
('PUB5-B-001', 'Foundations of Algebra - Class 8', 'R. K. Sharma', '9788178990001', 185.00),
('PUB5-B-002', 'English Grammar in Practice', 'M. Verma', '9788178990002', 145.00),
('PUB5-B-003', 'General Science - Class 6', 'A. Iyer', '9788178990003', 160.00),
('PUB5-B-004', 'Hindi Sulekh Abhyas', 'S. Tripathi', '9788178990004', 95.00);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE Pub5OrderNumber = 'PUB5-ORD-5001')
INSERT INTO dbo.Orders (Pub5OrderNumber, InvoiceNumber, ChallanNumber, CustomerId, Amount, Status, DispatchStatus, OrderDate)
SELECT 'PUB5-ORD-5001', 'INV-2026-1001', 'CHL-2026-1001', c.CustomerId, 1030.00, 'Dispatched', 'Delivered', '2026-07-01'
FROM dbo.Customers c WHERE c.Mobile = '9812345001';

INSERT INTO dbo.Orders (Pub5OrderNumber, InvoiceNumber, ChallanNumber, CustomerId, Amount, Status, DispatchStatus, OrderDate)
SELECT 'PUB5-ORD-5002', 'INV-2026-1002', NULL, c.CustomerId, 490.00, 'Pending', 'Pending', '2026-07-10'
FROM dbo.Customers c WHERE c.Mobile = '9812345002';

INSERT INTO dbo.Orders (Pub5OrderNumber, InvoiceNumber, ChallanNumber, CustomerId, Amount, Status, DispatchStatus, OrderDate)
SELECT 'PUB5-ORD-5003', 'INV-2026-1003', 'CHL-2026-1003', c.CustomerId, 3200.00, 'Invoiced', 'Packed', '2026-07-11'
FROM dbo.Customers c WHERE c.Mobile = '9812345003';
GO

-- Line items for order 5001: 4x Algebra + 2x Grammar
INSERT INTO dbo.OrderItems (OrderId, BookId, Quantity, UnitPrice)
SELECT o.OrderId, b.BookId, 4, b.Price FROM dbo.Orders o, dbo.Books b
WHERE o.Pub5OrderNumber = 'PUB5-ORD-5001' AND b.Isbn = '9788178990001'
AND NOT EXISTS (SELECT 1 FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId AND oi.BookId = b.BookId);

INSERT INTO dbo.OrderItems (OrderId, BookId, Quantity, UnitPrice)
SELECT o.OrderId, b.BookId, 2, b.Price FROM dbo.Orders o, dbo.Books b
WHERE o.Pub5OrderNumber = 'PUB5-ORD-5001' AND b.Isbn = '9788178990002'
AND NOT EXISTS (SELECT 1 FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId AND oi.BookId = b.BookId);
GO
