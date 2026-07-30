# RBAC matrix

Permissions are keys on `permissions.key`. Owner receives `*`. Policies call `has_permission(restaurant_id, key)`.

| Permission | Owner | Manager | Chef | Waiter | Cashier |
|------------|-------|---------|------|--------|---------|
| `*` | yes | | | | |
| `orders:read` | via * | yes | yes | yes | yes |
| `orders:write` | via * | yes | | yes | yes |
| `kitchen:write` | via * | | yes | | |
| `tables:read/write` | via * | yes | | yes | |
| `menu:read/write` | via * | yes | read | read | read |
| `inventory:*` | via * | yes | | | |
| `customers:*` | via * | yes | | yes | |
| `employees:*` | via * | read | | | |
| `analytics:read` | via * | yes | | | |
| `payments:*` | via * | read | | | yes |
| `reservations:*` | via * | yes | | read | |
| `settings:write` | via * | | | | |
| `notifications:write` | via * | yes | | | |

Frontend may hide nav by role; **never** treat that as security.
