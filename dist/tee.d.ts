/**
 * Creates multiple independent lazy iterators from a single iterable source, allowing parallel consumption without re-traversing the source.
 * Each returned iterator is will yield the same sequence of values as the original iterable, but can be consumed at different rates.
 * Each returned iterator is lazy and only consumes values from the source iterable as they are requested.
 *
 * @template T - The type of elements in the source iterable.
 * @param {Iterable<T>} sourceIterable - The iterable to split into multiple iterators.
 * @param {number} count - The number of independent iterators to create.
 * @returns {IterableIterator<T>[]} An array of independent iterators over the source iterable.
 * @throws {Error} If incorrect arguments are provided or the source is not iterable.
 *
 * @example
 * const arr = [1, 2, 3, 4];
 * const [it1, it2] = Array.tee(arr, 2);
 * console.log(it1.next().value); // 1
 * console.log(it2.next().value); // 1
 * console.log(it1.next().value); // 2
 * console.log(it2.next().value); // 2
 */
export declare function createTeeIterators<T>(sourceIterable: Iterable<T>, count: number): IterableIterator<T>[];
/**
 * Creates multiple independent lazy async iterators from a single async iterable/iterator source.
 * Each returned async iterator yields the same sequence of values as the original, but can be consumed at different rates.
 * @template T
 * @param {AsyncIterable<T>|AsyncIterator<T>} sourceAsyncIterable - The async iterable/iterator to split.
 * @param {number} count - The number of async iterators to create.
 * @returns {AsyncIterableIterator<T>[]} An array of independent async iterators.
 * @throws {Error} If incorrect arguments are provided or the source is not async iterable/iterator.
 */
export declare function createAsyncTeeIterators<T>(sourceAsyncIterable: AsyncIterable<T> | AsyncIterator<T>, count: number): AsyncIterableIterator<T>[];
export type TeeConsumer<T, S = any> = {
    fn: (val: T, idx: number) => S;
    kind: 'map';
} | {
    fn: (val: T, idx: number) => boolean;
    kind: 'filter';
} | {
    fn: (acc: S | number, curr: T, idx: number) => S | number;
    kind: 'reduce';
    initVal?: S | number;
} | {
    fn: (val: T, idx: number) => void;
    kind: 'forEach';
};
/**
* Applies multiple consumer operations (map, filter, reduce, forEach) in parallel to an array, using independent iterators for each consumer.
* Each consumer receives elements and their index, and results are returned in an array matching the order of consumer
* @throws {TypeError|Error} If invalid arguments or consumer configuration are provided.
*
* @example
* const arr = [1,2,3];
* const results = arr.tee(
*   { kind: 'map', fn: (x, i) => x * 2 },
*   { kind: 'filter', fn: (x, i) => x % 2 === 1 },
*   { kind: 'reduce', fn: (acc, x, i) => acc + x, initVal: 0 },
*   { kind: 'forEach', fn: (x, i) => console.log(x) }
* );
* // results: [[2,4,6], [1,3], 6, undefined]
*/
export declare function teeConsumers<T, S>(this: Array<T>, ...consumers: TeeConsumer<T, S>[]): any[];
