# iterflow: Lazy, Composable, Parallel, and Asynchronous Pipelines for JavaScript

## Overview

**iterflow** is a powerful, educational toolkit for building **lazy**, **composable**, and **parallel** data pipelines in JavaScript and TypeScript. Inspired by Python's `itertools.tee` and the Unix `tee` command, iterflow extends familiar paradigms like `Array.map` to work not only with arrays but with **streams, files, paginated APIs, and database cursors**—all in a **single-pass, memory-efficient**, and optionally **asynchronous** manner.

> ⚠️ **Global Modifications Warning**: This package attaches methods directly to `Array` and `Array.prototype`, which may conflict with other code in shared or production environments. Use with caution.

> 🧪 **Experimental Project**: iterflow is a sandbox for learning and exploring lazy and functional data processing. It is not optimized for production use.

---

## Installation

```bash
npm install git+https://github.com/SwapnilB31/iterflow
```

---

## What makes iterflow stand apart after the release of ES2025

With ECMAScript 2025 introducing a built-in `Iterator` with lazy methods like `.map()` and `.filter()`, iterflow enters a new chapter. But it remains **distinct and relevant**:

* ✅ **Async Pipelines**: iterflow supports async sources (e.g., paginated APIs, streams) via `LazyAsyncIterator`, which ES2025 does not.
* ✅ **Iterator Splitting**: `Array.tee` and `.tee()` allow for true parallel, independent consumption of data—absent in the native spec.
* ✅ **Multi-Consumer Arrays**: `Array.prototype.tee` enables simultaneous `map`, `filter`, `reduce`, and `forEach` operations.
* ✅ **Real-World Use Cases**: Build complex workflows like file I/O, ETL, scraping, and more with ease.
* ✅ **Unified API**: Build sync and async pipelines with a consistent interface.

iterflow complements and extends what ES2025 started.

---

## Real-World Use Cases

### 1. Log File Analysis

```ts
import { LazyAsyncIterator } from 'iterflow';
import * as fs from 'fs';
import * as readline from 'readline';

const rl = readline.createInterface({ input: fs.createReadStream(filePath) });

const errorsPerHour = await LazyAsyncIterator.from(logLines('app.log'))
  .map(line => parseLogLine(line))
  .filter(entry => entry.level === 'ERROR')
  .map(entry => entry.timestamp.slice(0, 13))
  .reduce((acc, hour) => ({ ...acc, [hour]: (acc[hour] || 0) + 1 }), {});
```

### 2. Paginated API ETL

```ts
import { LazyAsyncIterator } from 'iterflow';

async function* fetchPages() {
  let page = 1;
  while (page <= 5) {
    yield await fetchProductsPage(page++);
  }
}

const avgPrice = await LazyAsyncIterator.from(fetchPages())
  .mapAsync(page => page.products)
  .mapAsync(products => products.filter(p => p.inStock))
  .mapAsync(products => products.map(p => p.price))
  .reduce((sum, prices) => sum + prices.reduce((a, b) => a + b, 0), 0);
```

### 3. Web Scraping Pipeline

```ts
const headlines = await LazyAsyncIterator.from(urls)
  .mapAsync(fetchAndExtractHeadline)
  .filterAsync(h => h.length > 0)
  .collect();
```

### 4. Database Cursor Aggregation

```ts
const loginCounts = await LazyAsyncIterator.from(userEventsCursor())
  .filterAsync(e => e.type === 'login')
  .reduce((acc, e) => {
    acc[e.userId] = (acc[e.userId] || 0) + 1;
    return acc;
  }, {});
```
 > **ℹ️ Checkout the [examples](./src/examples/) directory for example scripts using iterflow for building pipelines**
---

## Transformations vs Actions: The Core Principle

A fundamental concept in iterflow is the distinction between **Transformations** and **Actions**. Understanding this separation is key to building efficient, composable, and predictable data pipelines:

### Transformations

* **What are they?**
  * Methods like `map`, `filter`, `forEach`, `mapAsync`, `filterAsync`, and `forEachAsync`.
* **How do they work?**
  * They are **chainable** and **lazy**—each call builds up a pipeline of operations, but **no computation happens** until you trigger an action.
* **Why does it matter?**
  * You can compose complex workflows without creating intermediate arrays or consuming memory for unused results.
  * This enables single-pass, memory-efficient processing, even for infinite or streaming sources.

### Actions

* **What are they?**
  * Methods like `collect`, `reduce`, `take`, `drop`, `takeWhile`, and `dropWhile` (and their async/settled variants).
* **How do they work?**
  * They are **terminal** and **eager**—calling an action triggers the actual computation, consuming the pipeline and producing a result (array, object, etc.).
* **Why does it matter?**
  * Actions are the only way to get results out of a pipeline. They let you control when and how much data is processed, making it easy to work with large or infinite sources.

> **In summary:**
> - **Transformations** build your pipeline, but do nothing until you call an **Action**.
> - **Actions** execute the pipeline and return results.

---

## API Reference

### `Array.tee(source, count)`

Split an iterable into multiple independent, lazy iterators.

```ts
const [a, b] = Array.tee([1, 2, 3, 4], 2);
a.next().value; // 1
b.next().value; // 1
```

### `Array.prototype.tee(...consumers)`

Run multiple operations (`map`, `filter`, `reduce`, `forEach`) in parallel.

```ts
[1, 2, 3, 4].tee(
  { kind: 'map', fn: x => x * 2 },
  { kind: 'filter', fn: x => x % 2 === 0 },
  { kind: 'reduce', fn: (acc, x) => acc + x, initVal: 0 },
  { kind: 'forEach', fn: x => console.log(x) }
);
```

### `LazyIterator.from()`

Create a lazy, composable sync pipeline.

```ts
LazyIterator.from([1, 2, 3, 4])
  .map(x => x * 2)
  .filter(x => x > 4)
  .collect(); // [6, 8]
```

#### LazyIterator API Table

| Method         | Static/Instance | Return Type                                   | Comments                        |
|----------------|-----------------|-----------------------------------------------|----------------------------------|
| from           | Static          | LazyIterator                                  | Throws on error                  |
| map            | Instance        | LazyIterator                                  | Chainable, lazy                  |
| filter         | Instance        | LazyIterator                                  | Chainable, lazy                  |
| forEach        | Instance        | LazyIterator                                  | Chainable, lazy                  |
| reduce         | Instance        | ReduceExecutor                                | Terminal, eager, throws on error |
| toArray        | Instance        | Array                                         | Alias for collect                |
| tee            | Instance        | LazyIterator[]                                | Splits into N independent pipes  |
| collect        | Instance        | Array                                         | Terminal, eager, throws on error |
| take           | Instance        | Array                                         | Terminal, eager, throws on error |
| drop           | Instance        | Array                                         | Terminal, eager, throws on error |
| takeWhile      | Instance        | Array                                         | Terminal, eager, throws on error |
| dropWhile      | Instance        | Array                                         | Terminal, eager, throws on error |

---

### `LazyAsyncIterator.from()`

Create a lazy, composable async pipeline.

```ts
await LazyAsyncIterator.from(fetchPages())
  .mapAsync(page => page.items)
  .filterAsync(items => items.length > 0)
  .collect();
```

#### LazyAsyncIterator API Table

| Method           | Static/Instance | Return Type                                   | Comments                                      |
|------------------|-----------------|-----------------------------------------------|-----------------------------------------------|
| from             | Static          | LazyAsyncIterator                             | Throws on error                               |
| map              | Instance        | LazyAsyncIterator                             | Chainable, lazy                               |
| filter           | Instance        | LazyAsyncIterator                             | Chainable, lazy                               |
| forEach          | Instance        | LazyAsyncIterator                             | Chainable, lazy                               |
| mapAsync         | Instance        | LazyAsyncIterator                             | Chainable, lazy                               |
| filterAsync      | Instance        | LazyAsyncIterator                             | Chainable, lazy                               |
| forEachASync     | Instance        | LazyAsyncIterator                             | Chainable, lazy                               |
| reduce           | Instance        | ReduceExecutor                                | Terminal, eager, throws on error              |
| tee              | Instance        | LazyAsyncIterator[]                           | Splits into N independent pipes               |
| collect          | Instance        | Promise<Array>                                | Terminal, eager, throws on error              |
| collectSettled   | Instance        | Promise<Array<PromiseSettledResult>>          | Terminal, returns all settled results         |
| take             | Instance        | Promise<Array>                                | Terminal, eager, throws on error              |
| takeSettled      | Instance        | Promise<Array<PromiseSettledResult>>          | Terminal, returns all settled results         |
| drop             | Instance        | Promise<Array>                                | Terminal, eager, throws on error              |
| dropSettled      | Instance        | Promise<Array<PromiseSettledResult>>          | Terminal, returns all settled results         |
| takeWhile        | Instance        | Promise<Array>                                | Terminal, eager, throws on error              |
| takeWhileSettled | Instance        | Promise<Array<PromiseSettledResult>>          | Terminal, returns all settled results         |
| dropWhile        | Instance        | Promise<Array>                                | Terminal, eager, throws on error              |
| dropWhileSettled | Instance        | Promise<Array<PromiseSettledResult>>          | Terminal, returns all settled results         |


---

## Philosophy

iterflow makes it natural to build **memory-efficient, stream-friendly**, and **asynchronous** data workflows in JavaScript using idioms you already know:

* **Familiar**: Works like `Array.prototype`, behaves like iterators
* **Lazy**: No work is done until you ask for it
* **Composable**: Chain small steps into big workflows
* **Universal**: Works with anything that’s iterable or async iterable
* **Complementary**: A power-tool that builds on top of ES2025, not against it

---

## License

MIT
