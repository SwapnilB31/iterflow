// Web Scraping: News Headlines Extraction (TypeScript)
import { LazyAsyncIterator } from '../..';
// import fetch from 'node-fetch'; // Uncomment if using node-fetch

type NewsResult = { url: string; headline: string; date: string };

const urls = [
  'https://example.com/news1',
  'https://example.com/news2',
  'https://example.com/news3'
];

// Simulate fetching HTML and extracting headline/date
async function fetchNews(url: string): Promise<NewsResult> {
  // Simulate network delay and extraction
  await new Promise(r => setTimeout(r, 50));
  return {
    url,
    headline: `Headline for ${url}`,
    date: `2025-07-30`
  };
}

(async () => {
  const iter = LazyAsyncIterator.from(urls)
    .mapAsync(async url => await fetchNews(url))
    .filterAsync(async news => news.date === '2025-07-30');
  const headlines = await iter.collect();
  console.log('Headlines:', headlines.map(n => n.headline));
})();
