# tee-js

Efficient, Lazy, Multi-Pass Stream Splitting for JavaScript Arrays

## Motivation
This project was inspired by:
- The Unix `tee` command, which splits output streams for parallel processing.
- Python's `itertools.tee`, enabling multiple independent iterators from a single iterable.
- Stream processing workflows and DAGs, where splitting and parallel consumption of data streams is a core requirement.
- Curiosity about how a `tee` operation would fit into the context of ECMAScript Array methods, enabling familiar, expressive APIs for JavaScript developers.

## Features
- **Array.tee**: Split any iterable into multiple independent, lazy iterators. Each iterator consumes the source only as needed, supporting parallel, single-pass workflows.
- **Array.prototype.tee**: Apply multiple consumer operations (map, filter, reduce, forEach) in parallel to an array, with results returned in the order of consumers.
- **TypeScript Support**: Full type definitions and module augmentation for seamless integration and editor IntelliSense.
- **Robust Error Handling**: Runtime validation of arguments and consumer configurations.
- **Inspired by Proven Patterns**: Combines ideas from Unix, Python, and modern stream processing.

## Installation
```bash
npm install tee-js
```

## Usage
### Array.tee

```js
import 'tee-js';

const arr = [1, 2, 3, 4];
const [it1, it2] = Array.tee(arr, 2);
console.log(it1.next().value); // 1
console.log(it2.next().value); // 1
console.log(it1.next().value); // 2
console.log(it2.next().value); // 2
```

### Array.tee with Sets
```js
import 'tee-js';

const set = new Set([10, 20, 30]);
const [it1, it2] = Array.tee(set, 2);
console.log(Array.from(it1)); // [10, 20, 30]
console.log(Array.from(it2)); // [10, 20, 30]
```

### Array.tee with Generators
```js
import 'tee-js';

function* gen() {
  yield 'a';
  yield 'b';
  yield 'c';
}
const [itA, itB] = Array.tee(gen(), 2);
console.log(Array.from(itA)); // ['a', 'b', 'c']
console.log(Array.from(itB)); // ['a', 'b', 'c']
```

### Array.prototype.tee
```js
const arr = [1, 2, 3, 4];
const results = arr.tee(
  { kind: 'map', fn: (x, i) => x * 2 },
  { kind: 'filter', fn: (x, i) => x % 2 === 0 },
  { kind: 'reduce', fn: (acc, x, i) => acc + x, initVal: 0 },
  { kind: 'forEach', fn: (x, i) => console.log(x) }
);
// results: [[2, 4, 6, 8], [2, 4], 10, undefined]
```

## API
### Array.tee(iterable, count)
- **iterable**: Any JavaScript iterable (Array, Set, custom iterable, etc.)
- **count**: Number of independent iterators to create
- **Returns**: Array of independent, lazy iterators

### Array.prototype.tee(...consumers)
- **consumers**: One or more objects specifying `kind` (`map`, `filter`, `reduce`, `forEach`) and a function `fn`. For `reduce`, an optional `initVal` can be provided.
- **Returns**: Array of results, one for each consumer

## Important Note: Global Namespace Pollution
This package attaches methods directly to `Array` and `Array.prototype`, polluting the global namespace. This means:
- All arrays in your environment will have a `.tee` method, and `Array.tee` will be available globally.
- There is a risk of conflicts with other libraries or future ECMAScript standards that may introduce similar methods.
- Use with caution in shared, production, or library codebases to avoid unexpected behavior or compatibility issues.

## Why is Stream Splitting Powerful?
Splitting a stream allows you to:
- Process the same data in multiple ways, in parallel, without re-traversing the source.
- Enable lazy, single-pass operations for efficiency and composability in data pipelines.
- Mirror powerful paradigms from Unix and Python in JavaScript, making your code more expressive and flexible.

## Why tee-js?
- Enables advanced stream processing and parallel workflows in JavaScript
- Familiar API for those coming from Unix or Python backgrounds
- Designed for correctness and developer experience

## Disclaimer
This package is experimental and created for educational purposes. It makes no claims about speed or performance and should not be used in production systems without thorough evaluation.

## License
MIT

## Author
github.com/SwapnilB31
