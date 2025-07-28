// src/tee.ts
function createTeeIterators(sourceIterable, count) {
  if (arguments.length !== 2)
    throw new Error(`Expected 2 arguments but recieved: ${arguments.length}`);
  if (!sourceIterable[Symbol.iterator])
    throw new Error(`Expected Arg 1 to be an iterator.`);
  if (!(typeof count === "number"))
    throw new Error(`Expected Arg 2 to be an integer`);
  count = Math.floor(count);
  const sourceIterator = sourceIterable[Symbol.iterator]();
  const iteratorIndexPositions = Array(count).fill(0);
  const streamBuffer = [];
  let streamExhausted = false;
  let streamError = null;
  function getNextStreamElement() {
    if (streamExhausted)
      return { value: void 0, done: true };
    if (streamError)
      throw streamError;
    try {
      const result = sourceIterator.next();
      if (result.done)
        streamExhausted = true;
      return result;
    } catch (e) {
      streamError = e;
      throw e;
    }
  }
  function cleanupStreamBuffer() {
    const smallestComsumedIndex = Math.min(...iteratorIndexPositions);
    const deletedElementsCount = smallestComsumedIndex;
    streamBuffer.splice(0, deletedElementsCount);
    for (let i = 0; i < count; i++) {
      iteratorIndexPositions[i] -= deletedElementsCount;
    }
  }
  function createTeedIterator(index) {
    let done = false;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        if (done)
          return { value: void 0, done: true };
        if (iteratorIndexPositions[index] < streamBuffer.length) {
          const value = streamBuffer[iteratorIndexPositions[index]];
          iteratorIndexPositions[index]++;
          cleanupStreamBuffer();
          return { value, done: false };
        }
        const result = getNextStreamElement();
        if (result.done) {
          done = true;
          return { done: true, value: void 0 };
        }
        streamBuffer.push(result.value);
        iteratorIndexPositions[index]++;
        cleanupStreamBuffer();
        return { value: result.value, done: false };
      },
      return(value) {
        if (!done) {
          done = true;
        }
        return { value, done };
      },
      throw(e) {
        if (!done) {
          done = true;
        }
        throw e;
      }
    };
  }
  return Array(count).fill(0).map((_, idx) => createTeedIterator(idx));
}
function teeConsumers(...consumers) {
  if (!Array.isArray(this)) {
    throw new TypeError("teeConsumers must be called on an array");
  }
  if (!consumers.length) {
    throw new Error("At least one consumer must be provided");
  }
  for (const consumer of consumers) {
    if (typeof consumer !== "object" || consumer === null) {
      throw new TypeError("Each consumer must be an object");
    }
    if (!("kind" in consumer) || typeof consumer.kind !== "string") {
      throw new TypeError("Each consumer must have a string kind property");
    }
    if (typeof consumer.fn !== "function") {
      throw new TypeError("Each consumer must have a function fn property");
    }
    if (consumer.kind === "reduce" && !("initVal" in consumer)) {
    }
  }
  const consumerFns = Array.from(consumers);
  const outResults = Array(consumerFns.length).fill(0);
  const iterators = createTeeIterators(this, consumerFns.length);
  for (let consumerIdx = 0; consumerIdx < consumerFns.length; consumerIdx++) {
    const fn = consumerFns[consumerIdx];
    const mapResult = [];
    let reduceResult = fn.kind === "reduce" ? fn.initVal : void 0;
    let filterResult = [];
    let elementIdx = 0;
    for (const elem of iterators[consumerIdx]) {
      switch (fn.kind) {
        case "forEach":
          fn.fn(elem, elementIdx);
          break;
        case "map":
          {
            const val = fn.fn(elem, elementIdx);
            mapResult.push(val);
          }
          break;
        case "reduce":
          {
            if (elementIdx === 0 && reduceResult === void 0) {
              reduceResult = elem;
            } else {
              reduceResult = fn.fn(reduceResult, elem, elementIdx);
            }
          }
          break;
        case "filter":
          {
            if (fn.fn(elem, elementIdx))
              filterResult.push(elem);
          }
          break;
        default:
          throw new Error(`Unknown consumer kind: ${String(fn.kind)}`);
      }
      elementIdx++;
    }
    switch (fn.kind) {
      case "forEach":
        outResults[consumerIdx] = void 0;
        break;
      case "reduce":
        outResults[consumerIdx] = reduceResult;
        break;
      case "map":
        outResults[consumerIdx] = mapResult;
        break;
      case "filter":
        outResults[consumerIdx] = filterResult;
        break;
    }
  }
  return outResults;
}

// src/lazy-iterator.ts
var LazyIterator = class _LazyIterator {
  static from(iter) {
    if (iter === void 0 || iter === null)
      throw new Error("LazyIterator cannot be created from null or undefined");
    if ("next" in iter && typeof iter.next === "function") {
      return new _LazyIterator(iter);
    }
    if (typeof iter === "object" && Symbol.iterator in iter) {
      const iterator = iter[Symbol.iterator]();
      return new _LazyIterator(iterator);
    }
    throw new Error("Couldn't create LazyIterator. no valid iterator");
  }
  constructor(iterator) {
    this.iterator = iterator;
    this.methods = [];
    this.exhausted = false;
    this.caughtError = null;
    this.index = 0;
  }
  executeFunctMethod(method, val, index) {
    switch (method.kind) {
      case "map":
      case "filter":
      case "forEach": {
        const fn = method.fn;
        return fn(val, index);
      }
      case "reduce": {
        const fn = method.fn;
        return fn({}, val, index);
      }
      default:
        return {};
    }
  }
  next() {
    if (this.exhausted)
      return { done: true, value: void 0 };
    while (true) {
      const nextVal = this.iterator.next();
      if (nextVal.done) {
        this.exhausted = true;
        return { done: true, value: void 0 };
      }
      if (this.methods.length === 0)
        return { value: nextVal.value, done: false };
      let filterFail = false;
      let a = nextVal.value;
      for (let i = 0; i < this.methods.length; i++) {
        let retVal = this.executeFunctMethod(this.methods[i], a, this.index);
        if (this.methods[i].kind === "map")
          a = retVal;
        if (this.methods[i].kind === "filter" && retVal === false) {
          filterFail = true;
          break;
        }
      }
      this.index++;
      if (filterFail)
        continue;
      return { done: false, value: a };
    }
  }
  return(value) {
    if (!this.exhausted) {
      this.exhausted = true;
    }
    return { value, done: this.exhausted };
  }
  throw(e) {
    if (!this.exhausted) {
      this.exhausted = true;
    }
    return { done: this.exhausted, value: void 0 };
  }
  [Symbol.iterator]() {
    return this;
  }
  map(cb) {
    this.methods.push({
      fn: cb,
      kind: "map"
    });
    return this;
  }
  filter(cb) {
    this.methods.push({
      fn: cb,
      kind: "filter"
    });
    return this;
  }
  forEach(cb) {
    this.methods.push({
      fn: cb,
      kind: "forEach"
    });
    return this;
  }
  reduce(cb, initVal) {
    this.methods.push({
      fn: cb,
      kind: "reduce",
      initVal
    });
    const lazyIterator = this;
    const reduceExec = new ReduceExecutor(lazyIterator);
    return reduceExec;
  }
  toArray() {
    return this.collect();
  }
  tee(count) {
    return createTeeIterators(this, count).map((v) => _LazyIterator.from(v));
  }
  collect() {
    const out = [];
    for (const elem of this) {
      out.push(elem);
    }
    return out;
  }
  take(n) {
    if (typeof n !== "number" || n < 0)
      throw new Error("take(n): n must be a non-negative number");
    const out = [];
    let count = 0;
    for (const elem of this) {
      if (count++ >= n)
        break;
      out.push(elem);
    }
    return out;
  }
  drop(n) {
    if (typeof n !== "number" || n < 0)
      throw new Error("drop(n): n must be a non-negative number");
    const out = [];
    let count = 0;
    for (const elem of this) {
      if (count++ < n)
        continue;
      out.push(elem);
    }
    return out;
  }
  takeWhile(predicate) {
    const out = [];
    let idx = 0;
    for (const elem of this) {
      if (!predicate(elem, idx))
        break;
      out.push(elem);
      idx++;
    }
    return out;
  }
  dropWhile(predicate) {
    const out = [];
    let idx = 0;
    let dropping = true;
    for (const elem of this) {
      if (dropping && predicate(elem, idx)) {
        idx++;
        continue;
      }
      dropping = false;
      out.push(elem);
      idx++;
    }
    return out;
  }
};
var ReduceExecutor = class {
  constructor(lazyIterator) {
    this.lazyIterator = lazyIterator;
  }
  execute() {
    const reduceMethod = this.lazyIterator.methods.at(-1);
    this.lazyIterator.methods.slice(0, -1);
    const array = this.lazyIterator.collect();
    const result = array.reduce(reduceMethod.fn, reduceMethod.initVal);
    return result;
  }
};

// src/index.ts
Array.tee = createTeeIterators;
Array.prototype.tee = teeConsumers;
export {
  LazyIterator
};
//# sourceMappingURL=index.mjs.map
