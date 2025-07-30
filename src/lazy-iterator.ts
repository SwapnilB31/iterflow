import {createTeeIterators} from './tee'

/**
 * A function that maps a value and its index to a new value.
 */
type MapFunc<T,S> = (x: T, idx: number) => S;
/**
 * A function that filters values based on a predicate.
 */
type FilterFunc<T,S extends any = any> = (x: T, idx: number) => boolean;
/**
 * A function that performs a side effect for each value.
 */
type ForEachFunc<T,S extends any = any> = (x: T, idx: number) => void;
/**
 * A function that reduces values to a single accumulated result.
 */
type ReduceFunc<T,S> = (acc: S, curr: T, idx: number) => S;


type IteratorMethods<T,S extends any = any> = 
  MapFunc<T,S> |
  FilterFunc<T,S> |
  ForEachFunc<T,S> |
  ReduceFunc<T,S> |
  Iterator<T>

// type ExtractMapTypeFromFunc<T extends unknown[]> =
//   T extends  [infer First, ...infer Rest] ?
//     First extends (...args: any[]) => any ?
//       Rest extends ((...args: any[]) => any)[] ?
//         [ReturnType<First>, ...ExtractMapTypeFromFunc<Rest>]
//       : never
//     : never
//   : [];


type GetLastMethodType<T extends any[]> = T extends readonly [...any[], infer Last] ? 
  Last extends Iterator<infer P> ?
    readonly [P,P] 
      : Last extends IteratorMethods<infer Q, infer R> ?
        readonly [Q, R]
      : never
    : never;

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
export class LazyIterator<IterType, Methods extends IteratorMethods<any,any>[] = [Iterator<IterType>]> implements IterableIterator<IterType> {
    iterator: Iterator<IterType>;
    _methods: {
        fn: IteratorMethods<any,any>
        kind: 'map' | 'reduce' | 'forEach' | 'filter',
        initVal?: any
    }[];

    exhausted: boolean;
    caughtError: Error | null;
    index: number;

    /**
     * Creates a LazyIterator from an iterator or iterable.
     *
     * @throws Error If the input is null, undefined, or not an iterator/iterable.
     */
    static from<T>(iter: Iterator<T> | Iterable<T>) {
        if(iter === undefined || iter === null) throw new Error("LazyIterator cannot be created from null or undefined");
        if('next' in iter && typeof iter.next === 'function') {
            return new LazyIterator<T>(iter)
        }

        if (typeof iter === 'object' && Symbol.iterator in iter) {
            const iterator = (iter as Iterable<T>)[Symbol.iterator]();
            return new LazyIterator<T>(iterator);
        }

        throw new Error("Couldn't create LazyIterator. no valid iterator");
    }

    /**
     * Constructs a LazyIterator from a given iterator.
     */
    constructor(iterator: Iterator<IterType>) {
        this.iterator = iterator;
        this._methods = []
        this.exhausted = false;
        this.caughtError = null;
        this.index = 0;
    }

    private executeFunctMethod<T>(method: {
        fn: IteratorMethods<any,any>,
        kind: 'map' | 'reduce' | 'forEach' | 'filter',
        initVal?: any
    }, val: T, index: number) {
        switch(method.kind) {
            case 'map':
            case 'filter':
            case 'forEach':
                {
                    const fn = method.fn as MapFunc<any,any> | FilterFunc<any,any> | ForEachFunc<any,any>;
                    return fn(val, index)
                }  
            case 'reduce':
                {
                    const fn = method.fn as ReduceFunc<any,any>
                    return fn({}, val, index)
                }
            default:
                return {} as any
        }
    }

    /**
     * Returns the next value in the iterator, applying all chained methods.
     *
     * @throws Error If the iterator is already exhausted.
     */
    next(): IteratorResult<GetLastMethodType<Methods>[1],undefined> {
        // if(this.methods.length === 0) return { done: true, value: undefined}; 
        if(this.exhausted) return { done: true, value: undefined} 

        while(true) {
            const nextVal = this.iterator.next();
        
            if(nextVal.done) {
                this.exhausted = true;
                 return { done: true, value: undefined}
            }

            if(this._methods.length === 0) return { value: nextVal.value, done: false} as { value: GetLastMethodType<Methods>[1], done: false}

            
            let filterFail = false;
            let a = nextVal.value;

            for(let i = 0; i < this._methods.length; i++) {
                let retVal = this.executeFunctMethod(this._methods[i], a, this.index)
                
                // console.log({ value: nextVal.value, retVal, kind: this.methods[i].kind});

                if(this._methods[i].kind === 'map')
                    a = retVal;
                if(this._methods[i].kind === 'filter' && retVal === false) {
                    filterFail = true;
                    break
                }
            }


            this.index++;

            if(filterFail) continue;

            return { done: false, value: a} as { value: GetLastMethodType<Methods>[1], done: false}
        }
        
    }

    /**
     * Marks the iterator as exhausted and returns the given value.
     */
    return(value: any) {
        if(!this.exhausted) {
            this.exhausted = true;
        }

        return { value, done: this.exhausted }
    }

    /**
     * Marks the iterator as exhausted due to an error.
     */
    throw(e: any) {
        if(!this.exhausted) {
            this.exhausted = true
        }

        return { done: this.exhausted, value: undefined}
    }

    /**
     * Returns itself as an iterator.
     */
    [Symbol.iterator]() {
        return this
    } 

    /**
     * Lazily maps each value using the provided callback.
     */
    map<S>(cb: MapFunc<GetLastMethodType<Methods>[1],S>) {
        this._methods.push({
            fn: cb,
            kind: 'map'
        });

        return this as unknown as LazyIterator<IterType, Push<Methods, MapFunc<GetLastMethodType<Methods>[1],S>>>;
    }

    /**
     * Lazily filters values using the provided predicate.
     */
    filter(cb: FilterFunc<GetLastMethodType<Methods>[1]>) {
        this._methods.push({
            fn: cb,
            kind: 'filter'
        });

        return this as unknown as LazyIterator<IterType, Push<Methods, FilterFunc<GetLastMethodType<Methods>[1],GetLastMethodType<Methods>[1]>>>;
    }

    /**
     * Lazily performs a side effect for each value using the provided callback.
     *
     * Note: Unlike Array.prototype.forEach, this does not terminate or consume the iterator. It is a pass-through operation and can be used for observability (e.g., logging, debugging) within a pipeline. The iterator continues to yield values downstream.
     */
    forEach(cb: ForEachFunc<GetLastMethodType<Methods>[1]>) {
        this._methods.push({
            fn: cb,
            kind: 'forEach'
        });

        return this as unknown as LazyIterator<IterType, Push<Methods, ForEachFunc<GetLastMethodType<Methods>[1],GetLastMethodType<Methods>[1]>>>;
    }

    /**
     * Lazily reduces values to a single result using the provided reducer and initial value.
     */
    reduce<S>(cb: ReduceFunc<GetLastMethodType<Methods>[1],S>, initVal: S) {
        this._methods.push({
            fn: cb,
            kind: 'reduce',
            initVal
        })

        const lazyIterator = this as unknown as LazyIterator<IterType, Push<Methods, ReduceFunc<GetLastMethodType<Methods>[1],S>>>

        const reduceExec = new ReduceExecutor(lazyIterator);

        return reduceExec;
    }

    /**
     * Collects all values into an array.
     */
    toArray(): GetLastMethodType<Methods>[1][] {
        return this.collect()
    }

    /**
     * Creates multiple independent iterators (tees) from this iterator.
     *
     * @throws Error If count is not a positive integer.
     */
    tee(count: number) {
        return createTeeIterators<GetLastMethodType<Methods>[1]>(this, count).map(v => LazyIterator.from(v))
    }

    /**
     * Collects all values into an array (alias for toArray).
     */
    collect(): GetLastMethodType<Methods>[1][] {
        const out: GetLastMethodType<Methods>[] = []
        for(const elem of this) {
            out.push(elem)
        }
        return out
    }

    /**
     * Takes the first n values from the iterator.
     *
     * @throws Error If n is negative or not a number.
     */
    take(n: number): GetLastMethodType<Methods>[1][] {
        if (typeof n !== 'number' || n < 0) throw new Error('take(n): n must be a non-negative number');
        const out: GetLastMethodType<Methods>[1][] = [];
        let count = 0;
        for (const elem of this) {
            if (count++ >= n) break;
            out.push(elem);
        }
        return out;
    }

    /**
     * Skips the first n values from the iterator.
     *
     * @throws Error If n is negative or not a number.
     */
    drop(n: number): GetLastMethodType<Methods>[1][] {
        if (typeof n !== 'number' || n < 0) throw new Error('drop(n): n must be a non-negative number');
        const out: GetLastMethodType<Methods>[1][] = [];
        let count = 0;
        for (const elem of this) {
            if (count++ < n) continue;
            out.push(elem);
        }
        return out;
    }

    /**
     * Takes values while the predicate returns true.
     */
    takeWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean): GetLastMethodType<Methods>[1][] {
        const out: GetLastMethodType<Methods>[1][] = [];
        let idx = 0;
        for (const elem of this) {
            if (!predicate(elem, idx)) break;
            out.push(elem);
            idx++;
        }
        return out;
    }

    /**
     * Skips values while the predicate returns true, then collects the rest.
     */
    dropWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean): GetLastMethodType<Methods>[1][] {
        const out: GetLastMethodType<Methods>[1][] = [];
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
}

type ExtractLazyIteratorMethods<T extends unknown> =
    T extends LazyIterator<infer _, infer Q> 
    ? Q
    : never;


 /**
 * Executes a reduce operation on a LazyIterator chain.
 */
class ReduceExecutor<R extends any, S extends IteratorMethods<any,any>, T extends LazyIterator<R, S[]>> {
    private lazyIterator: T;

    constructor(lazyIterator: T) {
        this.lazyIterator = lazyIterator;
    }

    /**
     * Executes the reduce operation and returns the result.
     */
    execute() {
        const reduceMethod = this.lazyIterator._methods.at(-1)!;
        this.lazyIterator._methods.slice(0,-1);
        const array = this.lazyIterator.collect();
        const result = array.reduce(reduceMethod.fn as unknown as ReduceFunc<GetLastMethodType<ExtractLazyIteratorMethods<T>>[0],GetLastMethodType<ExtractLazyIteratorMethods<T>>[1]>, reduceMethod.initVal);
        return result as unknown as GetLastMethodType<ExtractLazyIteratorMethods<T>>[1]
    }
}
