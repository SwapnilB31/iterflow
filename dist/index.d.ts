declare global {
    interface Array<T> {
        tee(): any;
    }
    interface ArrayConstructor {
        /**
         * Disclaimer: This method is not a part of the JS Standard. It is attached to `Array` by `tee-js`.
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
export {};
