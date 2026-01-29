# Common Issues

This guide covers common issues you may encounter when using NovaSight and how to resolve them.

## Connection Issues

### Cannot Connect to Data Source

**Symptoms:**
- "Connection refused" error
- "Connection timeout" error
- "Authentication failed" error

**Solutions:**

1. **Check credentials**
   - Verify username and password
   - Ensure user has necessary permissions

2. **Check network access**
   - Verify firewall allows connections
   - Check if VPN is required
   - Confirm correct host and port

3. **Check SSL settings**
   - Ensure SSL mode matches server requirements
   - Upload correct certificates if required

4. **Test from command line**
   ```bash
   # PostgreSQL
   psql -h hostname -p 5432 -U username -d database
   
   # MySQL
   mysql -h hostname -P 3306 -u username -p database
   ```

### SSL Certificate Error

**Symptoms:**
- "SSL certificate verify failed"
- "Unable to verify the first certificate"

**Solutions:**

1. **Upload CA certificate**
   - Get the CA certificate from your database admin
   - Upload in Data Source settings

2. **Try different SSL mode**
   - `require` - SSL required, no verification
   - `verify-ca` - Verify server certificate

3. **Check certificate expiration**
   - Ensure certificates are not expired

---

## Query Issues

### Query Timeout

**Symptoms:**
- "Query execution timeout"
- Queries run indefinitely

**Solutions:**

1. **Add time filter**
   ```
   ❌ "Total sales"
   ✅ "Total sales last 30 days"
   ```

2. **Reduce data scope**
   - Add WHERE clauses
   - Limit results with TOP/LIMIT

3. **Check for missing indexes**
   - Consult your DBA
   - Add indexes on filtered columns

4. **Increase timeout (admin)**
   - Settings > Query > Max Timeout

### No Results Returned

**Symptoms:**
- Empty result set
- "No data found"

**Solutions:**

1. **Check filters**
   - Review applied filters
   - Verify date range includes data
   - Clear all filters and retry

2. **Check Row-Level Security**
   - Verify your user has access to data
   - Contact admin for RLS settings

3. **Verify semantic layer**
   - Check dimension/measure definitions
   - Ensure tables have data

### Wrong Results

**Symptoms:**
- Numbers don't match expected values
- Duplicated or missing data

**Solutions:**

1. **Check the generated SQL**
   - Click "Show SQL" to view query
   - Verify joins and aggregations

2. **Check semantic layer definitions**
   - Verify measure formulas
   - Check relationship definitions

3. **Check for duplicate relationships**
   - Multiple join paths can cause fan-out

---

## Natural Language Query Issues

### "I Didn't Understand That Query"

**Symptoms:**
- Query not recognized
- Vague error message

**Solutions:**

1. **Use exact semantic layer terms**
   ```
   ❌ "Show me the money by area"
   ✅ "Total Revenue by Region"
   ```

2. **Simplify the question**
   ```
   ❌ "What was our revenue growth compared to last year by product category excluding returns in Q4?"
   ✅ "Revenue by product category in Q4"
   ```

3. **Add time context**
   ```
   ❌ "Show sales"
   ✅ "Show sales this month"
   ```

### Query Interpreted Incorrectly

**Symptoms:**
- Wrong dimension/measure selected
- Unexpected time period

**Solutions:**

1. **Check auto-complete suggestions**
   - Use Tab to accept exact matches

2. **Be more specific**
   ```
   ❌ "Sales" (ambiguous)
   ✅ "Total Sales Revenue"
   ```

3. **Use explicit time references**
   ```
   ❌ "last month" (could be calendar or rolling)
   ✅ "December 2024" or "previous calendar month"
   ```

---

## Dashboard Issues

### Dashboard Not Loading

**Symptoms:**
- Blank dashboard
- Infinite loading spinner
- Error message

**Solutions:**

1. **Refresh the page**
   - Press F5 or Ctrl+R

2. **Check browser console**
   - Press F12 > Console tab
   - Look for error messages

3. **Clear browser cache**
   - Ctrl+Shift+Delete > Clear cache

4. **Try incognito/private mode**
   - Rules out extension conflicts

### Widget Shows Error

**Symptoms:**
- Red error indicator on widget
- "Failed to load data"

**Solutions:**

1. **Check underlying query**
   - Edit widget > View SQL
   - Test query separately

2. **Check data source connection**
   - Verify connection is healthy
   - Try test connection

3. **Check permissions**
   - Verify access to underlying data

### Slow Dashboard Loading

**Symptoms:**
- Dashboard takes long to load
- Widgets load one at a time

**Solutions:**

1. **Reduce number of widgets**
   - Split into multiple dashboards
   - Remove unused widgets

2. **Add default filters**
   - Limit date range
   - Filter by default dimension

3. **Enable caching**
   - Dashboard Settings > Enable Cache
   - Set appropriate TTL

4. **Optimize queries**
   - Pre-aggregate data
   - Add database indexes

---

## Authentication Issues

### Cannot Log In

**Symptoms:**
- "Invalid credentials"
- Stuck on login page

**Solutions:**

1. **Reset password**
   - Click "Forgot Password"
   - Check email (including spam)

2. **Check SSO configuration**
   - Verify SSO is properly configured
   - Try direct login if available

3. **Check account status**
   - Account may be deactivated
   - Contact administrator

### Session Expired

**Symptoms:**
- Suddenly logged out
- "Session expired" message

**Solutions:**

1. **Log in again**
   - Sessions expire after inactivity

2. **Check session settings**
   - Admin may have short session timeouts

3. **Disable "Remember Me" on shared computers**

---

## Permission Issues

### Access Denied

**Symptoms:**
- "You don't have permission"
- Features are hidden/disabled

**Solutions:**

1. **Verify your role**
   - Settings > My Account > Role

2. **Request access**
   - Contact dashboard owner
   - Request role upgrade from admin

3. **Check Row-Level Security**
   - RLS may be filtering your data

### Cannot Share Dashboard

**Symptoms:**
- Share button disabled
- Cannot add users

**Solutions:**

1. **Check sharing permissions**
   - Only owner/admin can share

2. **Check role permissions**
   - Your role may not allow sharing

---

## Performance Issues

### Slow Query Execution

**Solutions:**

1. **Add time filters**
2. **Reduce dimensions**
3. **Check database indexes**
4. **Use pre-aggregated tables**
5. **Enable query caching**

### High Memory Usage

**Solutions:**

1. **Close unused tabs**
2. **Limit result rows**
3. **Use pagination for large tables**

---

## Browser Issues

### Features Not Working

**Symptoms:**
- Buttons don't respond
- Visual glitches

**Solutions:**

1. **Clear browser cache**
2. **Disable browser extensions**
3. **Try different browser**
4. **Update browser to latest version**

### Supported Browsers

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## Getting Help

If you can't resolve your issue:

1. **Check the FAQ** - [Frequently Asked Questions](faq.md)
2. **Search documentation** - Use the search bar
3. **Contact support** - Include:
   - Error message
   - Steps to reproduce
   - Browser and version
   - Screenshots

---

## Next Steps

- [Performance Optimization](performance.md)
- [FAQ](faq.md)
- [Keyboard Shortcuts](../reference/keyboard-shortcuts.md)
