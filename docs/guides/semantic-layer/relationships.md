# Defining Relationships

This guide explains how to define relationships between tables in NovaSight's semantic layer.

## Overview

Relationships tell NovaSight how tables connect, enabling:
- Automatic joins in queries
- Multi-table questions ("sales by customer segment")
- Accurate aggregations across related data

---

## Relationship Types

### One-to-Many (1:N)

The most common relationship type.

```
customers (1) ────────< orders (N)
    │                      │
    └── id                 └── customer_id

One customer has many orders
```

### Many-to-One (N:1)

The inverse of one-to-many.

```
orders (N) >──────── products (1)
    │                    │
    └── product_id       └── id

Many orders reference one product
```

### Many-to-Many (M:N)

Requires a junction table.

```
orders (N) >────< order_items >────< products (N)
    │                │                   │
    └── id     order_id, product_id      └── id
```

### One-to-One (1:1)

Rare but supported.

```
users (1) ──────── profiles (1)
   │                   │
   └── id              └── user_id
```

---

## Creating Relationships

### Step 1: Navigate to Relationships

1. Go to **Semantic Layer** > **Models**
2. Click on your model
3. Click the **Relationships** tab
4. Click **+ Add Relationship**

### Step 2: Configure the Relationship

```yaml
Relationship:
  Name: Customer Orders
  Description: Links customers to their orders
  
  From:
    Table: customers
    Column: id
    
  To:
    Table: orders
    Column: customer_id
    
  Type: one_to_many
  
  Join Type: left  # left, inner, full
```

### Step 3: Save and Test

1. Click **Save**
2. Test with a query: "Total sales by customer name"
3. Verify the generated SQL uses correct joins

---

## Relationship Properties

### Join Types

| Type | Description | Use Case |
|------|-------------|----------|
| `left` | Include all rows from "from" table | Keep all customers, even with no orders |
| `inner` | Only matching rows | Only customers with orders |
| `full` | All rows from both tables | Complete outer join |

### Cardinality

Specify the relationship cardinality for query optimization:

```yaml
Cardinality:
  From: one    # one, many
  To: many     # one, many
```

### Relationship Direction

NovaSight can traverse relationships in both directions:

```yaml
Bidirectional: true  # Can navigate customer→orders and orders→customer
```

---

## Relationship Paths

When tables aren't directly connected, define paths:

```
customers ─── orders ─── order_items ─── products

To get from customers to products, traverse:
customers → orders → order_items → products
```

### Automatic Path Resolution

NovaSight automatically finds the shortest path when possible.

### Explicit Paths

For complex schemas, define explicit paths:

```yaml
Relationship Path:
  Name: Customer Products
  Description: Products purchased by customers
  
  Path:
    - customers.id → orders.customer_id
    - orders.id → order_items.order_id
    - order_items.product_id → products.id
```

---

## Fan-Out and Chasm Traps

### Fan-Out Trap

When joining one-to-many relationships, measures can be over-counted.

```
customers ─┬─ orders
           └─ support_tickets

Query: "Total orders and total tickets by customer"
Risk: Cartesian product inflates counts
```

**Solution**: Use separate aggregations or LOD expressions.

### Chasm Trap

Two many-to-one relationships meeting at a shared table.

```
orders ─────┐
            ├─ customers ─┬─ regions
returns ────┘             │
                          └─ segments
```

**Solution**: Define explicit relationship paths.

---

## Visual Relationship Editor

NovaSight includes a visual editor for relationships:

1. Go to **Semantic Layer** > **Relationships**
2. Click **Visual Editor**
3. Drag tables onto the canvas
4. Draw lines to create relationships
5. Click on lines to configure

---

## Relationship Validation

NovaSight validates relationships automatically:

### Referential Integrity Check

```yaml
Validation:
  Check Integrity: true  # Verify all foreign keys exist
  Sample Size: 1000      # Rows to check
  Fail on Error: false   # Warn only
```

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Orphan records | Missing parent rows | Clean data or use left join |
| Duplicate keys | Multiple matches | Verify uniqueness constraints |
| Type mismatch | Join fails | Cast columns to matching types |

---

## Performance Considerations

### Index Foreign Keys

Ensure all join columns are indexed:

```sql
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### Avoid Deep Paths

Limit relationship depth:

```yaml
Max Path Depth: 4  # Limit join chains
```

### Pre-Join Tables

For frequently used combinations, create materialized views.

---

## Examples

### E-Commerce Schema

```yaml
Relationships:
  - Name: Customer Orders
    From: customers.id
    To: orders.customer_id
    Type: one_to_many
    
  - Name: Order Products
    From: orders.id
    To: order_items.order_id
    Type: one_to_many
    
  - Name: Item Product
    From: order_items.product_id
    To: products.id
    Type: many_to_one
    
  - Name: Product Category
    From: products.category_id
    To: categories.id
    Type: many_to_one
```

### Self-Referential

For hierarchical data like org charts:

```yaml
Relationship:
  Name: Manager Reports
  From: employees.id
  To: employees.manager_id
  Type: one_to_many
  Self Referential: true
```

---

## Next Steps

- [Create Calculated Fields](calculated-fields.md)
- [Define Dimensions and Measures](dimensions-measures.md)
- [Build Dashboards](../../getting-started/first-dashboard.md)
