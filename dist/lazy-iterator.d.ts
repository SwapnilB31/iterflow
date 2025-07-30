/**
 * A function that maps a value and its index to a new value.
 */
type MapFunc<T, S> = (x: T, idx: number) => S;
/**
 * A function that filters values based on a predicate.
 */
type FilterFunc<T, S extends any = any> = (x: T, idx: number) => boolean;
/**
 * A function that performs a side effect for each value.
 */
type ForEachFunc<T, S extends any = any> = (x: T, idx: number) => void;
/**
 * A function that reduces values to a single accumulated result.
 */
type ReduceFunc<T, S> = (acc: S, curr: T, idx: number) => S;
type IteratorMethods<T, S extends any = any> = MapFunc<T, S> | FilterFunc<T, S> | ForEachFunc<T, S> | ReduceFunc<T, S> | Iterator<T>;
type GetLastMethodType<T extends any[]> = T extends readonly [...any[], infer Last] ? Last extends Iterator<infer P> ? readonly [P, P] : Last extends IteratorMethods<infer Q, infer R> ? readonly [Q, R] : never : never;
type Push<T extends any[], S extends any> = [...T, S];
/**
* A lazy, chainable iterator supporting map, filter, forEach, reduce, and other functional operations.
*
* Allows for efficient, composable data processing pipelines without creating intermediate arrays.
*
* @template IterType The type of elements in the iterator.
* @template Methods The chain of methods applied to the iterator.
*
* @throws Error If constructed from null or undefined, or from an invalid iterator/iterable.
* @throws Error If take(n) or drop(n) is called with a negative number.
*/
export declare class LazyIterator<IterType, Methods extends IteratorMethods<any, any>[] = [Iterator<IterType>]> implements IterableIterator<IterType> {
    iterator: Iterator<IterType>;
    _methods: {
        fn: IteratorMethods<any, any>;
        kind: 'map' | 'reduce' | 'forEach' | 'filter';
        initVal?: any;
    }[];
    exhausted: boolean;
    caughtError: Error | null;
    index: number;
    /**
     * Creates a LazyIterator from an iterator or iterable.
     *
     * @throws Error If the input is null, undefined, or not an iterator/iterable.
     */
    static from<T>(iter: Iterator<T> | Iterable<T>): LazyIterator<T, [Iterator<T, any, any>]>;
    /**
     * Constructs a LazyIterator from a given iterator.
     */
    constructor(iterator: Iterator<IterType>);
    private executeFunctMethod;
    /**
     * Returns the next value in the iterator, applying all chained methods.
     *
     * @throws Error If the iterator is already exhausted.
     */
    next(): IteratorResult<GetLastMethodType<Methods>[1], undefined>;
    /**
     * Marks the iterator as exhausted and returns the given value.
     */
    return(value: any): {
        value: any;
        done: true;
    };
    /**
     * Marks the iterator as exhausted due to an error.
     */
    throw(e: any): {
        done: true;
        value: undefined;
    };
    /**
     * Returns itself as an iterator.
     */
    [Symbol.iterator](): this;
    /**
     * Lazily maps each value using the provided callback.
     */
    map<S>(cb: MapFunc<GetLastMethodType<Methods>[1], S>): LazyIterator<IterType, Push<Methods, MapFunc<GetLastMethodType<Methods>[1], S>>>;
    /**
     * Lazily filters values using the provided predicate.
     */
    filter(cb: FilterFunc<GetLastMethodType<Methods>[1]>): LazyIterator<IterType, Push<Methods, FilterFunc<GetLastMethodType<Methods>[1], GetLastMethodType<Methods>[1]>>>;
    /**
     * Lazily performs a side effect for each value using the provided callback.
     *
     * Note: Unlike Array.prototype.forEach, this does not terminate or consume the iterator. It is a pass-through operation and can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
     */
    forEach(cb: ForEachFunc<GetLastMethodType<Methods>[1]>): LazyIterator<IterType, Push<Methods, ForEachFunc<GetLastMethodType<Methods>[1], GetLastMethodType<Methods>[1]>>>;
    /**
     * Lazily reduces values to a single result using the provided reducer and initial value.
     */
    reduce<S>(cb: ReduceFunc<GetLastMethodType<Methods>[1], S>, initVal: S): ReduceExecutor<unknown, IteratorMethods<any, any>, LazyIterator<IterType, [...Methods, ReduceFunc<GetLastMethodType<Methods>[1], S>]>>;
    /**
     * Collects all values into an array.
     */
    toArray(): GetLastMethodType<Methods>[1][];
    /**
     * Creates multiple independent iterators (tees) from this iterator.
     *
     * @throws Error If count is not a positive integer.
     */
    tee(count: number): LazyIterator<GetLastMethodType<Methods>[1], [Iterator<GetLastMethodType<Methods>[1], any, any>]>[];
    /**
     * Collects all values into an array (alias for toArray).
     */
    collect(): GetLastMethodType<Methods>[1][];
    /**
     * Takes the first n values from the iterator.
     *
     * @throws Error If n is negative or not a number.
     */
    take(n: number): GetLastMethodType<Methods>[1][];
    /**
     * Skips the first n values from the iterator.
     *
     * @throws Error If n is negative or not a number.
     */
    drop(n: number): GetLastMethodType<Methods>[1][];
    /**
     * Takes values while the predicate returns true.
     */
    takeWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean): GetLastMethodType<Methods>[1][];
    /**
     * Skips values while the predicate returns true, then collects the rest.
     */
    dropWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean): GetLastMethodType<Methods>[1][];
}
type ExtractLazyIteratorMethods<T extends unknown> = T extends LazyIterator<infer _, infer Q> ? Q : never;
/**
* Executes a reduce operation on a LazyIterator chain.
*/
declare class ReduceExecutor<R extends any, S extends IteratorMethods<any, any>, T extends LazyIterator<R, S[]>> {
    private lazyIterator;
    constructor(lazyIterator: T);
    /**
     * Executes the reduce operation and returns the result.
     */
    execute(): GetLastMethodType<ExtractLazyIteratorMethods<T>>[1];
}
export {};
