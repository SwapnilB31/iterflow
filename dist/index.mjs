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
function makeTeeBufferHelpers(count) {
  const iteratorIndexPositions = Array(count).fill(0);
  const streamBuffer = [];
  return {
    iteratorIndexPositions,
    streamBuffer,
    cleanupStreamBuffer() {
      const smallestConsumedIndex = Math.min(...iteratorIndexPositions);
      const deletedElementsCount = smallestConsumedIndex;
      streamBuffer.splice(0, deletedElementsCount);
      for (let i = 0; i < count; i++) {
        iteratorIndexPositions[i] -= deletedElementsCount;
      }
    }
  };
}
function createAsyncTeeIterators(sourceAsyncIterable, count) {
  if (arguments.length !== 2)
    throw new Error(`Expected 2 arguments but received: ${arguments.length}`);
  if (!sourceAsyncIterable || typeof sourceAsyncIterable !== "object")
    throw new Error(`Expected Arg 1 to be an async iterable or async iterator.`);
  if (!(typeof count === "number"))
    throw new Error(`Expected Arg 2 to be an integer`);
  count = Math.floor(count);
  let sourceIterator;
  if (typeof sourceAsyncIterable[Symbol.asyncIterator] === "function") {
    sourceIterator = sourceAsyncIterable[Symbol.asyncIterator]();
  } else if (typeof sourceAsyncIterable.next === "function") {
    sourceIterator = sourceAsyncIterable;
  } else {
    throw new Error("Source is not async iterable or async iterator");
  }
  const { iteratorIndexPositions, streamBuffer, cleanupStreamBuffer } = makeTeeBufferHelpers(count);
  let streamExhausted = false;
  let streamError = null;
  async function getNextStreamElementAsync() {
    if (streamExhausted)
      return { value: void 0, done: true };
    if (streamError)
      throw streamError;
    try {
      const result = await sourceIterator.next();
      if (result.done)
        streamExhausted = true;
      return result;
    } catch (e) {
      streamError = e;
      throw e;
    }
  }
  function createTeedAsyncIterator(index) {
    let done = false;
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (done)
          return { value: void 0, done: true };
        if (iteratorIndexPositions[index] < streamBuffer.length) {
          const value = streamBuffer[iteratorIndexPositions[index]];
          iteratorIndexPositions[index]++;
          cleanupStreamBuffer();
          return { value, done: false };
        }
        const result = await getNextStreamElementAsync();
        if (result.done) {
          done = true;
          return { done: true, value: void 0 };
        }
        streamBuffer.push(result.value);
        iteratorIndexPositions[index]++;
        cleanupStreamBuffer();
        return { value: result.value, done: false };
      },
      async return(value) {
        if (!done) {
          done = true;
        }
        return { value, done };
      },
      async throw(e) {
        if (!done) {
          done = true;
        }
        throw e;
      }
    };
  }
  return Array(count).fill(0).map((_, idx) => createTeedAsyncIterator(idx));
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
  /**
   * Creates a LazyIterator from an iterator or iterable.
   *
   * @throws Error If the input is null, undefined, or not an iterator/iterable.
   */
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
  /**
   * Constructs a LazyIterator from a given iterator.
   */
  constructor(iterator) {
    this.iterator = iterator;
    this._methods = [];
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
  /**
   * Returns the next value in the iterator, applying all chained methods.
   *
   * @throws Error If the iterator is already exhausted.
   */
  next() {
    if (this.exhausted)
      return { done: true, value: void 0 };
    while (true) {
      const nextVal = this.iterator.next();
      if (nextVal.done) {
        this.exhausted = true;
        return { done: true, value: void 0 };
      }
      if (this._methods.length === 0)
        return { value: nextVal.value, done: false };
      let filterFail = false;
      let a = nextVal.value;
      for (let i = 0; i < this._methods.length; i++) {
        let retVal = this.executeFunctMethod(this._methods[i], a, this.index);
        if (this._methods[i].kind === "map")
          a = retVal;
        if (this._methods[i].kind === "filter" && retVal === false) {
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
  /**
   * Marks the iterator as exhausted and returns the given value.
   */
  return(value) {
    if (!this.exhausted) {
      this.exhausted = true;
    }
    return { value, done: this.exhausted };
  }
  /**
   * Marks the iterator as exhausted due to an error.
   */
  throw(e) {
    if (!this.exhausted) {
      this.exhausted = true;
    }
    return { done: this.exhausted, value: void 0 };
  }
  /**
   * Returns itself as an iterator.
   */
  [Symbol.iterator]() {
    return this;
  }
  /**
   * Lazily maps each value using the provided callback.
   */
  map(cb) {
    this._methods.push({
      fn: cb,
      kind: "map"
    });
    return this;
  }
  /**
   * Lazily filters values using the provided predicate.
   */
  filter(cb) {
    this._methods.push({
      fn: cb,
      kind: "filter"
    });
    return this;
  }
  /**
   * Lazily performs a side effect for each value using the provided callback.
   *
   * Note: Unlike Array.prototype.forEach, this does not terminate or consume the iterator. It is a pass-through operation and can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
   */
  forEach(cb) {
    this._methods.push({
      fn: cb,
      kind: "forEach"
    });
    return this;
  }
  /**
   * Lazily reduces values to a single result using the provided reducer and initial value.
   */
  reduce(cb, initVal) {
    this._methods.push({
      fn: cb,
      kind: "reduce",
      initVal
    });
    const lazyIterator = this;
    const reduceExec = new ReduceExecutor(lazyIterator);
    return reduceExec;
  }
  /**
   * Collects all values into an array.
   */
  toArray() {
    return this.collect();
  }
  /**
   * Creates multiple independent iterators (tees) from this iterator.
   *
   * @throws Error If count is not a positive integer.
   */
  tee(count) {
    return createTeeIterators(this, count).map((v) => _LazyIterator.from(v));
  }
  /**
   * Collects all values into an array (alias for toArray).
   */
  collect() {
    const out = [];
    for (const elem of this) {
      out.push(elem);
    }
    return out;
  }
  /**
   * Takes the first n values from the iterator.
   *
   * @throws Error If n is negative or not a number.
   */
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
  /**
   * Skips the first n values from the iterator.
   *
   * @throws Error If n is negative or not a number.
   */
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
  /**
   * Takes values while the predicate returns true.
   */
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
  /**
   * Skips values while the predicate returns true, then collects the rest.
   */
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
  /**
   * Executes the reduce operation and returns the result.
   */
  execute() {
    const reduceMethod = this.lazyIterator._methods.at(-1);
    this.lazyIterator._methods.slice(0, -1);
    const array = this.lazyIterator.collect();
    const result = array.reduce(reduceMethod.fn, reduceMethod.initVal);
    return result;
  }
};

// src/lazy-async-iterator.ts
var LazyAsyncIterator = class _LazyAsyncIterator {
  /**
   * Constructs a LazyAsyncIterator from a given iterator or async iterator.
   */
  constructor(iterator) {
    this.iterator = iterator;
    this.methods = [];
    this.exhausted = false;
    this.caughtError = null;
    this.index = 0;
  }
  /**
   * Creates a LazyAsyncIterator from an iterator, async iterator, iterable, or async iterable.
   *
   * @throws Error If the input is null, undefined, or not an iterator/iterable.
   */
  static from(input) {
    if (input === void 0 || input === null) {
      throw new Error("LazyAsyncIterator cannot be created from null or undefined");
    }
    if (typeof input === "object" && "next" in input && typeof input.next === "function" && Symbol.asyncIterator in input) {
      return new _LazyAsyncIterator(input);
    }
    if (typeof input === "object" && "next" in input && typeof input.next === "function" && Symbol.iterator in input) {
      return new _LazyAsyncIterator(input);
    }
    if (typeof input === "object" && Symbol.asyncIterator in input) {
      const iterator = input[Symbol.asyncIterator]();
      return new _LazyAsyncIterator(iterator);
    }
    if (typeof input === "object" && Symbol.iterator in input) {
      const iterator = input[Symbol.iterator]();
      return new _LazyAsyncIterator(iterator);
    }
    throw new Error("Couldn't create LazyAsyncIterator. No valid iterator or iterable provided.");
  }
  async getNextElement() {
    if (Symbol.iterator in this.iterator || Symbol.asyncIterator in this.iterator)
      return this.iterator.next();
    return { done: true, value: void 0 };
  }
  async executeChainedMethod(method, value, index) {
    return method.fn(value, index);
  }
  executeReduceMethod(method, value, index, initVal) {
    return method.fn(initVal, value, index);
  }
  [Symbol.asyncIterator]() {
    return this;
  }
  /**
   * Returns the next value in the iterator, applying all chained methods (sync and async).
   *
   * @throws Error If the iterator is already exhausted.
   */
  async next() {
    if (this.exhausted)
      return { done: true, value: void 0 };
    while (true) {
      const nextResult = await this.getNextElement();
      if (nextResult.done) {
        this.exhausted = true;
        return { done: true, value: void 0 };
      }
      if (this.methods.length === 0)
        return { done: false, value: nextResult.value };
      let opResult = nextResult.value;
      let filterFail = false;
      for (const method of this.methods) {
        let retVal;
        if (method.kind !== "reduce") {
          retVal = await this.executeChainedMethod(method, opResult, this.index);
        } else {
          this.executeReduceMethod(method, opResult, this.index, method.initVal);
        }
        if (method.kind === "map" || method.kind === "mapAsync")
          opResult = retVal;
        if ((method.kind === "filter" || method.kind === "filterAsync") && !retVal) {
          filterFail = true;
          break;
        }
      }
      this.index++;
      if (filterFail)
        continue;
      return { done: false, value: opResult };
    }
  }
  /**
   * Marks the iterator as exhausted and returns the given value.
   */
  async return(value) {
    if (!this.exhausted) {
      this.exhausted = true;
    }
    return { value, done: this.exhausted };
  }
  /**
   * Marks the iterator as exhausted due to an error.
   */
  async throw(e) {
    if (!this.exhausted) {
      this.exhausted = true;
    }
    return { done: this.exhausted, value: void 0 };
  }
  /**
   * Lazily maps each value using the provided callback (sync).
   */
  map(cb) {
    this.methods.push({
      kind: "map",
      fn: cb
    });
    return this;
  }
  /**
   * Lazily filters values using the provided predicate (sync).
   */
  filter(cb) {
    this.methods.push({
      kind: "filter",
      fn: cb
    });
    return this;
  }
  /**
   * Lazily performs a side effect for each value using the provided callback (sync).
   *
   * Note: This is a pass-through, non-terminating operation. It can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
   */
  forEach(cb) {
    this.methods.push({
      kind: "forEach",
      fn: cb
    });
    return this;
  }
  /**
   * Lazily maps each value using the provided async callback.
   */
  mapAsync(cb) {
    this.methods.push({
      kind: "mapAsync",
      fn: cb
    });
    return this;
  }
  /**
   * Lazily filters values using the provided async predicate.
   */
  filterAsync(cb) {
    this.methods.push({
      kind: "filterAsync",
      fn: cb
    });
    return this;
  }
  /**
   * Lazily performs a side effect for each value using the provided async callback.
   *
   * Note: This is a pass-through, non-terminating operation. It can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
   */
  forEachASync(cb) {
    this.methods.push({
      kind: "forEachAsync",
      fn: cb
    });
    return this;
  }
  /**
   * Lazily reduces values to a single result using the provided reducer and initial value (sync).
   */
  reduce(cb, initVal) {
    this.methods.push({
      fn: cb,
      kind: "reduce",
      initVal
    });
    const lazyIterator = this;
    const reduceExec = new ReduceExecutor2(lazyIterator);
    return reduceExec;
  }
  /**
   * Executes up to `concurrency` next() calls in parallel and returns all settled results.
   *
   * @throws Error If concurrency is not a positive integer.
   */
  async _batchNext(concurrency) {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.next());
    }
    return Promise.allSettled(promises);
  }
  /**
   * Creates multiple independent async iterators (tees) from this iterator.
   *
   * @throws Error If count is not a positive integer.
   */
  tee(count) {
    return createAsyncTeeIterators(this, count).map((v) => _LazyAsyncIterator.from(v));
  }
  /**
   * Returns all values, throws on error, stops at first done. Supports concurrency.
   *
   * @throws Error If an error occurs in the pipeline.
   */
  async collect(concurrency = 1) {
    const collected = [];
    while (true) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled") {
          if (res.value.done)
            return collected;
          collected.push(res.value.value);
        } else {
          throw res.reason;
        }
      }
    }
  }
  /**
   * Returns all settled results (fulfilled and rejected), stops at first done. Supports concurrency.
   */
  async collectSettled(concurrency = 1) {
    const collected = [];
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "rejected" || res.status === "fulfilled" && !res.value.done)
          collected.push(res);
        if (res.status === "fulfilled" && res.value.done) {
          done = true;
        }
      }
    }
    return collected;
  }
  /**
   * Returns the first n values, throws on error. Supports concurrency.
   *
   * @throws Error If n is negative or not a number, or if an error occurs in the pipeline.
   */
  async take(n, concurrency = 1) {
    if (typeof n !== "number" || n < 0)
      throw new Error("take(n): n must be a non-negative number");
    const out = [];
    let done = false;
    while (!done && out.length < n) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled") {
          if (res.value.done) {
            done = true;
            break;
          }
          if (!res.value.done)
            out.push(res.value.value);
          if (out.length >= n)
            break;
        } else {
          throw res.reason;
        }
      }
    }
    return out.slice(0, n);
  }
  /**
   * Returns the first n settled results (fulfilled or rejected), stops at first done. Supports concurrency.
   *
   * @throws Error If n is negative or not a number.
   */
  async takeSettled(n, concurrency = 1) {
    if (typeof n !== "number" || n < 0)
      throw new Error("takeSettled(n): n must be a non-negative number");
    const out = [];
    let done = false;
    while (!done && out.length < n) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "rejected" || res.status === "fulfilled" && !res.value.done)
          out.push(res);
        if (res.status === "fulfilled" && res.value.done) {
          done = true;
          break;
        }
        if (out.length >= n)
          break;
      }
    }
    return out.slice(0, n);
  }
  /**
   * Drops the first n values, returns the rest, throws on error. Supports concurrency.
   *
   * @throws Error If n is negative or not a number, or if an error occurs in the pipeline.
   */
  async drop(n, concurrency = 1) {
    if (typeof n !== "number" || n < 0)
      throw new Error("drop(n): n must be a non-negative number");
    const out = [];
    let dropped = 0;
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled") {
          if (res.value.done) {
            done = true;
            break;
          }
          if (dropped < n) {
            dropped++;
            continue;
          }
          if (!res.value.done)
            out.push(res.value.value);
        } else {
          throw res.reason;
        }
      }
    }
    return out;
  }
  /**
   * Drops the first n values, returns all settled results for the rest. Supports concurrency.
   *
   * @throws Error If n is negative or not a number.
   */
  async dropSettled(n, concurrency = 1) {
    if (typeof n !== "number" || n < 0)
      throw new Error("dropSettled(n): n must be a non-negative number");
    const out = [];
    let dropped = 0;
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled" && dropped < n) {
          if (res.value.done) {
            done = true;
            break;
          }
          dropped++;
          continue;
        }
        if (res.status === "rejected")
          out.push(res);
        if (res.status === "fulfilled") {
          if (res.value.done) {
            done = true;
            break;
          } else
            out.push(res);
        }
      }
    }
    return out;
  }
  /**
   * Returns values while predicate is true, throws on error. Supports concurrency.
   *
   * @throws Error If an error occurs in the pipeline.
   */
  async takeWhile(predicate, concurrency = 1) {
    const out = [];
    let idx = 0;
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled") {
          if (res.value.done || !predicate(res.value.value, idx)) {
            done = true;
            break;
          } else
            out.push(res.value.value);
          idx++;
        } else {
          throw res.reason;
        }
      }
    }
    return out;
  }
  /**
   * Returns all settled results while predicate is true, stops at first done. Supports concurrency.
   */
  async takeWhileSettled(predicate, concurrency = 1) {
    const out = [];
    let idx = 0;
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "rejected")
          out.push(res);
        if (res.status === "fulfilled") {
          if (res.value.done || !predicate(res.value.value, idx)) {
            done = true;
            break;
          } else {
            out.push(res);
          }
          idx++;
        }
      }
    }
    return out;
  }
  /**
   * Drops values while predicate is true, returns the rest, throws on error. Supports concurrency.
   *
   * @throws Error If an error occurs in the pipeline.
   */
  async dropWhile(predicate, concurrency = 1) {
    const out = [];
    let idx = 0;
    let dropping = true;
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled") {
          if (res.value.done) {
            done = true;
            break;
          }
          if (dropping && predicate(res.value.value, idx)) {
            idx++;
            continue;
          }
          dropping = false;
          if (!res.value.done)
            out.push(res.value.value);
          idx++;
        } else {
          throw res.reason;
        }
      }
    }
    return out;
  }
  /**
   * Drops values while predicate is true, returns all settled results for the rest. Supports concurrency.
   */
  async dropWhileSettled(predicate, concurrency = 1) {
    const out = [];
    let idx = 0;
    let dropping = true;
    let done = false;
    while (!done) {
      const results = await this._batchNext(concurrency);
      for (const res of results) {
        if (res.status === "fulfilled" && dropping && predicate(res.value.value, idx)) {
          if (res.value.done) {
            done = true;
            break;
          }
          idx++;
          continue;
        }
        if (res.status === "rejected")
          out.push(res);
        if (res.status === "fulfilled") {
          if (res.value.done) {
            done = true;
            break;
          }
          if (dropping && predicate(res.value.value, idx)) {
            idx++;
            continue;
          }
          if (!res.value.done)
            out.push(res);
          dropping = false;
          idx++;
        }
      }
    }
    return out;
  }
};
var ReduceExecutor2 = class {
  constructor(lazyIterator) {
    this.lazyIterator = lazyIterator;
  }
  /**
   * Executes the reduce operation and returns the result.
   */
  async execute() {
    const reduceMethod = this.lazyIterator.methods.at(-1);
    this.lazyIterator.methods.slice(0, -1);
    const array = await this.lazyIterator.collect();
    const result = array.reduce(reduceMethod.fn, reduceMethod.initVal);
    return result;
  }
};

// src/index.ts
Array.tee = createTeeIterators;
Array.prototype.tee = teeConsumers;
export {
  LazyAsyncIterator,
  LazyIterator
};
//# sourceMappingURL=index.mjs.map
