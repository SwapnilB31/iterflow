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
export function createTeeIterators<T>(sourceIterable: Iterable<T>, count: number): IterableIterator<T>[] {
    if(arguments.length !== 2) throw new Error(`Expected 2 arguments but recieved: ${arguments.length}`);
    if(!sourceIterable[Symbol.iterator]) throw new Error(`Expected Arg 1 to be an iterator.`)
    if(!(typeof count === "number")) throw new Error(`Expected Arg 2 to be an integer`)

    // Make it an integer
    count = Math.floor(count)

    const sourceIterator = sourceIterable[Symbol.iterator]();
    const iteratorIndexPositions: number[] = Array(count).fill(0);
    const streamBuffer: T[] = []
    
    let streamExhausted = false;
    let streamError: Error | null = null;

    /**
     * Gets the next value from the source iterator, handling exhaustion and errors.
     */
    function getNextStreamElement() {
        if(streamExhausted) return { value: undefined, done: true};
        if(streamError) throw streamError;

        try {
            const result = sourceIterator.next();
            if(result.done) streamExhausted = true;
            // console.log('result',result)
            return result;
        } catch(e) {
            streamError = e as any as Error;
            throw e
        }  
    }

    /**
     * Cleans up the buffer by removing elements already consumed by all iterators.
     */
    function cleanupStreamBuffer() {
        const smallestComsumedIndex = Math.min(...iteratorIndexPositions)
        const deletedElementsCount = smallestComsumedIndex;
        streamBuffer.splice(0, deletedElementsCount);
        for(let i = 0; i < count; i++) {
            iteratorIndexPositions[i] -= deletedElementsCount;
        }
    }

    /**
     * Creates a single teed iterator for the given index.
     */
    function createTeedIterator(index: number): IterableIterator<T> {
        let done = false
        return {
            [Symbol.iterator]() {
                return this
            },
            next(): IteratorResult<T> {
                if(done) return { value: undefined, done: true}

                // console.log(`Before`)
                // console.log(`iterator ${index}`)
                // console.log("buffer", streamBuffer)
                // console.log(`index position: ${iteratorIndexPositions[index]}`)
                
                if(iteratorIndexPositions[index] < streamBuffer.length) {
                    const value = streamBuffer[iteratorIndexPositions[index]];
                    iteratorIndexPositions[index]++;
                    cleanupStreamBuffer();
                    return { value, done: false }
                }

                const result = getNextStreamElement()

                if(result.done) {
                    done = true;
                    return {done: true, value: undefined}
                }

                // console.log("pushed to stream");
                streamBuffer.push(result.value!);
                // console.log("index incremented")
                iteratorIndexPositions[index]++
                cleanupStreamBuffer();

                // console.log("After")
                // console.log(`iterator ${index}`)
                // console.log("buffer", streamBuffer)
                // console.log(`index position: ${iteratorIndexPositions[index]}`)

                return { value: result.value!, done: false }

            },
            return(value) {
                if(!done) {
                    done = true;
                }
                return { value, done}
            },
            throw(e) {
                if(!done) {
                    done = true;
                }
                throw e
            }
        }   
    }

    return Array(count).fill(0).map((_, idx) => createTeedIterator(idx))
}


/** Shared buffer and position helpers for tee iterators (sync/async) */
function makeTeeBufferHelpers(count: number) {
    const iteratorIndexPositions: number[] = Array(count).fill(0);
    const streamBuffer: any[] = [];
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

/**
 * Creates multiple independent lazy async iterators from a single async iterable/iterator source.
 * Each returned async iterator yields the same sequence of values as the original, but can be consumed at different rates.
 * @template T
 * @param {AsyncIterable<T>|AsyncIterator<T>} sourceAsyncIterable - The async iterable/iterator to split.
 * @param {number} count - The number of async iterators to create.
 * @returns {AsyncIterableIterator<T>[]} An array of independent async iterators.
 * @throws {Error} If incorrect arguments are provided or the source is not async iterable/iterator.
 */
export function createAsyncTeeIterators<T>(sourceAsyncIterable: AsyncIterable<T> | AsyncIterator<T>, count: number): AsyncIterableIterator<T>[] {
    if (arguments.length !== 2) throw new Error(`Expected 2 arguments but received: ${arguments.length}`);
    if (!sourceAsyncIterable || (typeof sourceAsyncIterable !== 'object')) throw new Error(`Expected Arg 1 to be an async iterable or async iterator.`);
    if (!(typeof count === 'number')) throw new Error(`Expected Arg 2 to be an integer`);
    count = Math.floor(count);

    // Get async iterator from input
    let sourceIterator: AsyncIterator<T>;
    if (typeof (sourceAsyncIterable as any)[Symbol.asyncIterator] === 'function') {
        sourceIterator = (sourceAsyncIterable as AsyncIterable<T>)[Symbol.asyncIterator]();
    } else if (typeof (sourceAsyncIterable as any).next === 'function') {
        sourceIterator = sourceAsyncIterable as AsyncIterator<T>;
    } else {
        throw new Error('Source is not async iterable or async iterator');
    }

    const { iteratorIndexPositions, streamBuffer, cleanupStreamBuffer } = makeTeeBufferHelpers(count);
    let streamExhausted = false;
    let streamError: Error | null = null;

    async function getNextStreamElementAsync() {
        if (streamExhausted) return { value: undefined, done: true };
        if (streamError) throw streamError;
        try {
            const result = await sourceIterator.next();
            if (result.done) streamExhausted = true;
            return result;
        } catch (e) {
            streamError = e as any as Error;
            throw e;
        }
    }

    function createTeedAsyncIterator(index: number): AsyncIterableIterator<T> {
        let done = false;
        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            async next(): Promise<IteratorResult<T>> {
                if (done) return { value: undefined, done: true };
                if (iteratorIndexPositions[index] < streamBuffer.length) {
                    const value = streamBuffer[iteratorIndexPositions[index]];
                    iteratorIndexPositions[index]++;
                    cleanupStreamBuffer();
                    return { value, done: false };
                }
                const result = await getNextStreamElementAsync();
                if (result.done) {
                    done = true;
                    return { done: true, value: undefined };
                }
                streamBuffer.push(result.value!);
                iteratorIndexPositions[index]++;
                cleanupStreamBuffer();
                return { value: result.value!, done: false };
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


type ExtractReturnTypeFromFuncArray<T extends unknown[]> =
  T extends  [infer First, ...infer Rest] ?
    First extends (...args: any[]) => any ?
      Rest extends ((...args: any[]) => any)[] ?
        [ReturnType<First>, ...ExtractReturnTypeFromFuncArray<Rest>]
      : never
    : never
  : [];

type ExtractFnFromTeeConsumer<T extends unknown[]> =
    T extends [infer First, ...infer Rest] ?
        First extends TeeConsumer<any,any> ?
            Rest extends TeeConsumer<any,any>[] ?
                [First['fn'], ...ExtractFnFromTeeConsumer<Rest>]
            : never
        : never
    : [];

// type TeeConsumerFn<T> = <T>(val: T, idx: number) => void
export type TeeConsumer<T,S=any> = {
    fn: (val: T, idx: number) => S,
    kind: 'map' 
} |
{
    fn: (val: T, idx: number) => boolean,
    kind: 'filter'
} | 
{
    fn: (acc: S | number, curr: T, idx: number) => S | number,
    kind: 'reduce',
    initVal?: S | number 
} | 
{
    fn: (val: T, idx: number) => void,
    kind: 'forEach',
};

type res = ExtractReturnTypeFromFuncArray<ExtractFnFromTeeConsumer<[
    { fn: (val: number, idx: number) => string, kind: 'map'},
    { fn: (acc: number, curr: number, idx: number) => number, kind: 'reduce', initVal?: number}
]>>


// type TeeConsumer<T,S=any> = TeeConsumerFn<T> | TeeConsumserConfigurable<T,S>

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
export function teeConsumers<T,S>(this: Array<T>, ...consumers: TeeConsumer<T,S>[]) {
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
    const outResults: any[] = Array(consumerFns.length).fill(0);
    const iterators = createTeeIterators(this, consumerFns.length);

    // Process each consumer in parallel
    for (let consumerIdx = 0; consumerIdx < consumerFns.length; consumerIdx++) {
        const fn = consumerFns[consumerIdx];
        const mapResult: any[] = [];
        let reduceResult: any = fn.kind === 'reduce' ? fn.initVal : undefined;
        let filterResult: T[] = [];
        let elementIdx = 0;
        // Iterate through each element for this consumer
        for(const elem of iterators[consumerIdx]) {
            switch(fn.kind) {
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
                        } else {
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
                    throw new Error(`Unknown consumer kind: ${String((fn as any).kind)}`);
            }
            elementIdx++;
        }
        // Store result for this consumer
        switch(fn.kind) {
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
    return outResults as any[];
}
