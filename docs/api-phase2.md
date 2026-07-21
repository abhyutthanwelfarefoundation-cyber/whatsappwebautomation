# POP API Documentation — Phase 2 additions

All endpoints below require `Authorization: Bearer <accessToken>` and the
listed permission (seeded in Phase 1 — see `docs/api.md` for the full list).

---

## Customers

### `GET /customers?query=&page=1&pageSize=20`
Permission: `customers.view`

Searches by name, mobile, email, customer ID, or any linked invoice/order/challan
number. Empty `query` returns all customers (paginated).

Response `data`:
```json
{
  "rows": [
    { "CustomerId": 1, "Name": "Ramesh Book Depot", "Mobile": "9812345001",
      "Email": "...", "City": "Raipur", "State": "Chhattisgarh", "OutstandingBalance": 4500 }
  ],
  "totalCount": 4,
  "page": 1,
  "pageSize": 20
}
```

### `GET /customers/:customerId`
Permission: `customers.view`

Full profile: customer details, `orderHistory`, `booksPurchased` (aggregated
quantity + spend per title), `whatsAppHistory` (empty until Phase 3
populates `dbo.Messages`).

---

## Orders

### `GET /orders?status=&dispatchStatus=&customerId=&page=1&pageSize=20`
Permission: `orders.view`

All filters optional. `status` ∈ `Pending, Invoiced, Dispatched, Completed, Cancelled`.
`dispatchStatus` ∈ `Pending, Packed, Dispatched, Delivered`.

### `GET /orders/:orderId`
Permission: `orders.view`

Returns order + customer summary, `items` (books/quantity/price), and
`attachments` (empty until the PDF module in Phase 3).

### `PATCH /orders/:orderId/status`
Permission: `orders.manage`

Body (at least one field required):
```json
{ "status": "Dispatched", "dispatchStatus": "Delivered" }
```
Writes to this app's own `Orders` table (never to PUB5, per the project's
"never modify PUB5" rule) and records an `AuditLogs` entry with before/after
values.

---

## Global Search

### `GET /search?query=<term>`
No specific permission beyond being logged in — returns whatever the term
matches across customers, orders/invoices, books, and message content
(searches only within data the person could already reach via the other
endpoints; it does not itself enforce per-module permissions yet — add
that if any role should NOT see cross-module search hits).

Response `data`:
```json
{
  "customers": [ { "CustomerId": 1, "Name": "...", "Mobile": "...", "Email": "..." } ],
  "orders": [ { "OrderId": 3, "InvoiceNumber": "...", "Status": "...", "CustomerName": "..." } ],
  "books": [ { "BookId": 2, "Title": "...", "Author": "...", "Isbn": "..." } ],
  "messages": [ { "MessageId": 10, "CustomerId": 1, "CustomerName": "...", "Content": "...", "CreatedAt": "..." } ]
}
```

**Note on the permission gap above:** worth deciding before go-live whether,
e.g., a Dispatch-role user (no `customers.manage`) should be able to search
up customer details this way. Flagging it rather than silently deciding —
happy to add per-section permission filtering if you want it stricter.
