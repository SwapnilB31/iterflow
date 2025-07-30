import { LazyAsyncIterator } from '../src/lazy-async-iterator';
import { describe, it, expect } from 'vitest';
import { inspect } from 'util';

describe('LazyAsyncIterator', () => {
  // 1. Construction and .from()
  describe('construction and .from()', () => {
    it('constructs from array (sync iterable)', async () => {
      const arr = [1, 2, 3];
      const iter = LazyAsyncIterator.from(arr);
      const out = await iter.collect();
      expect(out).toEqual(arr);
    });
    it('constructs from async iterable', async () => {
      async function* gen() { yield 1; yield 2; yield 3; }
      const iter = LazyAsyncIterator.from(gen());
      const out = await iter.collect();
      expect(out).toEqual([1, 2, 3]);
    });
    it('constructs from iterator', async () => {
      const arr = [1, 2, 3];
      const iter = LazyAsyncIterator.from(arr[Symbol.iterator]());
      const out = await iter.collect();
      expect(out).toEqual(arr);
    });
    it('constructs from async iterator', async () => {
      async function* gen() { yield 1; yield 2; yield 3; }
      const iter = LazyAsyncIterator.from(gen()[Symbol.asyncIterator]());
      const out = await iter.collect();
      expect(out).toEqual([1, 2, 3]);
    });
    it('throws on null/undefined', () => {
      expect(() => LazyAsyncIterator.from(null as any)).toThrow();
      expect(() => LazyAsyncIterator.from(undefined as any)).toThrow();
    });
  });

  describe('core methods', () => {
    it('map (sync) transforms values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3]).map(x => x * 2);
      expect(await iter.collect()).toEqual([2, 4, 6]);
    });
    it('mapAsync (async) transforms values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3]).mapAsync(async x => x * 3);
      expect(await iter.collect()).toEqual([3, 6, 9]);
    });
    it('filter (sync) filters values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4]).filter(x => x % 2 === 0);
      expect(await iter.collect()).toEqual([2, 4]);
    });
    it('filterAsync (async) filters values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4]).filterAsync(async x => x > 2);
      expect(await iter.collect()).toEqual([3, 4]);
    });
    it('forEach (sync) observes values', async () => {
      const seen: number[] = [];
      const iter = LazyAsyncIterator.from([1, 2, 3]).forEach(x => seen.push(x));
      await iter.collect();
      expect(seen).toEqual([1, 2, 3]);
    });
    it('forEachASync (async) observes values', async () => {
      const seen: number[] = [];
      const iter = LazyAsyncIterator.from([1, 2, 3]).forEachASync(async x => { seen.push(x); });
      await iter.collect();
      expect(seen).toEqual([1, 2, 3]);
    });
    it('reduce (sync) reduces values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4]).reduce((acc, curr) => acc + curr, 0);
      const result = await iter.execute();
      expect(result).toBe(10);
    });
    it('chaining sync and async methods', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4])
        .map(x => x + 1)
        .filterAsync(async x => x % 2 === 0)
        .mapAsync(async x => x * 10);
      expect(await iter.collect()).toEqual([20, 40]);
    });
  });

  describe('collection methods', () => {
    it('collect returns all values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3]);
      expect(await iter.collect()).toEqual([1, 2, 3]);
    });
    it('collectSettled returns all settled results', async () => {
      const iter = LazyAsyncIterator.from([1, 2]);
      const results = await iter.collectSettled();
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      expect(results.map(r => (r as PromiseFulfilledResult<any>).value.value)).toEqual([1, 2]);
    });
    it('take returns first n values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4, 5]);
      expect(await iter.take(3)).toEqual([1, 2, 3]);
    });
    it('drop skips first n values', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4, 5]);
      expect(await iter.drop(2)).toEqual([3, 4, 5]);
    });
    it('takeWhile returns values while predicate is true', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 2, 1]);
      expect(await iter.takeWhile(x => x < 3)).toEqual([1, 2]);
    });
    it('dropWhile skips values while predicate is true', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 2, 1]);
      expect(await iter.dropWhile(x => x < 3)).toEqual([3, 2, 1]);
    });
  });

  describe('tee', () => {
    it('splits into multiple async iterators', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4]);
      const [a, b] = iter.tee(2);
      expect(await a.collect()).toEqual([1, 2, 3, 4]);
      expect(await b.collect()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('error handling', () => {
    it('propagates errors from async callbacks', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3]).mapAsync(async x => {
        if (x === 2) throw new Error('fail');
        return x;
      });
      await expect(iter.collect()).rejects.toThrow('fail');
    });
    it('propagates errors from sync callbacks', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3]).map(x => {
        if (x === 2) throw new Error('fail');
        return x;
      });
      await expect(iter.collect()).rejects.toThrow('fail');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', async () => {
      const iter = LazyAsyncIterator.from([]);
      expect(await iter.collect()).toEqual([]);
    });
    it('all elements filtered out', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3]).filter(x => false);
      expect(await iter.collect()).toEqual([]);
    });
    it('early termination with return', async () => {
      const arr = [1, 2, 3, 4, 5];
      const iter = LazyAsyncIterator.from(arr);
      await iter.next();
      await iter.return(undefined);
      expect(iter.exhausted).toBe(true);
    });
    it('works with non-primitive values', async () => {
      const objs = [{ a: 1 }, { a: 2 }];
      const iter = LazyAsyncIterator.from(objs).map(o => ({ ...o, b: 2 }));
      expect(await iter.collect()).toEqual([{ a: 1, b: 2 }, { a: 2, b: 2 }]);
    });
  });

  describe('realistic pipelines', () => {
    it('ETL: paginated product API', async () => {
      async function* paginatedApi() {
        let page = 1;
        while (page <= 2) {
          yield {
            products: Array.from({ length: 2 }, (_, i) => ({
              id: (page - 1) * 2 + i + 1,
              name: `Product ${(page - 1) * 2 + i + 1}`,
              price: 10 * ((page - 1) * 2 + i + 1),
              inStock: (page + i) % 2 === 0
            })),
            nextPage: page < 2 ? page + 1 : null
          };
          page++;
        }
      }
      const iter = LazyAsyncIterator.from(paginatedApi())
        .mapAsync(async page => page.products)
        .mapAsync(async arr => arr.flat())
        .filterAsync(async arr => arr.length > 0);
      const allProducts = (await iter.collect()).flat();
      const inStock = allProducts.filter((p: any) => p.inStock);
      const avgPrice = inStock.reduce((sum: number, p: any) => sum + p.price, 0) / inStock.length;
      expect(inStock.length).toBeGreaterThan(0);
      expect(typeof avgPrice).toBe('number');
    });
    it('user activity aggregation', async () => {
      async function* eventCursor() {
        const users = ['alice', 'bob'];
        for (let i = 0; i < 10; i++) {
          yield {
            userId: users[i % 2],
            type: i % 2 === 0 ? 'login' : 'logout',
            timestamp: new Date().toISOString()
          };
        }
      }
      const iter = LazyAsyncIterator.from(eventCursor())
        .filterAsync(async e => e.type === 'login');
      const logins = await iter.collect();
      const byUser: Record<string, number> = {};
      for (const e of logins) {
        byUser[e.userId] = (byUser[e.userId] || 0) + 1;
      }
      expect(Object.values(byUser).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    });
    it('news headlines extraction', async () => {
      const urls = ['a', 'b', 'c'];
      async function fetchNews(url: string) {
        return { url, headline: `Headline for ${url}`, date: '2025-07-30' };
      }
      const iter = LazyAsyncIterator.from(urls)
        .mapAsync(async url => await fetchNews(url))
        .filterAsync(async news => news.date === '2025-07-30');
      const headlines = await iter.collect();
      expect(headlines.length).toBe(urls.length);
      expect(headlines[0].headline).toMatch(/Headline/);
    });
  });

  describe('settled methods', () => {
    it('collectSettled returns fulfilled and rejected results', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4])
        .mapAsync(async x => {
          if (x % 2 === 0) throw new Error('even');
          return x;
        });
      const results = await iter.collectSettled();
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(2);
      expect((fulfilled[0] as PromiseFulfilledResult<any>).value.value).toBe(1);
      expect((fulfilled[1] as PromiseFulfilledResult<any>).value.value).toBe(3);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    });

    it('takeSettled returns n settled results', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4])
        .mapAsync(async x => {
          if (x === 3) throw new Error('fail');
          return x;
        });
      const results = await iter.takeSettled(3);
      expect(results.length).toBe(3);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      expect(fulfilled.length + rejected.length).toBe(3);
    });

    it('dropSettled skips n and returns settled results for the rest', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4, 5])
        .mapAsync(async x => {
          if (x === 4) throw new Error('fail');
          return x;
        });
      const results = await iter.dropSettled(2);
      expect(results.length).toBeGreaterThan(0);
      // Should not include the first two values
      const values = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value.value);
      expect(values).not.toContain(1);
      expect(values).not.toContain(2);
    });

    it('takeWhileSettled returns settled results while predicate is true', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4, 5])
        .mapAsync(async x => {
          if (x === 4) throw new Error('fail');
          return x;
        });
      const results = await iter.takeWhileSettled(x => x < 4);
      // Should stop at first value >= 4 or error
      expect(results.length).toBeGreaterThan(0);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      console.log(inspect({ fulfilled }, false, null, true))
      expect(fulfilled.every(r => (r as PromiseFulfilledResult<any>).value.value < 4)).toBe(true);
    });

    it('dropWhileSettled skips while predicate is true and returns settled results for the rest', async () => {
      const iter = LazyAsyncIterator.from([1, 2, 3, 4, 5])
        .mapAsync(async x => {
          if (x === 2) throw new Error('fail');
          return x;
        });
      const results = await iter.dropWhileSettled(x => x < 3);
      // Should not include values < 3
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.every(r => (r as PromiseFulfilledResult<any>).value.value >= 3)).toBe(true);
    });
  });
});
