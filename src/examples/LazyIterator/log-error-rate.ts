// Log Processing: Error Rate Analysis (TypeScript)
import * as fs from 'fs';
import * as readline from 'readline';
import { LazyIterator } from '../..';

type LogEntry = { timestamp: Date; level: string; message: string };

function parseLog(line: string): LogEntry | null {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(\w+)\s+(.*)$/);
  if (!match) return null;
  const [, ts, level, message] = match;
  return { timestamp: new Date(ts), level, message };
}

function groupByHour(entries: LogEntry[]): Record<string, number> {
  return entries.reduce((acc, entry) => {
    const hour = entry.timestamp.toISOString().slice(0, 13) + ':00';
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function* lineGenerator(filePath: string) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });
  let done = false;
  rl.on('close', () => { done = true; });
  const lines: string[] = [];
  rl.on('line', (line) => lines.push(line));
  while (!done || lines.length > 0) {
    if (lines.length > 0) {
      yield lines.shift()!;
    } else {
      require('deasync').sleep(10);
    }
  }
}

const filePath = __dirname + '/data/app.log';
const errorEntries = LazyIterator.from(lineGenerator(filePath))
  .map(parseLog)
  .filter((e): e is LogEntry => !!e && e.level === 'ERROR')
  .collect();

//@ts-ignore
const errorCounts = groupByHour(errorEntries);
console.log('Error counts by hour:', errorCounts);
