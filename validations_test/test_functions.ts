export function factorial(n: number): number {
  if (n < 0) throw new RangeError("n must be non-negative");
  return n <= 1 ? 1 : n * factorial(n - 1);
}

export function debounce<T extends (...args: any[]) => any>(fn: T, wait = 200) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (i === retries) throw lastError;
    }
  }
  throw new Error("unreachable");
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

type Listener = (...args: any[]) => void;

export class SimpleEventEmitter {
  private listeners = new Map<string, Listener[]>();

  on(event: string, cb: Listener) {
    const list = this.listeners.get(event) || [];
    list.push(cb);
    this.listeners.set(event, list);
  }

  off(event: string, cb: Listener) {
    const list = this.listeners.get(event) || [];
    this.listeners.set(
      event,
      list.filter((l) => l !== cb)
    );
  }

  emit(event: string, ...args: any[]) {
    (this.listeners.get(event) || []).forEach((cb) => cb(...args));
  }
}

export function parseQueryString(qs: string): Record<string, string> {
  return qs
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [k, v = ""] = pair.split("=");
      acc[decodeURIComponent(k)] = decodeURIComponent(v);
      return acc;
    }, {} as Record<string, string>);
}

export function mergeDeep<T extends Record<string, any>>(
  a: T,
  b: Partial<T>
): T {
  const out = { ...a } as any;
  for (const key of Object.keys(b)) {
    if (b[key] && typeof b[key] === "object" && !Array.isArray(b[key])) {
      out[key] = mergeDeep(out[key] ?? {}, b[key]);
    } else {
      out[key] = b[key];
    }
  }
  return out;
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V) {
    if (this.map.size >= this.capacity && !this.map.has(key)) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
    this.map.set(key, value);
  }
}

export function binarySearch(arr: number[], target: number): number {
  let left = 0,
    right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

export function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  let result: number[] = [];
  while (left.length && right.length) {
    result.push(left[0] < right[0] ? left.shift()! : right.shift()!);
  }
  return result.concat(left, right);
}

export class Queue<T> {
  private items: T[] = [];
  enqueue(item: T) {
    this.items.push(item);
  }
  dequeue(): T | undefined {
    return this.items.shift();
  }
  peek(): T | undefined {
    return this.items[0];
  }
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

const memo: Record<number, number> = {};

export function fibonacci(n: number): number {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  memo[n] = fibonacci(n - 1) + fibonacci(n - 2);
  return memo[n];
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function isStrongPassword(pw: string): boolean {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
    pw
  );
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const bigint = parseInt(hex.replace(/^#/, ""), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function median(values: number[]): number {
  if (!values.length) throw new Error("Empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function isPalindrome(str: string): boolean {
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned === cleaned.split("").reverse().join("");
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]));
}

export function range(start: number, end: number, step = 1): number[] {
  const res: number[] = [];
  for (let i = start; i <= end; i += step) {
    res.push(i);
  }
  return res;
}

export function charFrequency(str: string): Record<string, number> {
  return [...str].reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function average(nums: number[]): number {
  if (!nums.length) throw new Error("Array must not be empty");
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export function rotateArray<T>(arr: T[], k: number): T[] {
  const n = arr.length;
  const steps = ((k % n) + n) % n;
  return arr.slice(-steps).concat(arr.slice(0, n - steps));
}