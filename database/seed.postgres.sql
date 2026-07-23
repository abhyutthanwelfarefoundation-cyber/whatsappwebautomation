INSERT INTO "Roles" ("Name", "Description", "IsSystemRole") VALUES
('Admin','Full system access',true),
('Manager','Oversight of all departments',true),
('Sales','Order creation and customer management',true),
('Accounts','Invoices, payments, balances',true),
('Dispatch','Dispatch and delivery updates',true),
('CustomerSupport','WhatsApp chat and queries',true)
ON CONFLICT ("Name") DO NOTHING;

INSERT INTO "Permissions" ("Code","Description","Module") VALUES
('dashboard.view','View dashboard','Dashboard'),
('customers.view','View customers','Customers'),
('customers.manage','Create/edit customers','Customers'),
('orders.view','View orders','Orders'),
('orders.manage','Update order/dispatch status','Orders'),
('whatsapp.view','View WhatsApp conversations','WhatsApp'),
('whatsapp.send','Send WhatsApp messages','WhatsApp'),
('whatsapp.schedule','Schedule WhatsApp messages','WhatsApp'),
('whatsapp.assign','Assign/transfer chats','WhatsApp'),
('reports.view','View reports','Reports'),
('settings.manage','Manage settings','Settings'),
('users.manage','Manage users/roles','Users'),
('audit.view','View audit logs','Audit')
ON CONFLICT ("Code") DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId","PermissionId")
SELECT r."RoleId", p."PermissionId" FROM "Roles" r CROSS JOIN "Permissions" p
WHERE r."Name" = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId","PermissionId")
SELECT r."RoleId", p."PermissionId" FROM "Roles" r CROSS JOIN "Permissions" p
WHERE r."Name" = 'Manager' AND p."Code" NOT IN ('settings.manage','users.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId","PermissionId")
SELECT r."RoleId", p."PermissionId" FROM "Roles" r CROSS JOIN "Permissions" p
WHERE r."Name" = 'Sales' AND p."Code" IN ('dashboard.view','customers.view','customers.manage','orders.view','whatsapp.view','whatsapp.send','whatsapp.schedule')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId","PermissionId")
SELECT r."RoleId", p."PermissionId" FROM "Roles" r CROSS JOIN "Permissions" p
WHERE r."Name" = 'Accounts' AND p."Code" IN ('dashboard.view','customers.view','orders.view','whatsapp.view','whatsapp.send','reports.view')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId","PermissionId")
SELECT r."RoleId", p."PermissionId" FROM "Roles" r CROSS JOIN "Permissions" p
WHERE r."Name" = 'Dispatch' AND p."Code" IN ('dashboard.view','orders.view','orders.manage','whatsapp.view','whatsapp.send')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId","PermissionId")
SELECT r."RoleId", p."PermissionId" FROM "Roles" r CROSS JOIN "Permissions" p
WHERE r."Name" = 'CustomerSupport' AND p."Code" IN ('dashboard.view','customers.view','whatsapp.view','whatsapp.send','whatsapp.schedule','whatsapp.assign')
ON CONFLICT DO NOTHING;

INSERT INTO "Departments" ("Name","Description") VALUES
('Sales','Order booking'),('Accounts','Invoicing'),('Dispatch','Packing and delivery'),
('Customer Support','Customer communication'),('Management','Oversight')
ON CONFLICT ("Name") DO NOTHING;

INSERT INTO "Users" ("FullName","Email","Mobile","PasswordHash","RoleId","DepartmentId","IsActive","MustChangePassword")
SELECT 'System Administrator','admin@example.com','9999999999',
  '$2b$12$Nq8f5eYFVYyR2xU1aC9r7uW8p0oQeYJH1c9x1sT1lA6Q3xk1oQeYy', r."RoleId", d."DepartmentId", true, true
FROM "Roles" r, "Departments" d WHERE r."Name"='Admin' AND d."Name"='Management'
ON CONFLICT ("Email") DO NOTHING;