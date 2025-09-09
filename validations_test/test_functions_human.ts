/**
 * TypeScript Utility Functions Collection
 * Just a bunch of handy functions I keep reusing in projects
 */

/**
 * Classic factorial function but with recursion
 * You know, 5! = 5 × 4 × 3 × 2 × 1 = 120. This version is cleaner than the loop one
 * but might blow up your call stack for huge numbers (like n > 1000).
 *
 * @param n - The number you want factorial of (gotta be positive!)
 * @returns The factorial result
 * @throws RangeError if you try negative numbers (because math doesn't work that way)
 * @example
 * factorial(5); // 120
 * factorial(0); // 1 (yeah, 0! = 1, weird math rule)
 */
export function factorial(n: number): number {
  if (n < 0) throw new RangeError("n must be non-negative");
  return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * Debounce function - basically "chill out, wait a bit before doing the thing"
 * Super useful for search inputs where you don't want to spam the API every keystroke.
 * Unlike throttle, this one waits for the user to stop doing stuff before firing.
 *
 * @param fn - The function you want to debounce
 * @param wait - How long to wait in milliseconds (default: 200ms)
 * @returns A debounced version of your function
 * @example
 * const debouncedSearch = debounce((query) => searchAPI(query), 300);
 * // Type fast, but API only gets called 300ms after you stop typing
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, wait = 200) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Fetch with retry logic - because networks are unreliable and servers crash
 * Will keep trying the request until it works or runs out of retries.
 * Perfect for those flaky APIs that work 90% of the time.
 *
 * @param url - Where you're trying to fetch from
 * @param options - Standard fetch options (headers, method, etc.)
 * @param retries - How many times to retry before giving up (default: 3)
 * @returns Promise with the response (if it eventually works)
 * @example
 * const data = await fetchWithRetry('/api/flaky-endpoint', {}, 5);
 * // Will try up to 6 times total (initial + 5 retries)
 */
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

/**
 * Quick and dirty deep clone using JSON
 * Works great for plain objects and arrays. Doesn't handle functions, dates, or other
 * fancy objects properly though. For simple data cloning, this is perfect.
 *
 * @param obj - Whatever you want to clone
 * @returns A completely separate copy
 * @example
 * const original = { user: { name: 'John', settings: { theme: 'dark' } } };
 * const copy = deepClone(original);
 * copy.user.name = 'Jane'; // original.user.name is still 'John'
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

type Listener = (...args: any[]) => void;

/**
 * Simple event emitter class - like Node's EventEmitter but way simpler
 * Good for when you need basic pub/sub pattern without pulling in a whole library.
 * You can listen for events, remove listeners, and emit events with data.
 *
 * @example
 * const emitter = new SimpleEventEmitter();
 * emitter.on('user-login', (user) => console.log(`${user.name} logged in`));
 * emitter.emit('user-login', { name: 'John' }); // logs: John logged in
 */
export class SimpleEventEmitter {
  private listeners = new Map<string, Listener[]>();

  /**
   * Add a listener for an event
   * @param event - Event name to listen for
   * @param cb - Function to call when event happens
   */
  on(event: string, cb: Listener) {
    const list = this.listeners.get(event) || [];
    list.push(cb);
    this.listeners.set(event, list);
  }

  /**
   * Remove a specific listener for an event
   * @param event - Event name
   * @param cb - The exact function reference you want to remove
   */
  off(event: string, cb: Listener) {
    const list = this.listeners.get(event) || [];
    this.listeners.set(
      event,
      list.filter((l) => l !== cb)
    );
  }

  /**
   * Fire an event with optional data
   * @param event - Event name to emit
   * @param args - Any data you want to pass to listeners
   */
  emit(event: string, ...args: any[]) {
    (this.listeners.get(event) || []).forEach((cb) => cb(...args));
  }
}

/**
 * Parse URL query string into an object
 * Takes something like "?name=john&age=30" and gives you { name: 'john', age: '30' }
 * Handles URL decoding automatically so spaces and special chars work fine.
 *
 * @param qs - Query string (with or without the leading ?)
 * @returns Object with key-value pairs
 * @example
 * parseQueryString('?name=john%20doe&age=30');
 * // returns { name: 'john doe', age: '30' }
 */
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

/**
 * Deep merge two objects - like Object.assign but goes all the way down
 * Perfect for merging config objects where you want to override some nested values
 * but keep the rest. Arrays get replaced completely though, not merged.
 *
 * @param a - Base object (this one wins in conflicts)
 * @param b - Object to merge in (values from here override a)
 * @returns New merged object
 * @example
 * const config = mergeDeep(
 *   { api: { timeout: 5000, retries: 3 }, theme: 'light' },
 *   { api: { timeout: 10000 }, debug: true }
 * );
 * // result: { api: { timeout: 10000, retries: 3 }, theme: 'light', debug: true }
 */
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

/**
 * Basic email validation - not perfect but catches most obvious mistakes
 * This regex is pretty simple and won't catch every edge case, but it works for
 * 99% of real emails. Don't use this for anything super critical.
 *
 * @param email - Email string to validate
 * @returns true if it looks like an email
 * @example
 * isValidEmail('john@example.com'); // true
 * isValidEmail('not-an-email'); // false
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * LRU (Least Recently Used) Cache implementation
 * Keeps a fixed number of items and kicks out the oldest when full.
 * Great for caching API responses or expensive calculations.
 *
 * @example
 * const cache = new LRUCache<string, any>(100);
 * cache.set('user:123', userData);
 * const user = cache.get('user:123'); // moves it to front of cache
 */
export class LRUCache<K, V> {
  private map = new Map<K, V>();

  /**
   * @param capacity - Maximum number of items to keep in cache
   */
  constructor(private capacity: number) {}

  /**
   * Get a value from cache (marks it as recently used)
   * @param key - Key to look up
   * @returns The value, or undefined if not found
   */
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  /**
   * Put a value in cache (removes oldest if at capacity)
   * @param key - Key to store under
   * @param value - Value to store
   */
  set(key: K, value: V) {
    if (this.map.size >= this.capacity && !this.map.has(key)) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
    this.map.set(key, value);
  }
}

/**
 * Binary search on a sorted array - O(log n) baby!
 * Way faster than searching through the whole array if your data is sorted.
 * Returns the index if found, -1 if not found.
 *
 * @param arr - Sorted array of numbers to search
 * @param target - Number you're looking for
 * @returns Index of target, or -1 if not found
 * @example
 * binarySearch([1, 3, 5, 7, 9], 5); // returns 2
 * binarySearch([1, 3, 5, 7, 9], 4); // returns -1
 */
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

/**
 * Merge sort algorithm - reliable O(n log n) sorting
 * More predictable than quicksort (no worst-case O(n²)) but uses more memory.
 * Good when you need guaranteed performance and don't mind the memory usage.
 *
 * @param arr - Array of numbers to sort
 * @returns New sorted array (doesn't modify original)
 * @example
 * mergeSort([3, 1, 4, 1, 5, 9]); // returns [1, 1, 3, 4, 5, 9]
 */
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

/**
 * Simple queue implementation - first in, first out
 * Basic queue operations: add to back, remove from front, peek at front.
 * Nothing fancy but gets the job done for basic queue needs.
 *
 * @example
 * const queue = new Queue<string>();
 * queue.enqueue('first');
 * queue.enqueue('second');
 * queue.dequeue(); // returns 'first'
 */
export class Queue<T> {
  private items: T[] = [];

  /** Add item to back of queue */
  enqueue(item: T) {
    this.items.push(item);
  }

  /** Remove and return item from front of queue */
  dequeue(): T | undefined {
    return this.items.shift();
  }

  /** Look at front item without removing it */
  peek(): T | undefined {
    return this.items[0];
  }

  /** Check if queue is empty */
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

const memo: Record<number, number> = {};

/**
 * Fibonacci with memoization - classic dynamic programming example
 * The naive recursive version is super slow for big numbers, but this one
 * remembers previous results so it's actually fast. Math nerds love this stuff.
 *
 * @param n - Which Fibonacci number you want (0-indexed)
 * @returns The nth Fibonacci number
 * @example
 * fibonacci(10); // returns 55
 * fibonacci(0); // returns 0
 * fibonacci(1); // returns 1
 */
export function fibonacci(n: number): number {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  memo[n] = fibonacci(n - 1) + fibonacci(n - 2);
  return memo[n];
}
/**
 * Converts a temperature from Celsius to Fahrenheit.
 *
 * Formula: F = (C × 9/5) + 32
 * @param {number} c - Temperature in Celsius.
 * @returns {number} Equivalent temperature in Fahrenheit.
 */
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

/**
 * Validates the strength of a password string.
 *
 * A strong password must be at least 8 characters long
 * and include at least one uppercase letter, one lowercase letter,
 * one digit, and one special character.
 *
 * @param {string} pw - The password string to validate.
 * @returns {boolean} True if the password meets the strength criteria, otherwise false.
 */
export function isStrongPassword(pw: string): boolean {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
    pw
  );
}

/**
 * Randomly shuffles the elements of an array using the Fisher-Yates algorithm.
 *
 * The array is modified in place but also returned for convenience.
 * @param {T[]} arr - The array to shuffle.
 * @returns {T[]} The shuffled array.
 */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Converts a hexadecimal color string into its RGB components.
 *
 * Example: "#ff0000" → { r: 255, g: 0, b: 0 }
 * @param {string} hex - A hex color string in the format "#RRGGBB".
 * @returns {{ r: number, g: number, b: number }} Object containing red, green, and blue values.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const bigint = parseInt(hex.replace(/^#/, ""), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Computes the median of a list of numbers.
 *
 * Throws an error if the array is empty.
 * @param {number[]} values - The array of numbers.
 * @returns {number} The median value.
 */
export function median(values: number[]): number {
  if (!values.length) throw new Error("Empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Determines if a string is a palindrome.
 *
 * Non-alphanumeric characters are ignored, and comparison is case-insensitive.
 * @param {string} str - The input string.
 * @returns {boolean} True if the string is a palindrome, otherwise false.
 */
export function isPalindrome(str: string): boolean {
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned === cleaned.split("").reverse().join("");
}

/**
 * Counts the number of words in a string.
 *
 * Words are defined as sequences of non-whitespace characters separated by spaces.
 * @param {string} text - The input text string.
 * @returns {number} The number of words in the text.
 */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Transposes a two-dimensional matrix.
 *
 * Converts rows into columns and columns into rows.
 * @param {number[][]} matrix - The matrix to transpose.
 * @returns {number[][]} The transposed matrix.
 */
export function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]));
}

/**
 * Generates an array of numbers within a range.
 *
 * The sequence includes both the start and end values, with a customizable step size.
 * @param {number} start - The starting value.
 * @param {number} end - The ending value (inclusive).
 * @param {number} [step=1] - The increment step size.
 * @returns {number[]} An array of numbers from start to end.
 */
export function range(start: number, end: number, step = 1): number[] {
  const res: number[] = [];
  for (let i = start; i <= end; i += step) {
    res.push(i);
  }
  return res;
}

/**
 * Counts the frequency of characters in a string.
 *
 * @param {string} str - The input string.
 * @returns {Record<string, number>} An object mapping each character to its count.
 */
export function charFrequency(str: string): Record<string, number> {
  return [...str].reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculates the average (arithmetic mean) of an array of numbers.
 *
 * Throws an error if the array is empty.
 * @param {number[]} nums - The array of numbers.
 * @returns {number} The average value.
 */
export function average(nums: number[]): number {
  if (!nums.length) throw new Error("Array must not be empty");
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/**
 * Rotates an array by a specified number of steps.
 *
 * Positive values rotate to the right; negative values rotate to the left.
 * @param {T[]} arr - The array to rotate.
 * @param {number} k - The number of steps to rotate by.
 * @returns {T[]} The rotated array.
 */
export function rotateArray<T>(arr: T[], k: number): T[] {
  const n = arr.length;
  const steps = ((k % n) + n) % n; // normalize
  return arr.slice(-steps).concat(arr.slice(0, n - steps));
}
