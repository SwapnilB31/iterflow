import { LazyIterator } from "../src/lazy-iterator";
import { describe, it, expect } from "vitest";

describe('LazyIterator', () => {
  function* genNumbers() {
    yield 1; yield 2; yield 3; yield 4; yield 5;
  }

  it('should construct from iterator and iterable', () => {
    const arr = [1, 2, 3];
    expect(() => LazyIterator.from(arr)).not.toThrow();
    expect(() => LazyIterator.from(arr[Symbol.iterator]())).not.toThrow();
    expect(() => LazyIterator.from(null as any)).toThrow();
    expect(() => LazyIterator.from(undefined as any)).toThrow();
    expect(() => LazyIterator.from({} as any)).toThrow();
  });

  it('should iterate with next()', () => {
    const it = LazyIterator.from([1, 2, 3]);
    expect(it.next().value).toBe(1);
    expect(it.next().value).toBe(2);
    expect(it.next().value).toBe(3);
    expect(it.next().done).toBe(true);
  });

  it('should support map()', () => {
    const it = LazyIterator.from([1, 2, 3]).map(x => x * 2);
    expect(it.next().value).toBe(2);
    expect(it.next().value).toBe(4);
    expect(it.next().value).toBe(6);
    expect(it.next().done).toBe(true);
  });

  it('should support filter()', () => {
    const it = LazyIterator.from([1, 2, 3, 4]).filter(x => x % 2 === 0);
    expect(it.next().value).toBe(2);
    expect(it.next().value).toBe(4);
    expect(it.next().done).toBe(true);
  });

  it('should support forEach()', () => {
    const arr: number[] = [];
    const it = LazyIterator.from([1, 2, 3]).forEach(x => arr.push(x));
    // forEach does not affect output, just side effect
    expect(it.next().value).toBe(1);
    expect(it.next().value).toBe(2);
    expect(it.next().value).toBe(3);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('should support reduce()', () => {
    const it = LazyIterator.from([1, 2, 3]);
    const result = it.reduce((acc, curr) => acc + curr, 0).execute();
    expect(result).toBe(6);
  });

  it('should support toArray() and collect()', () => {
    const it = LazyIterator.from([1, 2, 3]).map(x => x + 1);
    expect(it.toArray()).toEqual([2, 3, 4]);
    expect(it.collect()).toEqual([]); // already exhausted
  });

  it('should support take()', () => {
    const it = LazyIterator.from([1, 2, 3, 4, 5]);
    expect(it.take(3)).toEqual([1, 2, 3]);
    expect(it.take(0)).toEqual([]);
    expect(() => it.take(-1)).toThrow();
  });

  it('should support drop()', () => {
    const [it1, it2] = LazyIterator.from([1, 2, 3, 4, 5]).tee(2);
    expect(it1.drop(2)).toEqual([3, 4, 5]);
    expect(it2.drop(0)).toEqual([1, 2, 3, 4, 5]);
    expect(() => it2.drop(-1)).toThrow();
  });

  it('should support takeWhile()', () => {
    const it = LazyIterator.from([1, 2, 3, 4, 5]);
    expect(it.takeWhile((x) => x < 4)).toEqual([1, 2, 3]);
    expect(it.takeWhile((x) => false)).toEqual([]);
  });

  it('should support dropWhile()', () => {
    const it = LazyIterator.from([1, 2, 3, 4, 5]);
    expect(it.dropWhile((x) => x < 3)).toEqual([3, 4, 5]);
    expect(it.dropWhile((x) => true)).toEqual([]);
  });

  it('should support tee()', () => {
    const it = LazyIterator.from([1, 2, 3, 4, 5]);
    const tees = it.tee(2);
    expect(Array.isArray(tees)).toBe(true);
    expect(tees.length).toBe(2);
    expect([...tees[0]]).toEqual([1, 2, 3, 4, 5]);
    expect([...tees[1]]).toEqual([1, 2, 3, 4, 5]);
  });

  it('should support take() with generator', () => {
    const it = LazyIterator.from(genNumbers());
    expect(it.take(3)).toEqual([1, 2, 3]);
    expect(it.take(0)).toEqual([]);
    expect(() => it.take(-1)).toThrow();
  });

  it('should support drop() with generator', () => {
    const [it1, it2] = LazyIterator.from(genNumbers()).tee(2);
    expect(it1.drop(2)).toEqual([3, 4, 5]);
    expect(it2.drop(0)).toEqual([1, 2, 3, 4, 5]);
    expect(() => it2.drop(-1)).toThrow();
  });

  it('should support takeWhile() with generator', () => {
    const it = LazyIterator.from(genNumbers());
    expect(it.takeWhile((x) => x < 4)).toEqual([1, 2, 3]);
    expect(it.takeWhile((x) => false)).toEqual([]);
  });

  it('should support dropWhile() with generator', () => {
    const it = LazyIterator.from(genNumbers());
    expect(it.dropWhile((x) => x < 3)).toEqual([3, 4, 5]);
    expect(it.dropWhile((x) => true)).toEqual([]);
  });

  it('should support tee() with generator', () => {
    const it = LazyIterator.from(genNumbers());
    const tees = it.tee(3);
    expect(Array.isArray(tees)).toBe(true);
    expect(tees.length).toBe(3);
    expect([...tees[0]]).toEqual([1, 2, 3, 4, 5]);
    expect([...tees[1]]).toEqual([1, 2, 3, 4, 5]);
    expect([...tees[2]]).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle exhausted iterator', () => {
    const it = LazyIterator.from([1]);
    it.next();
    expect(it.next().done).toBe(true);
    expect(it.collect()).toEqual([]);
  });

  it('should handle return()', () => {
    const it = LazyIterator.from([1, 2, 3]);
    it.next();
    const ret = it.return('done');
    expect(ret.value).toBe('done');
    expect(ret.done).toBe(true);
    expect(it.next().done).toBe(true);
  });

  it('should handle throw()', () => {
    const it = LazyIterator.from([1, 2, 3]);
    it.next();
    const ret = it.throw(new Error('fail'));
    expect(ret.done).toBe(true);
    expect(ret.value).toBeUndefined();
    expect(it.next().done).toBe(true);
  });

  it('should work with chained map/filter', () => {
    const it = LazyIterator.from([1, 2, 3, 4, 5])
      .map(x => x * 2)
      .filter(x => x > 5);
    expect(it.collect()).toEqual([6, 8, 10]);
  });

  it('should work with chained map/filter/forEach/reduce', () => {
    const arr: number[] = [];
    const it = LazyIterator.from([1, 2, 3, 4])
      .map(x => x + 1)
      .filter(x => x % 2 === 0)
      .forEach(x => arr.push(x));
    expect(it.collect()).toEqual([2, 4]);
    expect(arr).toEqual([2, 4]);
    const it2 = LazyIterator.from([1, 2, 3, 4])
      .map(x => x + 1)
      .filter(x => x % 2 === 0);
    const sum = it2.reduce((acc, curr) => acc + curr, 0).execute();
    expect(sum).toBe(6);
  });

  it('should handle empty input', () => {
    const it = LazyIterator.from([]);
    expect(it.next().done).toBe(true);
    expect(it.collect()).toEqual([]);
    expect(it.take(2)).toEqual([]);
    expect(it.drop(2)).toEqual([]);
    expect(it.takeWhile(() => true)).toEqual([]);
    expect(it.dropWhile(() => true)).toEqual([]);
  });

  it('should handle errors in map/filter', () => {
    const it = LazyIterator.from([1, 2, 3]).map(x => { if (x === 2) throw new Error('fail'); return x; });
    expect(() => {
      for (const _ of it) {}
    }).toThrow('fail');
  });

  it('should map 2D array of strings to min/max length objects and reduce to get overall min/max', () => {
    function* gen2dStringArr() {
        yield ['a', 'bb', 'ccc'],
        yield ['dddd', 'ee', 'f'],
        yield ['ggggg', 'hhh']
        return
    }
    
    const it = LazyIterator.from(gen2dStringArr())
      .map(row => {
        const lengths = row.map(s => s.length);
        return {
          minLength: Math.min(...lengths),
          maxLength: Math.max(...lengths)
        };
      })
      .forEach((v,idx) => console.log({ obj: v, idx}));
    
    const result = it.reduce((acc, curr) => ({
      minLength: Math.min(acc.minLength, curr.minLength),
      maxLength: Math.max(acc.maxLength, curr.maxLength)
    }), { minLength: Infinity, maxLength: -Infinity }).execute();
    
    expect(result).toEqual({ minLength: 1, maxLength: 5 });
  });
});


describe("Lazy Iterator",() => {
  it("Additional Tests -1 ",() => {
    function* genNumbers() {
      yield [1,7,4] as const;
      yield [12,-2,3] as const;
      yield [15,16,82] as const;
    }


    const it = LazyIterator.from(genNumbers())
    .map(v => ({
      min: Math.min(...v),
      max: Math.max(...v)
    }))
    .forEach(v => console.log("Mapped Value: "+JSON.stringify(v)))

    console.log("Console in the middle");

    it.filter(v => v.min > 0)

    console.log("Console After Filter");

    it.forEach(v => console.log("Filtered Value: "+JSON.stringify(v)))

    const res = it.reduce((curr, acc) => ({
      min: Math.min(acc.min, curr.min),
      max: Math.max(acc.max, curr.min)
    }), { max: -Infinity, min: Infinity})
    .execute()

    expect(res).toEqual({ min: 1, max: 82})
  })
})