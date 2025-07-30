// Database Cursor: User Activity Aggregation (TypeScript)
import { LazyAsyncIterator } from '../..';

type Event = { userId: string; type: string; timestamp: string };

// Simulate DB cursor as async generator
async function* eventCursor(): AsyncGenerator<Event> {
  const users = ['alice', 'bob', 'carol'];
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5));
    yield {
      userId: users[Math.floor(Math.random() * users.length)],
      type: Math.random() > 0.5 ? 'login' : 'logout',
      timestamp: new Date(Date.now() - Math.random() * 1000000).toISOString()
    };
  }
}

(async () => {
  const iter = LazyAsyncIterator.from(eventCursor())
    .filterAsync(async e => e.type === 'login');
  const logins = await iter.collect();
  const byUser: Record<string, number> = {};
  for (const e of logins) {
    byUser[e.userId] = (byUser[e.userId] || 0) + 1;
  }
  console.log('Login counts per user:', byUser);
})();
