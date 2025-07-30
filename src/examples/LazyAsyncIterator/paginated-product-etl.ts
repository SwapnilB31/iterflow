// Paginated API: Product Catalog ETL (TypeScript)
import { LazyAsyncIterator } from '../..';

type Product = { id: number; name: string; price: number; inStock: boolean };

type ApiPage = { products: Product[]; nextPage: number | null };

// Simulate paginated API
async function* paginatedApi(): AsyncGenerator<ApiPage> {
  let page = 1;
  while (page <= 3) {
    await new Promise(r => setTimeout(r, 50));
    yield {
      products: Array.from({ length: 5 }, (_, i) => ({
        id: (page - 1) * 5 + i + 1,
        name: `Product ${(page - 1) * 5 + i + 1}`,
        price: Math.round(Math.random() * 1000) / 100,
        inStock: Math.random() > 0.3
      })),
      nextPage: page < 3 ? page + 1 : null
    };
    page++;
  }
}

(async () => {
  const iter = LazyAsyncIterator.from(paginatedApi())
    .mapAsync(async page => page.products)
    .mapAsync(async arr => arr.flat())
    .filterAsync(async arr => arr.length > 0);
  const allProducts = (await iter.collect()).flat();
  const inStock = allProducts.filter(p => p.inStock);
  const avgPrice = inStock.reduce((sum, p) => sum + p.price, 0) / inStock.length;
  console.log('In-stock products:', inStock);
  console.log('Average price:', avgPrice.toFixed(2));
})();
