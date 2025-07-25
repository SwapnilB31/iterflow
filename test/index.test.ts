import { describe, it, expect } from 'vitest';
import '../src/index.ts';

describe('Array.tee', () => {
  it('should split an array into two independent iterators', () => {
    const arr = [1, 2, 3, 4];
    const [it1, it2] = Array.tee(arr, 2);

    expect(it1.next().value).toBe(1);
    expect(it2.next().value).toBe(1);
    expect(it1.next().value).toBe(2);
    expect(it2.next().value).toBe(2);
    expect(it1.next().value).toBe(3);
    expect(it2.next().value).toBe(3);
    expect(it1.next().value).toBe(4);
    expect(it2.next().value).toBe(4);
    expect(it1.next().done).toBe(true);
    expect(it2.next().done).toBe(true);
  });

  it('should allow iterators to consume at different rates', () => {
    const arr = [10, 20, 30];
    const [it1, it2] = Array.tee(arr, 2);
    expect(it1.next().value).toBe(10);
    expect(it1.next().value).toBe(20);
    expect(it2.next().value).toBe(10);
    expect(it2.next().value).toBe(20);
    expect(it1.next().value).toBe(30);
    expect(it2.next().value).toBe(30);
    expect(it1.next().done).toBe(true);
    expect(it2.next().done).toBe(true);
  });

  it('should work with empty arrays', () => {
    const arr: number[] = [];
    const [it1, it2] = Array.tee(arr, 2);
    expect(it1.next().done).toBe(true);
    expect(it2.next().done).toBe(true);
  });

  it('should work with a single iterator', () => {
    const arr = [1, 2, 3];
    const [it] = Array.tee(arr, 1);
    expect(Array.from(it)).toEqual([1, 2, 3]);
  });

  it('should throw if arguments are missing', () => {
    // @ts-expect-error
    expect(() => Array.tee([1, 2, 3])).toThrow();
    // @ts-expect-error
    expect(() => Array.tee()).toThrow();
  });

  it('should throw if count is not a number', () => {
    // @ts-expect-error
    expect(() => Array.tee([1, 2, 3], '2')).toThrow();
  });

  it('should throw if source is not iterable', () => {
    // @ts-expect-error
    expect(() => Array.tee({}, 2)).toThrow();
  });

  it('should work with Set and custom iterables', () => {
    const set = new Set([1, 2, 3]);
    const [it1, it2] = Array.tee(set, 2);
    expect(Array.from(it1)).toEqual([1, 2, 3]);
    expect(Array.from(it2)).toEqual([1, 2, 3]);

    // Custom iterable
    const custom = {
      *[Symbol.iterator]() {
        yield 'a';
        yield 'b';
      }
    };
    const [itA, itB] = Array.tee(custom, 2);
    expect(Array.from(itA)).toEqual(['a', 'b']);
    expect(Array.from(itB)).toEqual(['a', 'b']);
  });

  it('should handle count > array length', () => {
    const arr = [1, 2];
    const [it1, it2, it3] = Array.tee(arr, 3);
    expect(Array.from(it1)).toEqual([1, 2]);
    expect(Array.from(it2)).toEqual([1, 2]);
    expect(Array.from(it3)).toEqual([1, 2]);
  });

  it('should handle count = 0', () => {
    const arr = [1, 2, 3];
    const result = Array.tee(arr, 0);
    expect(result).toEqual([]);
  });

  it('should support early return and throw', () => {
    const arr = [1, 2, 3];
    const [it1, it2] = Array.tee(arr, 2);
    expect(it1.next().value).toBe(1);
    expect(it2.next().value).toBe(1);
    expect(it1.return && it1.return(42)).toEqual({ value: 42, done: true });
    expect(() => it2.throw && it2.throw(new Error('fail'))).toThrow('fail');
  });
});

describe('Array.prototype.tee', () => {
  it('should map, filter, reduce, and forEach in parallel', () => {
    const arr: number[] = [1, 2, 3, 4];
    const results = arr.tee(
      { kind: 'map', fn: (x, i) => x * 2 },
      { kind: 'filter', fn: (x, i) => x % 2 === 0 },
      { kind: 'reduce', fn: (acc, x, i) => acc + x, initVal: 0 },
      { kind: 'forEach', fn: (x, i) => {} }
    );
    expect(results[0]).toEqual([2, 4, 6, 8]);
    expect(results[1]).toEqual([2, 4]);
    expect(results[2]).toBe(10);
    expect(results[3]).toBeUndefined();
  });

  it('should handle empty array', () => {
    const arr: number[] = [];
    const results = arr.tee(
      { kind: 'map', fn: (x, i) => x * 2 },
      { kind: 'filter', fn: (x, i) => x % 2 === 0 },
      { kind: 'reduce', fn: (acc, x, i) => acc + x, initVal: 0 },
      { kind: 'forEach', fn: (x, i) => {} }
    );
    expect(results[0]).toEqual([]);
    expect(results[1]).toEqual([]);
    expect(results[2]).toBe(0);
    expect(results[3]).toBeUndefined();
  });

  it('should throw for invalid consumer config', () => {
    const arr: number[] = [1, 2, 3];
    expect(() => arr.tee({ fn: (x, i) => x })).toThrow();
    expect(() => arr.tee({ kind: 'map', fn: 123 })).toThrow();
    expect(() => arr.tee(null)).toThrow();
  });

  it('should work with only map', () => {
    const arr: number[] = [1, 2, 3];
    const results = arr.tee({ kind: 'map', fn: (x, i) => x + i });
    expect(results[0]).toEqual([1, 3, 5]);
  });

  it('should work with only filter', () => {
    const arr: number[] = [1, 2, 3, 4];
    const results = arr.tee({ kind: 'filter', fn: (x, i) => x > 2 });
    expect(results[0]).toEqual([3, 4]);
  });

  it('should work with only reduce', () => {
    const arr: number[] = [1, 2, 3];
    const results = arr.tee({ kind: 'reduce', fn: (acc, x, i) => acc * x, initVal: 1 });
    expect(results[0]).toBe(6);
  });

  it('should work with only forEach', () => {
    const arr: number[] = [1, 2, 3];
    let sum = 0;
    const results = arr.tee({ kind: 'forEach', fn: (x, i) => { sum += x; } });
    expect(sum).toBe(6);
    expect(results[0]).toBeUndefined();
  });

  it('should handle multiple consumers of the same kind', () => {
    const arr: number[] = [1, 2, 3];
    const results = arr.tee(
      { kind: 'map', fn: (x, i) => x + 1 },
      { kind: 'map', fn: (x, i) => x * 2 },
      { kind: 'filter', fn: (x, i) => x % 2 === 1 },
      { kind: 'filter', fn: (x, i) => x > 1 }
    );
    expect(results[0]).toEqual([2, 3, 4]);
    expect(results[1]).toEqual([2, 4, 6]);
    expect(results[2]).toEqual([1, 3]);
    expect(results[3]).toEqual([2, 3]);
  });

  it('should handle reduce without initVal (uses first element)', () => {
    const arr: number[] = [2, 3, 4];
    const results = arr.tee({ kind: 'reduce', fn: (acc, x, i) => acc * x });
    expect(results[0]).toBe(24);
  });
});
