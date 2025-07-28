# tee-js

Efficient, Lazy, Multi-Pass Stream Splitting and Composable Iterators for JavaScript

## Motivation
Inspired by the Unix `tee` command, Python's `itertools.tee`, and modern stream processing, `tee-js` brings powerful, lazy, and parallel data workflows to JavaScript. It enables you to split iterables, process streams in parallel, and build advanced pipelines with composable lazy iterators.

## Features
- **Array.tee**: Split any iterable into multiple independent, lazy iterators for parallel consumption.
- **Array.prototype.tee**: Apply multiple consumer operations (map, filter, reduce, forEach) in parallel to an array, returning results for each consumer.
- **LazyIterator**: Chainable, composable, lazy iterator supporting map, filter, reduce, forEach, take, drop, tee, and more.
- **TypeScript Support**: Full type definitions and module augmentation for seamless integration.
- **Robust Error Handling**: Runtime validation of arguments and consumer configurations.

## Installation
```bash
npm install git+https://github.com/SwapnilB31/tee-js
```

## Quickstart
```js
import 'tee-js'; // For Array.tee and Array.prototype.tee
import { LazyIterator } from 'tee-js'; // For LazyIterator
```

## Usage
### 1. Array.tee
Split any iterable into multiple independent, lazy iterators:
```js
const arr = [1,2,3,4,5,6];
const [iter1, iter2] = Array.tee(arr,2);

for(let i = 0; i < 3; i++) {
  console.log("iter1", iter1.next());
  console.log("iter2", iter2.next());
}
// prints iter1: 1, 2, 3
// prints iter2: 1, 2, 3

arr.splice(3, 0, 13, 15); // mutate source array after iterator creation

for(let i = 3; i < arr.length; i++) {
  console.log("iter1", iter1.next());
  console.log("iter2", iter2.next());
}
// prints iter1: 13, 15, 4, 5, 6
// prints iter2: 13, 15, 4, 5, 6
```
**Note:**
- `Array.tee` creates lazy, independent iterators that only consume the source as needed.
- The memory overhead is constant, regardless of the number of `teed` iterators created. Never exceeding the number of elements of the source iterator.
- If the source array is mutated after iterator creation, the iterators will reflect those changes when they reach those elements.

### 2. Array.prototype.tee
Apply multiple consumers in parallel:
```js
const arr = [1, 2, 3, 4];
const results = arr.tee(
  { kind: 'map', fn: x => x * 2 },
  { kind: 'filter', fn: x => x % 2 === 0 },
  { kind: 'reduce', fn: (acc, x) => acc + x, initVal: 0 },
  { kind: 'forEach', fn: x => console.log(x) }
);
// results: [[2, 4, 6, 8], [2, 4], 10, undefined]
```

### 3. LazyIterator
Build advanced, lazy pipelines with composable methods:
```js
import { LazyIterator } from 'tee-js';

function* gen2dStringArr() {
    yield ['a', 'bb', 'ccc'],
    yield ['dddd', 'ee', 'f'],
    yield ['ggggg', 'hhh']
    return
}

const lazy = LazyIterator.from(gen2dStringArr())
  .map(row => {
    const lengths = row.map(s => s.length);
    return {
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths)
    };
  });

console.log([...lazy]);
// [ { minLength: 1, maxLength: 3 }, { minLength: 1, maxLength: 4 }, { minLength: 3, maxLength: 5 } ]

const overall = lazy.reduce((acc, curr) => ({
  minLength: Math.min(acc.minLength, curr.minLength),
  maxLength: Math.max(acc.maxLength, curr.maxLength)
}), { minLength: Infinity, maxLength: -Infinity }).execute();

console.log(overall); // { minLength: 1, maxLength: 5 }
```

## API Reference
### Array.tee(iterable, count)
- **iterable**: Any JavaScript iterable (Array, Set, custom iterable, etc.)
- **count**: Number of independent iterators to create
- **Returns**: Array of independent, lazy iterators

### Array.prototype.tee(...consumers)
- **consumers**: Objects specifying `kind` (`map`, `filter`, `reduce`, `forEach`) and a function `fn`. For `reduce`, an optional `initVal`.
- **Returns**: Array of results, one for each consumer

### LazyIterator
A composable, lazy iterator for building advanced data pipelines. Methods are divided into:
- **Transformations (chainable, lazy):** `map`, `filter`, `forEach`
- **Actions (terminating, eager):** `reduce`, `collect`/`toArray`, `take`, `drop`, `takeWhile`, `dropWhile`

#### Transformations (Lazy, Chainable)
- **map(fn)**: Lazily maps each value. Returns a new LazyIterator.
- **filter(fn)**: Lazily filters values. Returns a new LazyIterator.
- **forEach(fn)**: Lazily applies a function to each value for side effects. Pass-through: returns a LazyIterator so you can keep chaining. Example:
  ```js
  LazyIterator.from([1,2,3])
    .map(x => x + 1)
    .forEach(x => console.log(x))
    .filter(x => x % 2 === 0)
    .collect(); // [2, 4]
  ```

#### Actions (Terminating Operations)
- **reduce(fn, initVal)**: Reduces values to a single result. Triggers computation. Returns a ReduceExecutor; call `.execute()` to get the result.
- **collect() / toArray()**: Collects all values into an array. Triggers computation.
- **take(n)**: Returns an array of the first n values. Triggers computation.
- **drop(n)**: Returns an array after dropping the first n values. Triggers computation.
- **takeWhile(fn)**: Returns an array of values while predicate is true. Triggers computation.
- **dropWhile(fn)**: Returns an array after dropping values while predicate is true. Triggers computation.
- **tee(count)**: Splits the iterator into multiple independent lazy iterators.
- **[Symbol.iterator]()**: Makes LazyIterator compatible with for...of and spread syntax.

#### Transformations vs Actions
- **Transformations** (`map`, `filter`, `forEach`) are lazy: they build up a pipeline of operations but do not process any data until an action is called.
- **Actions** (`reduce`, `collect`, `take`, etc.) are eager: they trigger the actual computation and consume the iterator.
- This separation allows you to compose complex pipelines efficiently, with computation deferred until you actually need results.
- Example:
  ```js
  // No computation happens until collect() is called
  const pipeline = LazyIterator.from([1,2,3,4])
    .map(x => x * 2)
    .filter(x => x > 4)
    .forEach(x => console.log('Side effect:', x));
  const result = pipeline.collect(); // triggers all transformations
  // Output: Side effect: 6\nSide effect: 8
  // result: [6, 8]
  ```
## Composability & Lazy Evaluation
- All LazyIterator methods are chainable and lazy; computation happens only when values are requested.
- Enables efficient, single-pass, memory-friendly stream processing and advanced pipelines.

## Global Namespace Warning
This package attaches methods directly to `Array` and `Array.prototype`, polluting the global namespace. Use with caution in shared, production, or library codebases to avoid unexpected behavior or compatibility issues.

## Why tee-js?
- Enables advanced stream processing and parallel workflows in JavaScript
- Familiar API for those coming from Unix or Python backgrounds
- Designed for correctness, composability, and developer experience
- LazyIterator enables expressive, efficient, and flexible data pipelines

## License
MIT

## Author
[github.com/SwapnilB31](https://github.com/SwapnilB31)
