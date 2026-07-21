USE PublisherOperations;
GO

/* ---------------------------------------------------------------------
   Roles
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = 'Admin')
INSERT INTO dbo.Roles (Name, Description, IsSystemRole) VALUES
('Admin', 'Full system access', 1),
('Manager', 'Oversight of all departments, reports, approvals', 1),
('Sales', 'Order creation and customer management', 1),
('Accounts', 'Invoices, payments, outstanding balances', 1),
('Dispatch', 'Dispatch and delivery status updates', 1),
('CustomerSupport', 'WhatsApp chat and customer queries', 1);
GO

/* ---------------------------------------------------------------------
   Permissions
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Permissions WHERE Code = 'dashboard.view')
INSERT INTO dbo.Permissions (Code, Description, Module) VALUES
('dashboard.view',        'View dashboard',                          'Dashboard'),
('customers.view',        'View customers',                          'Customers'),
('customers.manage',      'Create/edit customers',                   'Customers'),
('orders.view',           'View orders',                             'Orders'),
('orders.manage',         'Update order/dispatch status',            'Orders'),
('whatsapp.view',         'View WhatsApp conversations',             'WhatsApp'),
('whatsapp.send',         'Send WhatsApp messages',                  'WhatsApp'),
('whatsapp.schedule',     'Schedule WhatsApp messages',               'WhatsApp'),
('whatsapp.assign',       'Assign/transfer chats',                   'WhatsApp'),
('reports.view',          'View reports',                            'Reports'),
('settings.manage',       'Manage company/API/SMTP settings',        'Settings'),
('users.manage',          'Manage users, roles, permissions',        'Users'),
('audit.view',            'View audit logs',                         'Audit');
GO

/* ---------------------------------------------------------------------
   Role -> Permission mapping
   --------------------------------------------------------------------- */
-- Admin: everything
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.Name = 'Admin'
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

-- Manager: everything except settings/users management
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.Name = 'Manager' AND p.Code NOT IN ('settings.manage', 'users.manage')
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

-- Sales
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.Name = 'Sales' AND p.Code IN ('dashboard.view','customers.view','customers.manage','orders.view','whatsapp.view','whatsapp.send','whatsapp.schedule')
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

-- Accounts
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.Name = 'Accounts' AND p.Code IN ('dashboard.view','customers.view','orders.view','whatsapp.view','whatsapp.send','reports.view')
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

-- Dispatch
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.Name = 'Dispatch' AND p.Code IN ('dashboard.view','orders.view','orders.manage','whatsapp.view','whatsapp.send')
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

-- CustomerSupport
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.Name = 'CustomerSupport' AND p.Code IN ('dashboard.view','customers.view','whatsapp.view','whatsapp.send','whatsapp.schedule','whatsapp.assign')
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

/* ---------------------------------------------------------------------
   Departments
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Name = 'Sales')
INSERT INTO dbo.Departments (Name, Description) VALUES
('Sales', 'Order booking and customer acquisition'),
('Accounts', 'Invoicing, payments, ledgers'),
('Dispatch', 'Packing and delivery'),
('Customer Support', 'Post-sale customer communication'),
('Management', 'Oversight and approvals');
GO

/* ---------------------------------------------------------------------
   Default Admin User
   Password hash below corresponds to plaintext: ChangeMe!123
   (bcrypt, cost 12 — generated once; MustChangePassword forces reset on first login)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'admin@example.com')
INSERT INTO dbo.Users (FullName, Email, Mobile, PasswordHash, RoleId, DepartmentId, IsActive, MustChangePassword)
SELECT
    'System Administrator',
    'admin@example.com',
    '9999999999',
    '$2b$12$Nq8f5eYFVYyR2xU1aC9r7uW8p0oQeYJH1c9x1sT1lA6Q3xk1oQeYy', -- placeholder hash, see note below
    r.RoleId,
    d.DepartmentId,
    1,
    1
FROM dbo.Roles r, dbo.Departments d
WHERE r.Name = 'Admin' AND d.Name = 'Management';
GO

/* NOTE: The PasswordHash literal above is a placeholder string, not a
   verified bcrypt hash of "ChangeMe!123". Before first login, generate a
   real hash and UPDATE this row:

   node -e "console.log(require('bcrypt').hashSync('ChangeMe!123', 12))"

   Then:
   UPDATE dbo.Users SET PasswordHash = '<generated-hash>' WHERE Email = 'admin@example.com';
*/
