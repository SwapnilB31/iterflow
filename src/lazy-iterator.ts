import {createTeeIterators} from './tee'

type MapFunc<T,S> = (x: T, idx: number) => S;
type FilterFunc<T,S extends any = any> = (x: T, idx: number) => boolean;
type ForEachFunc<T,S extends any = any> = (x: T, idx: number) => void;
type ReduceFunc<T,S> = (acc: S, curr: T, idx: number) => S;


type IteratorMethods<T,S extends any = any> = 
  MapFunc<T,S> |
  FilterFunc<T,S> |
  ForEachFunc<T,S> |
  ReduceFunc<T,S> |
  Iterator<T>

type ExtractMapTypeFromFunc<T extends unknown[]> =
  T extends  [infer First, ...infer Rest] ?
    First extends (...args: any[]) => any ?
      Rest extends ((...args: any[]) => any)[] ?
        [ReturnType<First>, ...ExtractMapTypeFromFunc<Rest>]
      : never
    : never
  : [];

// type rs3 = ExtractMapTypeFromFunc<[MapFunc<string, number>, ReduceFunc<number, { name: string}>]>

// type x = [
//   Iterator<number>,
//   MapFunc<number, string>,
// ]


type GetLast<T extends any[]> = T extends readonly [...any[], infer Last] ? 
  Last extends Iterator<infer P> ?
    readonly [P,P] 
      : Last extends IteratorMethods<infer Q, infer R> ?
        readonly [Q, R]
      : never
    : never;

type Push<T extends any[], S extends any> = [...T, S];


// type LazyIterator<IterType, Methods extends IteratorMethods<any,any>[] = [Iterator<IterType>]> = {
//   map<S>(cb: MapFunc<GetLast<Methods>[1],S>): LazyIterator<IterType, Push<Methods, MapFunc<GetLast<Methods>[1],S>>>;
//   filter(cb: FilterFunc<GetLast<Methods>[1]>): LazyIterator<IterType, Push<Methods, FilterFunc<GetLast<Methods>[1],GetLast<Methods>[1]>>>;
//   forEach(cb: ForEachFunc<GetLast<Methods>[1]>): LazyIterator<IterType, Push<Methods, ForEachFunc<GetLast<Methods>[1],GetLast<Methods>[1]>>>;
//   reduce<S>(cb: ReduceFunc<GetLast<Methods>[1],S>, initVal: S): LazyIterator<IterType, Push<Methods, ReduceFunc<GetLast<Methods>[1],S>>>;
//   collect(): GetLast<Methods>[1][]
// }

export class LazyIterator<IterType, Methods extends IteratorMethods<any,any>[] = [Iterator<IterType>]> implements IterableIterator<IterType> {
    iterator: Iterator<IterType>;
    methods: {
        fn: IteratorMethods<any,any>
        kind: 'map' | 'reduce' | 'forEach' | 'filter',
        initVal?: any
    }[];

    exhausted: boolean;
    caughtError: Error | null;
    index: number;

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

    constructor(iterator: Iterator<IterType>) {
        this.iterator = iterator;
        this.methods = []
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

    next(): IteratorResult<GetLast<Methods>[1],undefined> {
        // if(this.methods.length === 0) return { done: true, value: undefined}; 
        if(this.exhausted) return { done: true, value: undefined} 

        while(true) {
            const nextVal = this.iterator.next();
        
            if(nextVal.done) {
                this.exhausted = true;
                 return { done: true, value: undefined}
            }

            if(this.methods.length === 0) return { value: nextVal.value, done: false} as { value: GetLast<Methods>[1], done: false}

            
            let filterFail = false;
            let a = nextVal.value;

            for(let i = 0; i < this.methods.length; i++) {
                let retVal = this.executeFunctMethod(this.methods[i], a, this.index)
                
                // console.log({ value: nextVal.value, retVal, kind: this.methods[i].kind});

                if(this.methods[i].kind === 'map')
                    a = retVal;
                if(this.methods[i].kind === 'filter' && retVal === false) {
                    filterFail = true;
                    break
                }
            }


            this.index++;

            if(filterFail) continue;

            return { done: false, value: a} as { value: GetLast<Methods>[1], done: false}
        }
        
    }

    return(value: any) {
        if(!this.exhausted) {
            this.exhausted = true;
        }

        return { value, done: this.exhausted }
    }

    throw(e: any) {
        if(!this.exhausted) {
            this.exhausted = true
        }

        return { done: this.exhausted, value: undefined}
    }

    [Symbol.iterator]() {
        return this
    } 

    map<S>(cb: MapFunc<GetLast<Methods>[1],S>) {
        this.methods.push({
            fn: cb,
            kind: 'map'
        });

        return this as unknown as LazyIterator<IterType, Push<Methods, MapFunc<GetLast<Methods>[1],S>>>;
    }

    filter(cb: FilterFunc<GetLast<Methods>[1]>) {
        this.methods.push({
            fn: cb,
            kind: 'filter'
        });

        return this as unknown as LazyIterator<IterType, Push<Methods, FilterFunc<GetLast<Methods>[1],GetLast<Methods>[1]>>>;
    }

    forEach(cb: ForEachFunc<GetLast<Methods>[1]>) {
        this.methods.push({
            fn: cb,
            kind: 'forEach'
        });

        return this as unknown as LazyIterator<IterType, Push<Methods, ForEachFunc<GetLast<Methods>[1],GetLast<Methods>[1]>>>;
    }

    reduce<S>(cb: ReduceFunc<GetLast<Methods>[1],S>, initVal: S) {
        this.methods.push({
            fn: cb,
            kind: 'reduce',
            initVal
        })

        const lazyIterator = this as unknown as LazyIterator<IterType, Push<Methods, ReduceFunc<GetLast<Methods>[1],S>>>

        const reduceExec = new ReduceExecutor(lazyIterator);

        return reduceExec;
    }

    toArray(): GetLast<Methods>[1][] {
        return this.collect()
    }

    tee(count: number) {
        return createTeeIterators<GetLast<Methods>[1]>(this, count).map(v => LazyIterator.from(v))
    }

    collect(): GetLast<Methods>[1][] {
        const out: GetLast<Methods>[] = []
        for(const elem of this) {
            out.push(elem)
        }
        return out
    }

    take(n: number): GetLast<Methods>[1][] {
        if (typeof n !== 'number' || n < 0) throw new Error('take(n): n must be a non-negative number');
        const out: GetLast<Methods>[1][] = [];
        let count = 0;
        for (const elem of this) {
            if (count++ >= n) break;
            out.push(elem);
        }
        return out;
    }

    drop(n: number): GetLast<Methods>[1][] {
        if (typeof n !== 'number' || n < 0) throw new Error('drop(n): n must be a non-negative number');
        const out: GetLast<Methods>[1][] = [];
        let count = 0;
        for (const elem of this) {
            if (count++ < n) continue;
            out.push(elem);
        }
        return out;
    }

    takeWhile(predicate: (x: GetLast<Methods>[1], idx: number) => boolean): GetLast<Methods>[1][] {
        const out: GetLast<Methods>[1][] = [];
        let idx = 0;
        for (const elem of this) {
            if (!predicate(elem, idx)) break;
            out.push(elem);
            idx++;
        }
        return out;
    }

    dropWhile(predicate: (x: GetLast<Methods>[1], idx: number) => boolean): GetLast<Methods>[1][] {
        const out: GetLast<Methods>[1][] = [];
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


class ReduceExecutor<R extends any, S extends IteratorMethods<any,any>, T extends LazyIterator<R, S[]>> {
    private lazyIterator: T;

    constructor(lazyIterator: T) {
        this.lazyIterator = lazyIterator;
    }

    execute() {
        const reduceMethod = this.lazyIterator.methods.at(-1)!;
        this.lazyIterator.methods.slice(0,-1);
        const array = this.lazyIterator.collect();
        const result = array.reduce(reduceMethod.fn as unknown as ReduceFunc<GetLast<ExtractLazyIteratorMethods<T>>[0],GetLast<ExtractLazyIteratorMethods<T>>[1]>, reduceMethod.initVal);
        return result as unknown as GetLast<ExtractLazyIteratorMethods<T>>[1]
    }
}
