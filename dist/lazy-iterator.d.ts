type MapFunc<T, S> = (x: T, idx: number) => S;
type FilterFunc<T, S extends any = any> = (x: T, idx: number) => boolean;
type ForEachFunc<T, S extends any = any> = (x: T, idx: number) => void;
type ReduceFunc<T, S> = (acc: S, curr: T, idx: number) => S;
type IteratorMethods<T, S extends any = any> = MapFunc<T, S> | FilterFunc<T, S> | ForEachFunc<T, S> | ReduceFunc<T, S> | Iterator<T>;
type GetLast<T extends any[]> = T extends readonly [...any[], infer Last] ? Last extends Iterator<infer P> ? readonly [P, P] : Last extends IteratorMethods<infer Q, infer R> ? readonly [Q, R] : never : never;
type Push<T extends any[], S extends any> = [...T, S];
export declare class LazyIterator<IterType, Methods extends IteratorMethods<any, any>[] = [Iterator<IterType>]> implements IterableIterator<IterType> {
    iterator: Iterator<IterType>;
    methods: {
        fn: IteratorMethods<any, any>;
        kind: 'map' | 'reduce' | 'forEach' | 'filter';
        initVal?: any;
    }[];
    exhausted: boolean;
    caughtError: Error | null;
    index: number;
    static from<T>(iter: Iterator<T> | Iterable<T>): LazyIterator<T, [Iterator<T, any, any>]>;
    constructor(iterator: Iterator<IterType>);
    private executeFunctMethod;
    next(): IteratorResult<GetLast<Methods>[1], undefined>;
    return(value: any): {
        value: any;
        done: true;
    };
    throw(e: any): {
        done: true;
        value: undefined;
    };
    [Symbol.iterator](): this;
    map<S>(cb: MapFunc<GetLast<Methods>[1], S>): LazyIterator<IterType, Push<Methods, MapFunc<GetLast<Methods>[1], S>>>;
    filter(cb: FilterFunc<GetLast<Methods>[1]>): LazyIterator<IterType, Push<Methods, FilterFunc<GetLast<Methods>[1], GetLast<Methods>[1]>>>;
    forEach(cb: ForEachFunc<GetLast<Methods>[1]>): LazyIterator<IterType, Push<Methods, ForEachFunc<GetLast<Methods>[1], GetLast<Methods>[1]>>>;
    reduce<S>(cb: ReduceFunc<GetLast<Methods>[1], S>, initVal: S): ReduceExecutor<unknown, IteratorMethods<any, any>, LazyIterator<IterType, [...Methods, ReduceFunc<GetLast<Methods>[1], S>]>>;
    toArray(): GetLast<Methods>[1][];
    tee(count: number): LazyIterator<GetLast<Methods>[1], [Iterator<GetLast<Methods>[1], any, any>]>[];
    collect(): GetLast<Methods>[1][];
    take(n: number): GetLast<Methods>[1][];
    drop(n: number): GetLast<Methods>[1][];
    takeWhile(predicate: (x: GetLast<Methods>[1], idx: number) => boolean): GetLast<Methods>[1][];
    dropWhile(predicate: (x: GetLast<Methods>[1], idx: number) => boolean): GetLast<Methods>[1][];
}
type ExtractLazyIteratorMethods<T extends unknown> = T extends LazyIterator<infer _, infer Q> ? Q : never;
declare class ReduceExecutor<R extends any, S extends IteratorMethods<any, any>, T extends LazyIterator<R, S[]>> {
    private lazyIterator;
    constructor(lazyIterator: T);
    execute(): GetLast<ExtractLazyIteratorMethods<T>>[1];
}
export {};
