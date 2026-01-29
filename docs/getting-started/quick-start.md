# Quick Start Guide

Welcome to NovaSight! This guide will help you get up and running in just 10 minutes.

## Prerequisites

- A NovaSight account (sign up at your organization's portal)
- Access to a data source (database credentials or API access)

---

## Step 1: Log In to NovaSight

1. Navigate to your NovaSight instance URL
2. Enter your email and password
3. Click **Sign In**

!!! tip "First Time Login"
    If this is your first login, you may need to set up your password using the link sent to your email.

---

## Step 2: Connect Your Data Source

1. Navigate to **Data Sources** in the left sidebar
2. Click **+ Add Data Source**
3. Select your database type:
   - PostgreSQL
   - MySQL
   - ClickHouse
   - Amazon S3
   - And more...

4. Enter your connection details:

    ```yaml
    Host: your-database.example.com
    Port: 5432  # (or your database port)
    Database: analytics
    Username: novasight_user
    Password: ********
    SSL Mode: require  # (recommended)
    ```

5. Click **Test Connection** to verify connectivity
6. Once successful, click **Save**

!!! warning "Security Best Practice"
    Always use read-only database credentials for NovaSight connections. This prevents accidental data modifications.

---

## Step 3: Explore Your Schema

After connecting, NovaSight automatically introspects your database schema.

1. Click on your new data source
2. Browse available schemas and tables
3. Preview sample data by clicking on any table

You'll see:
- Table names and descriptions
- Column names, types, and statistics
- Sample data preview
- Relationship suggestions

---

## Step 4: Define Your Semantic Layer

The semantic layer translates technical database terms into business language.

1. Go to **Semantic Layer** > **Models**
2. Click **+ Create Model**
3. Give it a name: e.g., "Sales Analytics"
4. Select tables to include

### Define Dimensions

Dimensions are attributes you group or filter by:

| Dimension Name | Source Column | Description |
|---------------|---------------|-------------|
| Customer Name | `customers.name` | Customer full name |
| Product Category | `products.category` | Product category |
| Region | `orders.region` | Sales region |
| Order Date | `orders.created_at` | Date of order |

### Define Measures

Measures are values you calculate:

| Measure Name | Formula | Description |
|-------------|---------|-------------|
| Total Sales | `SUM(orders.amount)` | Total revenue |
| Order Count | `COUNT(orders.id)` | Number of orders |
| Avg Order Value | `AVG(orders.amount)` | Average order size |

5. Click **Save Model**

---

## Step 5: Ask a Question

Now for the magic! Query your data using natural language.

1. Go to **Query** in the sidebar
2. Type your question in the search box:

    ```
    What were total sales by region last month?
    ```

3. Press **Enter** or click **Ask**

NovaSight will:
1. Parse your natural language question
2. Match it to your semantic layer definitions
3. Generate optimized SQL
4. Execute the query
5. Display results in a chart or table

!!! example "Try These Queries"
    - "Top 10 customers by revenue this year"
    - "Monthly sales trend for the last 12 months"
    - "Average order value by product category"
    - "Orders this week compared to last week"

---

## Step 6: Save to a Dashboard

Save your insights for future reference:

1. After running a query, click **Save to Dashboard**
2. Choose **Create New Dashboard**
3. Name it: "Sales Overview"
4. Click **Save**

Your query is now saved as a widget on your dashboard!

---

## Step 7: Build Your Dashboard

Add more widgets to create a complete dashboard:

1. Go to **Dashboards** > **Sales Overview**
2. Click **Edit**
3. Click **+ Add Widget**
4. Choose widget type:
   - **Query Widget**: Run a new natural language query
   - **Chart Widget**: Create a specific chart type
   - **Text Widget**: Add titles or explanations

5. Drag widgets to arrange your layout
6. Resize widgets by dragging corners
7. Click **Save** when done

---

## 🎉 Congratulations!

You've successfully:

- [x] Connected a data source
- [x] Created a semantic model
- [x] Queried data with natural language
- [x] Built your first dashboard

---

## Next Steps

<div class="grid cards" markdown>

-   :material-book-open: **Core Concepts**

    ---

    Understand the fundamental concepts behind NovaSight.

    [:octicons-arrow-right-24: Learn Concepts](concepts.md)

-   :material-view-dashboard: **First Dashboard Tutorial**

    ---

    Build a complete dashboard with step-by-step instructions.

    [:octicons-arrow-right-24: Build Dashboard](first-dashboard.md)

-   :material-database: **Data Sources Deep Dive**

    ---

    Learn about all available data source types and configurations.

    [:octicons-arrow-right-24: Data Sources](../guides/data-sources/connecting-postgresql.md)

-   :material-chat-question: **Natural Language Tips**

    ---

    Master the art of asking effective questions.

    [:octicons-arrow-right-24: Query Tips](../guides/natural-language/tips-tricks.md)

</div>
