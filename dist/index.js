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
function teeConsumers() { }
Array.tee = createTeeIterators;
export {};
