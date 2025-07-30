import {createAsyncTeeIterators} from './tee';

type MapFunc<T,S> = (x: T, idx: number) => S;
type FilterFunc<T,S extends any = any> = (x: T, idx: number) => boolean;
type ForEachFunc<T,S extends any = any> = (x: T, idx: number) => void;
type ReduceFunc<T,S> = (acc: S, curr: T, idx: number) => S;
type MapAsyncFunc<T,S> = (x: T, idx: number) => Promise<S>
type FilterAsyncFunc<T, S extends any = any> = (x: T, idx: number) => Promise<boolean>
type ForEachAsyncFunc<T, S extends any = any> = (x: T, idx: number) => Promise<void>

type AsyncIterMethods<T,S> = 
    MapFunc<T,S> |
    FilterFunc<T,S> |
    ForEachFunc<T,S> |
    ReduceFunc<T,S> |
    MapAsyncFunc<T,S> |
    FilterAsyncFunc<T,S> |
    ForEachAsyncFunc<T,S> |
    Iterator<T> |
    AsyncIterator<T>;

type GetLastMethodType<T extends any[]> = 
    T extends [...any[], infer Last]
    ?   Last extends Iterator<infer R> | AsyncIterator<infer R>
        ? [R,R]
        : Last extends AsyncIterMethods<infer P, infer Q>
            ? [P,Q]
            : never
    : never;

type Push<T extends any[], S extends any> = [...T, S];

type AsyncChainMethod = { kind: 'mapAsync' | 'filterAsync' | 'forEachAsync', fn: MapAsyncFunc<any,any> | FilterAsyncFunc<any,any> | ForEachAsyncFunc<any,any> };
type SyncChainMethod = { kind: 'map' | 'filter' | 'forEach', fn: MapFunc<any,any> | FilterFunc<any,any> | ForEachFunc<any,any>};
type ReduceMethod = { kind: 'reduce', fn: ReduceFunc<any,any>, initVal?: any };

export class LazyAsyncIterator<IterType, Methods extends AsyncIterMethods<any,any>[] = [Iterator<IterType> | AsyncIterator<IterType>]> implements AsyncIterableIterator<IterType> {
    iterator: Iterator<IterType> | AsyncIterator<IterType>;
    methods: 
        (SyncChainMethod | AsyncChainMethod | ReduceMethod)[]

    exhausted: boolean;
    caughtError: Error | null;
    index: number;

    constructor(iterator: Iterator<IterType> | AsyncIterator<IterType>) {
        this.iterator = iterator;
        this.methods = [];
        this.exhausted = false;
        this.caughtError = null;
        this.index = 0;
    }


    static from<T>(input: Iterator<T> | AsyncIterator<T> | Iterable<T> | AsyncIterable<T>): LazyAsyncIterator<T> {
        if (input === undefined || input === null) {
            throw new Error("LazyAsyncIterator cannot be created from null or undefined");
        }
        // If it's an async iterator
        if (typeof input === 'object' && 'next' in input && typeof input.next === 'function' && (Symbol.asyncIterator in input)) {
            return new LazyAsyncIterator<T>(input as AsyncIterator<T>);
        }
        // If it's a sync iterator
        if (typeof input === 'object' && 'next' in input && typeof input.next === 'function' && (Symbol.iterator in input)) {
            return new LazyAsyncIterator<T>(input as Iterator<T>);
        }
        // If it's an async iterable
        if (typeof input === 'object' && Symbol.asyncIterator in input) {
            const iterator = (input as AsyncIterable<T>)[Symbol.asyncIterator]();
            return new LazyAsyncIterator<T>(iterator);
        }
        // If it's a sync iterable
        if (typeof input === 'object' && Symbol.iterator in input) {
            const iterator = (input as Iterable<T>)[Symbol.iterator]();
            return new LazyAsyncIterator<T>(iterator);
        }
        throw new Error("Couldn't create LazyAsyncIterator. No valid iterator or iterable provided.");
    }

    private async getNextElement() {
        if(Symbol.iterator in this.iterator || Symbol.asyncIterator in this.iterator)
            return this.iterator.next()
        return { done: true, value: undefined}
    }

    private async executeChainedMethod<T>(method: SyncChainMethod | AsyncChainMethod, value: T, index: number) {
        return method.fn(value, index)
    }

    private executeReduceMethod<T>(method: ReduceMethod, value: T, index: number, initVal?: any) {
        return method.fn(initVal, value, index)
    }

    [Symbol.asyncIterator]() {
        return this
    }
    
    async next(): Promise<IteratorResult<GetLastMethodType<Methods>[1]>> {
        if(this.exhausted) return { done: true, value: undefined };

        while(true) {
            const nextResult = await this.getNextElement();

            if(nextResult.done) {
                this.exhausted = true;
                return { done: true, value: undefined }
            }

            if(this.methods.length === 0) return { done: false, value: nextResult.value } as { done: false, value: GetLastMethodType<Methods>[1]}; 

            let opResult = nextResult.value;
            let filterFail = false;

            for(const method of this.methods) {
                let retVal;
                if(method.kind !== "reduce") {
                    retVal = await this.executeChainedMethod(method, opResult, this.index)
                }
                else {
                    this.executeReduceMethod(method, opResult, this.index, method.initVal)
                }

                if(method.kind === 'map' || method.kind === 'mapAsync')
                    opResult = retVal

                if((method.kind === 'filter' || method.kind === 'filterAsync') && !retVal) {
                    filterFail = true
                    break;
                }
            }

            this.index++;

            if(filterFail) continue;

            return { done: false, value: opResult } as { done: false, value: GetLastMethodType<Methods>[1]}
        }
    }

    async return(value: any) {
        if(!this.exhausted) {
            this.exhausted = true;
        }

        return { value, done: this.exhausted }
    }

    async throw(e: any) {
        if(!this.exhausted) {
            this.exhausted = true
        }

        return { done: this.exhausted, value: undefined}
    }

    map<S>(cb: MapFunc<GetLastMethodType<Methods>[1],S>) {
        this.methods.push({
            kind: 'map',
            fn: cb
        });

        return this as unknown as LazyAsyncIterator<IterType,Push<Methods, MapFunc<GetLastMethodType<Methods>[1],S>>>
    }

    filter(cb: FilterFunc<GetLastMethodType<Methods>[1]>) {
        this.methods.push({
            kind: 'filter',
            fn: cb
        });

        return this as unknown as LazyAsyncIterator<IterType, Push<Methods,FilterFunc<GetLastMethodType<Methods>[1],GetLastMethodType<Methods>[1]>>>;
    }

    forEach(cb: ForEachFunc<GetLastMethodType<Methods>[1]>) {
        this.methods.push({
            kind: 'forEach',
            fn: cb
        });

        return this as unknown as LazyAsyncIterator<IterType, Push<Methods, ForEachFunc<GetLastMethodType<Methods>[1],GetLastMethodType<Methods>[1]>>>;
    }

    mapAsync<S>(cb: MapAsyncFunc<GetLastMethodType<Methods>[1],S>) {
        this.methods.push({
            kind: 'mapAsync',
            fn: cb
        });

        return this as unknown as LazyAsyncIterator<IterType, Push<Methods, MapAsyncFunc<GetLastMethodType<Methods>[1],S>>>
    }

    filterAsync(cb: FilterAsyncFunc<GetLastMethodType<Methods>[1]>) {
        this.methods.push({
            kind: 'filterAsync',
            fn: cb
        });

        return this as unknown as LazyAsyncIterator<IterType, Push<Methods, FilterAsyncFunc<GetLastMethodType<Methods>[1],GetLastMethodType<Methods>[1]>>>;
    }

    forEachASync(cb: ForEachAsyncFunc<GetLastMethodType<Methods>[1]>) {
        this.methods.push({
            kind: 'forEachAsync',
            fn: cb
        });

        return this as unknown as LazyAsyncIterator<IterType, Push<Methods, ForEachAsyncFunc<GetLastMethodType<Methods>[1],GetLastMethodType<Methods>[1]>>>;
    }



    reduce<S>(cb: ReduceFunc<GetLastMethodType<Methods>[1],S>, initVal: S) {
        this.methods.push({
            fn: cb,
            kind: 'reduce',
            initVal
        })

        const lazyIterator = this as unknown as LazyAsyncIterator<IterType, Push<Methods, ReduceFunc<GetLastMethodType<Methods>[1],S>>>

        const reduceExec = new ReduceExecutor(lazyIterator);

        return reduceExec;
    }

    /**
     * Executes up to `concurrency` next() calls in parallel and returns all settled results.
     */
    private async _batchNext(concurrency: number): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]> {
        const promises: Promise<IteratorResult<GetLastMethodType<Methods>[1]>>[] = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(this.next());
        }
        return Promise.allSettled(promises);
    }

    tee(count: number) {
        return createAsyncTeeIterators<GetLastMethodType<Methods>[1]>(this, count).map(v => LazyAsyncIterator.from(v))
    }

    /**
     * Returns all values, throws on error, stops at first done.
     */
    async collect(concurrency: number = 1): Promise<GetLastMethodType<Methods>[1][]> {
        const collected: GetLastMethodType<Methods>[1][] = [];
        while (true) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled') {
                    if (res.value.done) return collected;
                    collected.push(res.value.value);
                } else {
                    throw res.reason;
                }
            }
        }
    }

    /**
     * Returns all settled results (fulfilled and rejected), stops at first done.
     */
    async collectSettled(concurrency: number = 1): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]> {
        const collected: PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[] = [];
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                collected.push(res);
                if (res.status === 'fulfilled' && res.value.done) {
                    done = true;
                }
            }
        }
        return collected;
    }

    /**
     * Returns the first n values, throws on error. Supports concurrency.
     */
    async take(n: number, concurrency: number = 1): Promise<GetLastMethodType<Methods>[1][]> {
        if (typeof n !== 'number' || n < 0) throw new Error('take(n): n must be a non-negative number');
        const out: GetLastMethodType<Methods>[1][] = [];
        let done = false;
        while (!done && out.length < n) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled') {
                    if (res.value.done) {
                        done = true;
                        break;
                    }
                    out.push(res.value.value);
                    if (out.length >= n) break;
                } else {
                    throw res.reason;
                }
            }
        }
        return out.slice(0, n);
    }

    /**
     * Returns the first n settled results (fulfilled or rejected), stops at first done. Supports concurrency.
     */
    async takeSettled(n: number, concurrency: number = 1): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]> {
        if (typeof n !== 'number' || n < 0) throw new Error('takeSettled(n): n must be a non-negative number');
        const out: PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[] = [];
        let done = false;
        while (!done && out.length < n) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                out.push(res);
                if (res.status === 'fulfilled' && res.value.done) {
                    done = true;
                    break;
                }
                if (out.length >= n) break;
            }
        }
        return out.slice(0, n);
    }

    /**
     * Drops the first n values, returns the rest, throws on error. Supports concurrency.
     */
    async drop(n: number, concurrency: number = 1): Promise<GetLastMethodType<Methods>[1][]> {
        if (typeof n !== 'number' || n < 0) throw new Error('drop(n): n must be a non-negative number');
        const out: GetLastMethodType<Methods>[1][] = [];
        let dropped = 0;
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled') {
                    if (res.value.done) {
                        done = true;
                        break;
                    }
                    if (dropped < n) {
                        dropped++;
                        continue;
                    }
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
     */
    async dropSettled(n: number, concurrency: number = 1): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]> {
        if (typeof n !== 'number' || n < 0) throw new Error('dropSettled(n): n must be a non-negative number');
        const out: PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[] = [];
        let dropped = 0;
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled' && dropped < n) {
                    if (res.value.done) {
                        done = true;
                        break;
                    }
                    dropped++;
                    continue;
                }
                out.push(res);
                if (res.status === 'fulfilled' && res.value.done) {
                    done = true;
                    break;
                }
            }
        }
        return out;
    }

    /**
     * Returns values while predicate is true, throws on error. Supports concurrency.
     */
    async takeWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency: number = 1): Promise<GetLastMethodType<Methods>[1][]> {
        const out: GetLastMethodType<Methods>[1][] = [];
        let idx = 0;
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled') {
                    if (res.value.done || !predicate(res.value.value, idx)) {
                        done = true;
                        break;
                    }
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
    async takeWhileSettled(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency: number = 1): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]> {
        const out: PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[] = [];
        let idx = 0;
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                out.push(res);
                if (res.status === 'fulfilled') {
                    if (res.value.done || !predicate(res.value.value, idx)) {
                        done = true;
                        break;
                    }
                    idx++;
                }
            }
        }
        return out;
    }

    /**
     * Drops values while predicate is true, returns the rest, throws on error. Supports concurrency.
     */
    async dropWhile(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency: number = 1): Promise<GetLastMethodType<Methods>[1][]> {
        const out: GetLastMethodType<Methods>[1][] = [];
        let idx = 0;
        let dropping = true;
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled') {
                    if (res.value.done) {
                        done = true;
                        break;
                    }
                    if (dropping && predicate(res.value.value, idx)) {
                        idx++;
                        continue;
                    }
                    dropping = false;
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
    async dropWhileSettled(predicate: (x: GetLastMethodType<Methods>[1], idx: number) => boolean, concurrency: number = 1): Promise<PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[]> {
        const out: PromiseSettledResult<IteratorResult<GetLastMethodType<Methods>[1], any>>[] = [];
        let idx = 0;
        let dropping = true;
        let done = false;
        while (!done) {
            const results = await this._batchNext(concurrency);
            for (const res of results) {
                if (res.status === 'fulfilled' && dropping && predicate(res.value.value, idx)) {
                    if (res.value.done) {
                        done = true;
                        break;
                    }
                    idx++;
                    continue;
                }
                out.push(res);
                if (res.status === 'fulfilled') {
                    if (res.value.done) {
                        done = true;
                        break;
                    }
                    if (dropping && predicate(res.value.value, idx)) {
                        idx++;
                        continue;
                    }
                    dropping = false;
                    idx++;
                }
            }
        }
        return out;
    }
}

type ExtractLazyIteratorMethods<T extends unknown> =
    T extends LazyAsyncIterator<infer _, infer Q> 
    ? Q
    : never;


class ReduceExecutor<R extends any, S extends AsyncIterMethods<any,any>, T extends LazyAsyncIterator<R, S[]>> {
    private lazyIterator: T;

    constructor(lazyIterator: T) {
        this.lazyIterator = lazyIterator;
    }

    async execute() {
        const reduceMethod = this.lazyIterator.methods.at(-1)!;
        this.lazyIterator.methods.slice(0,-1);
        const array = await this.lazyIterator.collect();
        //@ts-expect-error
        const result = array.reduce(reduceMethod.fn as unknown as ReduceFunc<GetLastMethodType<ExtractLazyIteratorMethods<T>>[0],GetLastMethodType<ExtractLazyIteratorMethods<T>>[1]>, reduceMethod.initVal);
        return result as unknown as GetLastMethodType<ExtractLazyIteratorMethods<T>>[1]
    }
}


// const it = await new LazyAsyncIterator([1,2,3,4][Symbol.iterator]()).mapAsync((x, i) => Promise.resolve({ num: x })).collectSettled() //reduce((acc, curr) => ({sum: acc.sum + curr.num}), {sum: 0}).execute()


