import { TeeConsumer } from './tee';
import { LazyIterator } from './lazy-iterator';
import { LazyAsyncIterator } from './lazy-async-iterator';
declare global {
    interface Array<T> {
        /**
         * Disclaimer: This method is not a part of the ECMAScript Standard. It is attached to `Array` by `tee-js`.
         *
         * Applies multiple consumer operations (map, filter, reduce, forEach) in parallel to an array, using independent iterators for each consumer.
         * Each consumer receives elements and their index, and results are returned in an array matching the order of consumers.
         * Supports runtime type checking for consumer configuration and robust error handling.
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
        tee<S>(...consumers: readonly TeeConsumer<T, S>[]): any[];
    }
    interface ArrayConstructor {
        /**
         * Disclaimer: This method is not a part of the ECMAScript Standard. It is attached to `Array` by `tee-js`.
         *
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
        tee<T>(sourceIterable: Iterable<T>, count: number): IterableIterator<T>[];
    }
}
export { LazyIterator, LazyAsyncIterator };
