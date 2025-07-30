// CSV Data Pipeline: Customer Analytics (TypeScript)
import * as fs from 'fs';
import * as readline from 'readline';
import { LazyIterator } from '../..';

interface Customer {
  id: number;
  name: string;
  email: string;
  active: boolean;
  totalSpent: number;
}

function parseCustomer(line: string): Customer | null {
  if (line.startsWith('id,')) return null; // skip header
  const [id, name, email, active, totalSpent] = line.split(',');
  return {
    id: Number(id),
    name,
    email,
    active: active === 'true',
    totalSpent: Number(totalSpent)
  };
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

const filePath = __dirname + '/data/customers.csv';
const iter = LazyIterator.from(lineGenerator(filePath))
  .map(parseCustomer)
  .filter((c): c is Customer => !!c && c.active)
  //@ts-expect-error
  .map((c) => ({ id: c.id, name: c.name, totalSpent: c.totalSpent }))
  .collect();

const topSpender = iter.reduce((max, curr) => curr.totalSpent > max.totalSpent ? curr : max, iter[0]);
console.log('Active customers:', iter);
console.log('Top spender:', topSpender);
