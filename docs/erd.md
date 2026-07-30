# ERD (logical)

```
auth.users 1──1 users
users 1──* employees *──1 restaurants
employees *──1 roles
roles *──* permissions (via role_permissions)

restaurants 1──* menu_categories 1──* menu_items
restaurants 1──* ingredients 1──* inventory
menu_items *──* ingredients (menu_item_ingredients)
restaurants 1──* suppliers
restaurants 1──* tables
restaurants 1──* customers
restaurants 1──* orders 1──* order_items
orders *──1 tables (optional)
orders 1──* payments
restaurants 1──* reservations
restaurants 1──* notifications
restaurants 1──* activity_logs
```

Statuses:

- Orders: new → accepted → preparing → ready → delivered → completed | cancelled
- Tables: available | occupied | reserved | cleaning
