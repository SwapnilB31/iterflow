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
function createTeeIterators(sourceIterable, count) {
    if (arguments.length !== 2)
        throw new Error(`Expected 2 arguments but recieved: ${arguments.length}`);
    if (!sourceIterable[Symbol.iterator])
        throw new Error(`Expected Arg 1 to be an iterator.`);
    if (!(typeof count === "number"))
        throw new Error(`Expected Arg 2 to be an integer`);
    // Make it an integer
    count = Math.floor(count);
    const sourceIterator = sourceIterable[Symbol.iterator]();
    const iteratorIndexPositions = Array(count).fill(0);
    const streamBuffer = [];
    let streamExhausted = false;
    let streamError = null;
    /**
     * Gets the next value from the source iterator, handling exhaustion and errors.
     */
    function getNextStreamElement() {
        if (streamExhausted)
            return { value: undefined, done: true };
        if (streamError)
            throw streamError;
        try {
            const result = sourceIterator.next();
            if (result.done)
                streamExhausted = true;
            // console.log('result',result)
            return result;
        }
        catch (e) {
            streamError = e;
            throw e;
        }
    }
    /**
     * Cleans up the buffer by removing elements already consumed by all iterators.
     */
    function cleanupStreamBuffer() {
        const smallestComsumedIndex = Math.min(...iteratorIndexPositions);
        const deletedElementsCount = smallestComsumedIndex;
        streamBuffer.splice(0, deletedElementsCount);
        for (let i = 0; i < count; i++) {
            iteratorIndexPositions[i] -= deletedElementsCount;
        }
    }
    /**
     * Creates a single teed iterator for the given index.
     */
    function createTeedIterator(index) {
        let done = false;
        return {
            [Symbol.iterator]() {
                return this;
            },
            next() {
                if (done)
                    return { value: undefined, done: true };
                // console.log(`Before`)
                // console.log(`iterator ${index}`)
                // console.log("buffer", streamBuffer)
                // console.log(`index position: ${iteratorIndexPositions[index]}`)
                if (iteratorIndexPositions[index] < streamBuffer.length) {
                    const value = streamBuffer[iteratorIndexPositions[index]];
                    iteratorIndexPositions[index]++;
                    cleanupStreamBuffer();
                    return { value, done: false };
                }
                const result = getNextStreamElement();
                if (result.done) {
                    done = true;
                    return { done: true, value: undefined };
                }
                // console.log("pushed to stream");
                streamBuffer.push(result.value);
                // console.log("index incremented")
                iteratorIndexPositions[index]++;
                cleanupStreamBuffer();
                // console.log("After")
                // console.log(`iterator ${index}`)
                // console.log("buffer", streamBuffer)
                // console.log(`index position: ${iteratorIndexPositions[index]}`)
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
;
// type TeeConsumer<T,S=any> = TeeConsumerFn<T> | TeeConsumserConfigurable<T,S>
/**
* Applies multiple consumer operations (map, filter, reduce, forEach) in parallel to an array, using independent iterators for each consumer.
* Each consumer receives elements and their index, and results are returned in an array matching the order of consumers.
*
* @template T - The type of elements in the array.
* @param {...TeeConsumer<T>} consumers - One or more consumer objects specifying the operation and function to apply.
* @returns {Array<any>} An array of results, one for each consumer: mapped values, filtered values, reduced result, or undefined for forEach.
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
function teeConsumers(...consumers) {
    // Runtime type checking for params
    if (!Array.isArray(this)) {
        throw new TypeError('teeConsumers must be called on an array');
    }
    if (!consumers.length) {
        throw new Error('At least one consumer must be provided');
    }
    // Validate each consumer object
    for (const consumer of consumers) {
        if (typeof consumer !== 'object' || consumer === null) {
            throw new TypeError('Each consumer must be an object');
        }
        if (!('kind' in consumer) || typeof consumer.kind !== 'string') {
            throw new TypeError('Each consumer must have a string kind property');
        }
        if (typeof consumer.fn !== 'function') {
            throw new TypeError('Each consumer must have a function fn property');
        }
        if (consumer.kind === 'reduce' && !('initVal' in consumer)) {
            // Allow reduce without initVal
        }
    }
    // Prepare iterators and results
    const consumerFns = Array.from(consumers);
    const outResults = Array(consumerFns.length).fill(0);
    const iterators = createTeeIterators(this, consumerFns.length);
    // Process each consumer in parallel
    for (let consumerIdx = 0; consumerIdx < consumerFns.length; consumerIdx++) {
        const fn = consumerFns[consumerIdx];
        const mapResult = [];
        let reduceResult = fn.kind === 'reduce' ? fn.initVal : undefined;
        let filterResult = [];
        let elementIdx = 0;
        // Iterate through each element for this consumer
        for (const elem of iterators[consumerIdx]) {
            switch (fn.kind) {
                case 'forEach':
                    fn.fn(elem, elementIdx);
                    break;
                case 'map':
                    {
                        const val = fn.fn(elem, elementIdx);
                        mapResult.push(val);
                    }
                    break;
                case 'reduce':
                    {
                        if (elementIdx === 0 && reduceResult === undefined) {
                            reduceResult = elem;
                        }
                        else {
                            reduceResult = fn.fn(reduceResult, elem, elementIdx);
                        }
                    }
                    break;
                case 'filter':
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
        // Store result for this consumer
        switch (fn.kind) {
            case 'forEach':
                outResults[consumerIdx] = undefined;
                break;
            case 'reduce':
                outResults[consumerIdx] = reduceResult;
                break;
            case 'map':
                outResults[consumerIdx] = mapResult;
                break;
            case 'filter':
                outResults[consumerIdx] = filterResult;
                break;
        }
    }
    // Return all results
    return outResults;
}
Array.tee = createTeeIterators;
Array.prototype.tee = teeConsumers;
export {};
