/**
 * A function that maps a value and its index to a new value (sync).
 */
type MapFunc<T, S> = (x: T, idx: number) => S;
/**
 * A function that filters values based on a predicate (sync).
 */
type FilterFunc<T, S extends any = any> = (x: T, idx: number) => boolean;
/**
 * A function that performs a side effect for each value (sync).
 */
type ForEachFunc<T, S extends any = any> = (x: T, idx: number) => void;
/**
 * A function that reduces values to a single accumulated result (sync).
 */
type ReduceFunc<T, S> = (acc: S, curr: T, idx: number) => S;
/**
 * A function that maps a value and its index to a new value (async).
 */
type MapAsyncFunc<T, S> = (x: T, idx: number) => Promise<S>;
/**
 * A function that filters values based on a predicate (async).
 */
type FilterAsyncFunc<T, S extends any = any> = (x: T, idx: number) => Promise<boolean>;
/**
 * A function that performs a side effect for each value (async).
 */
type ForEachAsyncFunc<T, S extends any = any> = (x: T, idx: number) => Promise<void>;
type AsyncIterMethods<T, S> = MapFunc<T, S> | FilterFunc<T, S> | ForEachFunc<T, S> | ReduceFunc<T, S> | MapAsyncFunc<T, S> | FilterAsyncFunc<T, S> | ForEachAsyncFunc<T, S> | Iterator<T> | AsyncIterator<T>;
type GetLastMethodType<T extends any[]> = T extends [...any[], infer Last] ? Last extends Iterator<infer R> | AsyncIterator<infer R> ? [R, R] : Last extends AsyncIterMethods<infer P, infer Q> ? [P, Q] : never : never;
type Push<T extends any[], S extends any> = [...T, S];
type AsyncChainMethod = {
    kind: 'mapAsync' | 'filterAsync' | 'forEachAsync';
    fn: MapAsyncFunc<any, any> | FilterAsyncFunc<any, any> | ForEachAsyncFunc<any, any>;
};
type SyncChainMethod = {
    kind: 'map' | 'filter' | 'forEach';
    fn: MapFunc<any, any> | FilterFunc<any, any> | ForEachFunc<any, any>;
};
type ReduceMethod = {
    kind: 'reduce';
    fn: ReduceFunc<any, any>;
    initVal?: any;
};
/**
 * A lazy, chainable async iterator supporting both sync and async map, filter, forEach, reduce, and other functional operations.
 *
 * Allows for efficient, composable async data processing pipelines without creating intermediate arrays.
 *
 * @template IterType The type of elements in the iterator.
 * @template Methods The chain of methods applied to the iterator.
 *
 * @throws Error If constructed from null or undefined, or from an invalid iterator/iterable.
 * @throws Error If take(n), drop(n), takeSettled(n), or dropSettled(n) is called with a negative number.
 */
export declare class LazyAsyncIterator<IterType, Methods extends AsyncIterMethods<any, any>[] = [Iterator<IterType> | AsyncIterator<IterType>]> implements AsyncIterableIterator<IterType> {
    iterator: Iterator<IterType> | AsyncIterator<IterType>;
    methods: (SyncChainMethod | AsyncChainMethod | ReduceMethod)[];
    exhausted: boolean;
    caughtError: Error | null;
    index: number;
    /**
     * Constructs a LazyAsyncIterator from a given iterator or async iterator.
     */
    constructor(iterator: Iterator<IterType> | AsyncIterator<IterType>);
    /**
     * Creates a LazyAsyncIterator from an iterator, async iterator, iterable, or async iterable.
     *
     * @throws Error If the input is null, undefined, or not an iterator/iterable.
     */
    static from<T>(input: Iterator<T> | AsyncIterator<T> | Iterable<T> | AsyncIterable<T>): LazyAsyncIterator<T>;
    private getNextElement;
    private executeChainedMethod;
    private executeReduceMethod;
    [Symbol.asyncIterator](): this;
    /**
     * Returns the next value in the iterator, applying all chained methods (sync and async).
     *
     * @throws Error If the iterator is already exhausted.
     */
    next(): Promise<IteratorResult<GetLastMethodType<Methods>[1]>>;
    /**
     * Marks the iterator as exhausted and returns the given value.
     */
    return(value: any): Promise<{
        value: any;
        done: true;
    }>;
    /**
     * Marks the iterator as exhausted due to an error.
     */
    throw(e: any): Promise<{
        done: true;
        value: undefined;
    }>;
    /**
     * Lazily maps each value using the provided callback (sync).
     */
    map<S>(cb: MapFunc<GetLastMethodType<Methods>[1], S>): LazyAsyncIterator<IterType, Push<Methods, MapFunc<GetLastMethodType<Methods>[1], S>>>;
    /**
     * Lazily filters values using the provided predicate (sync).
     */
    filter(cb: FilterFunc<GetLastMethodType<Methods>[1]>): LazyAsyncIterator<IterType, Push<Methods, FilterFunc<GetLastMethodType<Methods>[1], GetLastMethodType<Methods>[1]>>>;
    /**
     * Lazily performs a side effect for each value using the provided callback (sync).
     *
     * Note: This is a pass-through, non-terminating operation. It can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
     */
    forEach(cb: ForEachFunc<GetLastMethodType<Methods>[1]>): LazyAsyncIterator<IterType, Push<Methods, ForEachFunc<GetLastMethodType<Methods>[1], GetLastMethodType<Methods>[1]>>>;
    /**
     * Lazily maps each value using the provided async callback.
     */
    mapAsync<S>(cb: MapAsyncFunc<GetLastMethodType<Methods>[1], S>): LazyAsyncIterator<IterType, Push<Methods, MapAsyncFunc<GetLastMethodType<Methods>[1], S>>>;
    /**
     * Lazily filters values using the provided async predicate.
     */
    filterAsync(cb: FilterAsyncFunc<GetLastMethodType<Methods>[1]>): LazyAsyncIterator<IterType, Push<Methods, FilterAsyncFunc<GetLastMethodType<Methods>[1], GetLastMethodType<Methods>[1]>>>;
    /**
     * Lazily performs a side effect for each value using the provided async callback.
     *
     * Note: This is a pass-through, non-terminating operation. It can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
     */
    forEachASync(cb: ForEachAsyncFunc<GetLastMethodType<Methods>[1]>): LazyAsyncIterator<IterType, Push<Methods, ForEachAsyncFunc<GetLastMethodType<Methods>[1], GetLastMethodType<Methods>[1]>>>;
    /**
     * Lazily reduces values to a single result using the provided reducer and initial value (sync).
     */
    reduce<S>(cb: ReduceFunc<GetLastMethodType<Methods>[1], S>, initVal: S): ReduceExecutor<unknown, AsyncIterMethods<any, any>, LazyAsyncIterator<IterType, [...Methods, ReduceFunc<GetLastMethodType<Methods>[1], S>]>>;
    /**
     * Executes up to `concurrency` next() calls in parallel and returns all settled results.
     *
     * @throws Error If concurrency is not a positive integer.
     */
    private _batchNext;
    /**
     * Creates multiple independent async iterators (tees) from this iterator.
     *
     * @throws Error If count is not a positive integer.
     */
    tee(count: number): LazyAsyncIterator<GetLastMethodType<Methods>[1], [AsyncIterator<GetLastMethodType<Methods>[1], any, any> | Iterator<GetLastMethodType<Methods>[1], any, any>]>[];
    /**
     * Returns all values, throws on error, stops at first done. Supports concurrency.
     *
     * @throws Error If an error occurs in the pipeline.
     */
    collect(concurrency?: number): Promise<GetLastMethodType<Methods>[1][]>;
    toArray(): Promise<GetLastMethodType<Methods>[1][]>;
    /**
     * Returns all settled results (fulfilled and rejected), stops at first done. Supports concurrency.
     */
    collectSettled(concurrency?: number): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]>;
    /**
     * Returns the first n values, throws on error. Supports concurrency.
     *
     * @throws Error If n is negative or not a number, or if an error occurs in the pipeline.
     */
    take(n: number, concurrency?: number): Promise<GetLastMethodType<Methods>[1][]>;
    /**
     * Returns the first n settled results (fulfilled or rejected), stops at first done. Supports concurrency.
     *
     * @throws Error If n is negative or not a number.
     */
    takeSettled(n: number, concurrency?: number): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]>;
    /**
     * Drops the first n values, returns the rest, throws on error. Supports concurrency.
     *
     * @throws Error If n is negative or not a number, or if an error occurs in the pipeline.
     */
    drop(n: number, concurrency?: number): Promise<GetLastMethodType<Methods>[1][]>;
    /**
     * Drops the first n values, returns all settled results for the rest. Supports concurrency.
     *
     * @throws Error If n is negative or not a number.
     */
    dropSettled(n: number, concurrency?: number): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]>;
    /**
     * Returns values while predicate is true, throws on error. Supports concurrency.
     *
     * @throws Error If an error occurs in the pipeline.
     */
    takeWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency?: number): Promise<GetLastMethodType<Methods>[1][]>;
    /**
     * Returns all settled results while predicate is true, stops at first done. Supports concurrency.
     */
    takeWhileSettled(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency?: number): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]>;
    /**
     * Drops values while predicate is true, returns the rest, throws on error. Supports concurrency.
     *
     * @throws Error If an error occurs in the pipeline.
     */
    dropWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency?: number): Promise<GetLastMethodType<Methods>[1][]>;
    /**
     * Drops values while predicate is true, returns all settled results for the rest. Supports concurrency.
     */
    dropWhileSettled(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency?: number): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]>;
}
type ExtractLazyIteratorMethods<T extends unknown> = T extends LazyAsyncIterator<infer _, infer Q> ? Q : never;
/**
 * Executes a reduce operation on a LazyAsyncIterator chain.
 */
declare class ReduceExecutor<R extends any, S extends AsyncIterMethods<any, any>, T extends LazyAsyncIterator<R, S[]>> {
    private lazyIterator;
    constructor(lazyIterator: T);
    /**
     * Executes the reduce operation and returns the result.
     */
    execute(): Promise<GetLastMethodType<ExtractLazyIteratorMethods<T>>[1]>;
}
export {};
