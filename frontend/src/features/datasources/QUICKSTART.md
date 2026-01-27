# Data Source UI - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies (if needed)

All dependencies are already in package.json. If you need to reinstall:

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Navigate to: `http://localhost:5173/datasources`

### 3. Backend API Required

Ensure backend is running on `http://localhost:5000` with the data source API endpoints from Prompt 014.

## 📋 Feature Checklist

### List Page (`/datasources`)

- [ ] Displays grid of data source cards
- [ ] Search bar filters by name/host
- [ ] Type filter dropdown (PostgreSQL, MySQL, etc.)
- [ ] Status filter dropdown (Active, Inactive, Error)
- [ ] "Connect Data Source" button opens wizard
- [ ] Empty state when no connections
- [ ] Card shows: name, type, host, port, status, SSL badge
- [ ] Card actions: Test, Sync, Delete

### Connection Wizard

#### Step 1: Select Type
- [ ] Shows 6 database type cards
- [ ] PostgreSQL, MySQL, Oracle, SQL Server, MongoDB, ClickHouse
- [ ] Selected type is highlighted
- [ ] Shows default port for each type

#### Step 2: Connection Details
- [ ] Form fields: name, host, port, database, username, password
- [ ] Password field has show/hide toggle
- [ ] SSL checkbox (enabled by default)
- [ ] Form validation with error messages
- [ ] Port auto-filled based on type

#### Step 3: Test Connection
- [ ] Shows loading spinner while testing
- [ ] Success: green checkmark, version info
- [ ] Failure: red X, error message, retry button
- [ ] Can't proceed without successful test

#### Step 4: Select Tables
- [ ] Shows database schema tree
- [ ] Checkboxes for multi-select
- [ ] Shows table row counts
- [ ] Can skip this step
- [ ] Shows selection count

### Detail Page (`/datasources/:id`)

#### Header
- [ ] Back button to list
- [ ] Data source name and type
- [ ] Test Connection button
- [ ] Sync Now button
- [ ] Delete button

#### Quick Stats Cards
- [ ] Status badge
- [ ] Database type
- [ ] SSL/TLS indicator
- [ ] Last synced time

#### Tabs

**Overview Tab:**
- [ ] Connection details table (host, port, database, username)
- [ ] Created/updated timestamps

**Schema Tab:**
- [ ] Collapsible schema tree
- [ ] Tables with row counts
- [ ] Click to view table (if handler provided)

**Sync History Tab:**
- [ ] Placeholder message

**Settings Tab:**
- [ ] Placeholder message

## 🎨 Visual States

### Loading States
- [ ] Skeleton cards while loading list
- [ ] Spinner in schema browser
- [ ] Button spinners during actions

### Empty States
- [ ] No connections: shows CTA
- [ ] No search results: shows message
- [ ] No schemas: shows message

### Error States
- [ ] Failed to load: red alert
- [ ] Connection failed: red X in wizard
- [ ] Schema load error: inline alert

### Success States
- [ ] Connection test success: green checkmark
- [ ] Create success: toast notification
- [ ] Sync triggered: toast notification

## 🔍 Testing Checklist

### Functional Tests

```bash
# 1. Create a new connection
✓ Click "Connect Data Source"
✓ Select PostgreSQL
✓ Fill form with valid data
✓ Test connection succeeds
✓ Skip table selection
✓ Create connection
✓ See success toast
✓ Redirects to list
✓ New card appears

# 2. View connection details
✓ Click on connection card
✓ See detail page
✓ All tabs accessible
✓ Schema loads correctly

# 3. Test existing connection
✓ Click "Test Connection"
✓ See success message
✓ Toast appears

# 4. Trigger sync
✓ Click "Sync Now"
✓ See success toast
✓ Job ID shown

# 5. Delete connection
✓ Click delete icon
✓ Confirm dialog appears
✓ Connection deleted
✓ Redirects to list

# 6. Search and filter
✓ Type in search box
✓ Results filter instantly
✓ Select type filter
✓ Only matching types shown
✓ Select status filter
✓ Only matching status shown
✓ Clear filters works
```

### Responsive Tests

```bash
# Desktop (1920x1080)
✓ 3 columns in grid
✓ All filters visible
✓ Wizard fits on screen

# Tablet (768x1024)
✓ 2 columns in grid
✓ Filters stack
✓ Wizard scrollable

# Mobile (375x667)
✓ 1 column in grid
✓ Filters stack vertically
✓ Wizard full screen
✓ All interactive elements accessible
```

## 🐛 Common Issues

### Connection Wizard Not Opening
- Check dialog component is imported
- Verify state management

### Schema Not Loading
- Check API endpoint returns data
- Verify datasource ID is valid
- Check network tab for errors

### Form Validation Not Working
- Verify Zod schema is correct
- Check react-hook-form setup
- Console should show validation errors

### Cards Not Clickable
- Check react-router-dom is configured
- Verify routes in App.tsx
- Check onClick handlers

## 📱 Mobile Specific

- [ ] Touch targets min 44x44px
- [ ] Forms keyboard-friendly
- [ ] Dropdowns mobile-optimized
- [ ] No horizontal scroll
- [ ] Font sizes readable

## ♿ Accessibility

- [ ] All interactive elements keyboard accessible
- [ ] Form labels associated
- [ ] Error messages announced
- [ ] Focus visible on all elements
- [ ] Skip links work
- [ ] Color contrast meets WCAG AA

## 🎭 Demo Data

Create a few test connections to populate the UI:

```typescript
// PostgreSQL
{
  name: "Production Analytics",
  db_type: "postgresql",
  host: "db.prod.example.com",
  port: 5432,
  database: "analytics",
  username: "analyst",
  ssl_enabled: true
}

// MySQL
{
  name: "E-commerce DB",
  db_type: "mysql",
  host: "mysql.example.com",
  port: 3306,
  database: "ecommerce",
  username: "app_user",
  ssl_enabled: true
}

// SQL Server
{
  name: "Legacy System",
  db_type: "sqlserver",
  host: "legacy.example.com",
  port: 1433,
  database: "MainDB",
  username: "sa",
  ssl_enabled: false
}
```

## 🔗 Quick Links

- List Page: `/datasources`
- Detail Page: `/datasources/{id}`
- API Docs: `backend/app/api/v1/README_CONNECTIONS.md`
- Implementation: `frontend/src/features/datasources/IMPLEMENTATION_015.md`

---

✅ **Ready for testing!** All components implemented and wired up.
