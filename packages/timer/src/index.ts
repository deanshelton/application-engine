import { getLogger } from '@repo/logger';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class Timer {
  NS_PER_SEC: number;
  MS_PER_NS: number;
  name: string;
  startTime: [number, number];
  // Automatically starts the timer
  constructor(name = 'Benchmark') {
    this.NS_PER_SEC = 1e9;
    this.MS_PER_NS = 1e-6;
    this.name = name;
    this.startTime = process.hrtime();
  }

  // returns the time in ms since instantiation
  // can be called multiple times
  runtimeMs() {
    const diff = process.hrtime(this.startTime);
    return (diff[0] * this.NS_PER_SEC + diff[1]) * this.MS_PER_NS;
  }

  // returns a string: the time in ms since instantiation
  runtimeMsStr() {
    return `[TIMER] ${this.name} took ${this.runtimeMs()} milliseconds`;
  }
}

export async function timedEvent<T>(log: string, func: () => Promise<T>) {
  const t = new Timer(log);
  const x = await func();
  getLogger().debug(t.runtimeMsStr());
  return x;
}

/**
 * Format durations
 */
export function formatDuration(ms: number) {
  if (ms < 0) ms = -ms;
  const time = {
    day: Math.floor(ms / 86400000),
    hour: Math.floor(ms / 3600000) % 24,
    minute: Math.floor(ms / 60000) % 60,
    second: Math.floor(ms / 1000) % 60,
    // millisecond: Math.floor(ms) % 1000
  };
  return Object.entries(time)
    .filter((val) => val[1] !== 0)
    .map((val) => val[1] + ' ' + (val[1] !== 1 ? val[0] + 's' : val[0]))
    .join(', ');
}
