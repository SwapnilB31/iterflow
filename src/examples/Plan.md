# Example Plan for LazyIterator and LazyAsyncIterator (Advanced, Realistic, TypeScript)

This plan lists advanced, realistic, multi-step pipeline examples for both LazyIterator and LazyAsyncIterator, using TypeScript and real-looking data.

---

## LazyIterator Examples (Sync, TypeScript)

### 1. CSV Data Pipeline: Customer Analytics
- **Data:** `data/customers.csv` (realistic customer data)
- **Pipeline:**
  1. Read CSV line-by-line
  2. Parse CSV to objects
  3. Filter active customers
  4. Map to {id, name, totalSpent}
  5. Reduce to find top spender
- **File:** `LazyIterator/csv-customer-analytics.ts`

### 2. Log Processing: Error Rate Analysis
- **Data:** `data/app.log` (realistic log lines)
- **Pipeline:**
  1. Read log file line-by-line
  2. Parse log level and timestamp
  3. Filter ERROR lines
  4. Group by hour
  5. Count errors per hour
- **File:** `LazyIterator/log-error-rate.ts`

---

## LazyAsyncIterator Examples (Async, TypeScript)

### 1. Paginated API: Product Catalog ETL
- **Data:** Simulated paginated API (realistic product data)
- **Pipeline:**
  1. Fetch all pages
  2. Flatten products
  3. Filter in-stock
  4. Map to {id, name, price}
  5. Calculate average price
- **File:** `LazyAsyncIterator/paginated-product-etl.ts`

### 2. Web Scraping: News Headlines Extraction
- **Data:** List of real news URLs (or simulated)
- **Pipeline:**
  1. Fetch HTML for each URL
  2. Extract headline and date
  3. Filter by date range
  4. Collect all headlines
- **File:** `LazyAsyncIterator/news-headlines.ts`

### 3. Database Cursor: User Activity Aggregation
- **Data:** Simulated DB cursor (realistic user activity events)
- **Pipeline:**
  1. Fetch events
  2. Filter by event type (e.g., 'login')
  3. Group by userId
  4. Count logins per user
- **File:** `LazyAsyncIterator/user-activity-aggregation.ts`

---

For each example:
- Use realistic, multi-field data (CSV, logs, JSON, etc.)
- Build multi-step pipelines (parse, filter, map, group, reduce)
- Use TypeScript for type safety and clarity
- Print or log meaningful results
