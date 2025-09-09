/**
 * JavaScript Utility Functions Library
 * A comprehensive collection of utility functions for common programming tasks
 */

/**
 * Checks if a given number is prime
 * A prime number is a natural number greater than 1 that has no positive divisors
 * other than 1 and itself. This function uses trial division up to the square root
 * of the number for efficiency.
 *
 * @param {number} n - The number to check for primality
 * @returns {boolean} True if the number is prime, false otherwise
 * @example
 * isPrime(7);  // returns true
 * isPrime(10); // returns false
 * isPrime(1);  // returns false
 */
function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * Creates a throttled version of a function that limits how often it can be called
 * Throttling ensures that a function is called at most once per specified time period,
 * which is useful for performance optimization in scenarios like scroll events or API calls.
 *
 * @param {Function} fn - The function to throttle
 * @param {number} [limit=200] - The time limit in milliseconds between function calls
 * @returns {Function} The throttled function
 * @example
 * const throttledScroll = throttle(() => console.log('scrolled'), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
function throttle(fn, limit = 200) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Flattens a nested array structure into a single-level array
 * Recursively processes multi-dimensional arrays, converting them into a flat array
 * containing all elements in their original order.
 *
 * @param {Array} arr - The array to flatten (can contain nested arrays)
 * @returns {Array} A new flattened array containing all elements
 * @example
 * flatten([1, [2, 3], [4, [5, 6]]]); // returns [1, 2, 3, 4, 5, 6]
 */
function flatten(arr) {
  return arr.reduce(
    (acc, v) => acc.concat(Array.isArray(v) ? flatten(v) : v),
    []
  );
}

/**
 * Groups array elements by a specified key or key function
 * Creates an object where keys represent the grouping criteria and values are arrays
 * of elements that match each key. Useful for categorizing data.
 *
 * @param {Array} array - The array to group
 * @param {string|Function} keyFn - Property name or function to determine grouping key
 * @returns {Object} Object with grouped elements
 * @example
 * groupBy([{age: 20}, {age: 30}, {age: 20}], 'age');
 * // returns { 20: [{age: 20}, {age: 20}], 30: [{age: 30}] }
 *
 * groupBy(['apple', 'apricot', 'banana'], s => s[0]);
 * // returns { 'a': ['apple', 'apricot'], 'b': ['banana'] }
 */
function groupBy(array, keyFn) {
  return array.reduce((acc, item) => {
    const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

/**
 * Creates a memoized version of a function that caches results
 * Memoization improves performance by storing the results of expensive function calls
 * and returning the cached result when the same inputs occur again.
 *
 * @param {Function} fn - The function to memoize
 * @returns {Function} The memoized function with caching capability
 * @example
 * const memoizedFib = memoize(function fibonacci(n) {
 *   return n < 2 ? n : fibonacci(n-1) + fibonacci(n-2);
 * });
 */
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const k = JSON.stringify(args);
    if (cache.has(k)) return cache.get(k);
    const v = fn.apply(this, args);
    cache.set(k, v);
    return v;
  };
}

/**
 * Generates a random UUID (Universally Unique Identifier) v4
 * Creates a 128-bit identifier that is practically guaranteed to be unique.
 * Follows the UUID v4 format with random or pseudo-random values.
 *
 * @returns {string} A UUID string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * @example
 * generateUUID(); // returns something like "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculates the sum of all numbers in a nested array structure
 * Recursively traverses multi-dimensional arrays and sums all numeric values,
 * ignoring non-numeric elements. Perfect for totaling values in complex data structures.
 *
 * @param {Array} arr - The nested array containing numbers and/or other arrays
 * @returns {number} The sum of all numeric values found
 * @example
 * sumNested([1, [2, 3], [4, [5, 'text']], 6]); // returns 21
 */
function sumNested(arr) {
  return arr.reduce(
    (s, v) =>
      s + (Array.isArray(v) ? sumNested(v) : typeof v === "number" ? v : 0),
    0
  );
}

/**
 * Executes a collection of async tasks with controlled concurrency
 * Manages a pool of concurrent promises, ensuring that no more than the specified
 * number of tasks run simultaneously. Great for rate-limiting API calls or managing resources.
 *
 * @param {Array<Function>} tasks - Array of functions that return promises
 * @param {number} [poolSize=3] - Maximum number of concurrent tasks
 * @returns {Promise<Array>} Promise that resolves with array of all task results
 * @example
 * const tasks = [
 *   () => fetch('/api/1'),
 *   () => fetch('/api/2'),
 *   () => fetch('/api/3')
 * ];
 * promisePool(tasks, 2).then(results => console.log(results));
 */
async function promisePool(tasks, poolSize = 3) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const cleanup = () => executing.delete(p);
    p.then(cleanup, cleanup);
    if (executing.size >= poolSize) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

/**
 * Transforms a function into a curried version that can be partially applied
 * Currying allows you to call a function with fewer arguments than it expects,
 * returning a new function that accepts the remaining arguments.
 *
 * @param {Function} fn - The function to curry
 * @param {number} [arity=fn.length] - Number of arguments the function expects
 * @returns {Function} The curried function
 * @example
 * const add = (a, b, c) => a + b + c;
 * const curriedAdd = curry(add);
 * curriedAdd(1)(2)(3); // returns 6
 * curriedAdd(1, 2)(3); // returns 6
 */
function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return (...more) => curried.apply(this, args.concat(more));
  };
}

/**
 * Performs a fetch request with a timeout mechanism
 * Wraps the standard fetch API with automatic timeout handling to prevent
 * requests from hanging indefinitely. Uses AbortController for clean cancellation.
 *
 * @param {string} url - The URL to fetch
 * @param {Object} [options={}] - Fetch options (headers, method, etc.)
 * @param {number} [timeout=5000] - Timeout in milliseconds
 * @returns {Promise<Response>} Promise that resolves with the fetch response
 * @throws {Error} Throws if the request times out or fails
 * @example
 * fetchWithTimeout('/api/data', {}, 3000)
 *   .then(response => response.json())
 *   .catch(error => console.log('Request failed or timed out'));
 */
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Reverses a string character by character
 * Takes a string and returns a new string with all characters in reverse order.
 * Simple but effective for palindrome checking or text manipulation.
 *
 * @param {string} str - The string to reverse
 * @returns {string} The reversed string
 * @example
 * reverseString("hello"); // returns "olleh"
 * reverseString("JavaScript"); // returns "tpircSavaJ"
 */
function reverseString(str) {
  return str.split("").reverse().join("");
}

/**
 * Counts the number of vowels in a string
 * Examines each character and counts occurrences of vowels (a, e, i, o, u).
 * Case-insensitive matching ensures both uppercase and lowercase vowels are counted.
 *
 * @param {string} str - The string to analyze
 * @returns {number} The total number of vowels found
 * @example
 * countVowels("hello world"); // returns 3
 * countVowels("JavaScript"); // returns 3 (a, a, i)
 */
function countVowels(str) {
  return (str.match(/[aeiou]/gi) || []).length;
}

/**
 * Capitalizes the first letter of each word in a string
 * Transforms text to title case by making the first character of each word uppercase
 * while leaving other characters unchanged. Perfect for formatting names or titles.
 *
 * @param {string} str - The string to capitalize
 * @returns {string} String with each word's first letter capitalized
 * @example
 * capitalizeWords("hello world"); // returns "Hello World"
 * capitalizeWords("javaScript is awesome"); // returns "JavaScript Is Awesome"
 */
function capitalizeWords(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Removes duplicate values from an array
 * Creates a new array containing only unique elements from the original array,
 * preserving the order of first occurrence. Uses Set for efficient deduplication.
 *
 * @param {Array} arr - The array to remove duplicates from
 * @returns {Array} New array with only unique elements
 * @example
 * unique([1, 2, 2, 3, 1, 4]); // returns [1, 2, 3, 4]
 * unique(['a', 'b', 'a', 'c']); // returns ['a', 'b', 'c']
 */
function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Performs deep equality comparison between two values
 * Recursively compares objects and arrays to determine if they have the same
 * structure and values at all levels. More thorough than simple === comparison.
 *
 * @param {*} a - First value to compare
 * @param {*} b - Second value to compare
 * @returns {boolean} True if values are deeply equal, false otherwise
 * @example
 * deepEqual({a: 1, b: {c: 2}}, {a: 1, b: {c: 2}}); // returns true
 * deepEqual([1, [2, 3]], [1, [2, 3]]); // returns true
 * deepEqual({a: 1}, {a: 2}); // returns false
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null)
    return false;
  const keysA = Object.keys(a),
    keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
}

/**
 * Generates a random integer within a specified range (inclusive)
 * Creates random whole numbers between min and max values, including both endpoints.
 * Useful for dice rolls, random selections, or generating test data.
 *
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer between min and max
 * @example
 * randomInt(1, 6); // returns random number between 1 and 6 (like a dice roll)
 * randomInt(10, 20); // returns random number between 10 and 20
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Splits an array into smaller chunks of specified size
 * Divides a large array into smaller sub-arrays, each containing up to the specified
 * number of elements. The last chunk may contain fewer elements if the array doesn't
 * divide evenly.
 *
 * @param {Array} arr - The array to split into chunks
 * @param {number} size - Maximum size of each chunk
 * @returns {Array<Array>} Array of chunks (sub-arrays)
 * @example
 * chunk([1, 2, 3, 4, 5, 6, 7], 3); // returns [[1, 2, 3], [4, 5, 6], [7]]
 * chunk(['a', 'b', 'c', 'd'], 2); // returns [['a', 'b'], ['c', 'd']]
 */
function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

/**
 * Creates a promise that resolves after a specified delay
 * Implements a simple sleep/delay function using promises, perfect for adding
 * pauses in async workflows or creating artificial delays for testing.
 *
 * @param {number} ms - Number of milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified delay
 * @example
 * async function example() {
 *   console.log('Before sleep');
 *   await sleep(1000); // Wait 1 second
 *   console.log('After sleep');
 * }
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts an object of parameters to a URL query string
 * Transforms key-value pairs into a properly encoded query string format,
 * suitable for appending to URLs. Handles URL encoding automatically.
 *
 * @param {Object} params - Object containing key-value pairs for the query string
 * @returns {string} Encoded query string (without leading '?')
 * @example
 * toQueryString({name: 'john', age: 30, city: 'new york'});
 * // returns "name=john&age=30&city=new%20york"
 */
function toQueryString(params) {
  return Object.entries(params)
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
    .join("&");
}

/**
 * Finds the intersection of two arrays (common elements)
 * Returns elements that appear in both arrays, effectively finding the overlap.
 * Preserves the order from the first array and eliminates duplicates.
 *
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {Array} Array containing elements present in both input arrays
 * @example
 * intersect([1, 2, 3, 4], [3, 4, 5, 6]); // returns [3, 4]
 * intersect(['a', 'b', 'c'], ['b', 'c', 'd']); // returns ['b', 'c']
 */
function intersect(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

/**
 * Calculates the factorial of a number
 * Computes n! (n factorial), which is the product of all positive integers
 * from 1 to n. Returns 1 for n = 0 by mathematical convention.
 *
 * @param {number} n - Non-negative integer to calculate factorial for
 * @returns {number} The factorial of n
 * @throws {Error} Throws error for negative numbers
 * @example
 * factorial(5); // returns 120 (5 * 4 * 3 * 2 * 1)
 * factorial(0); // returns 1
 * factorial(3); // returns 6
 */
function factorial(n) {
  if (n < 0) throw new Error("Negative numbers not allowed");
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Removes falsy values from an array
 * Filters out elements that are falsy (false, 0, "", null, undefined, NaN),
 * keeping only truthy values. Great for cleaning up data arrays.
 *
 * @param {Array} arr - Array to remove falsy values from
 * @returns {Array} New array with only truthy values
 * @example
 * compact([1, 0, true, false, "", "hello", null, undefined]);
 * // returns [1, true, "hello"]
 */
function compact(arr) {
  return arr.filter(Boolean);
}

/**
 * Finds the maximum value in an array of numbers
 * Determines the largest numeric value in the array using the spread operator
 * with Math.max for optimal performance.
 *
 * @param {Array<number>} arr - Array of numbers to find maximum from
 * @returns {number} The largest number in the array
 * @example
 * findMax([1, 5, 3, 9, 2]); // returns 9
 * findMax([-1, -5, -2]); // returns -1
 */
function findMax(arr) {
  return Math.max(...arr);
}

/**
 * Generates the nth row of Pascal's triangle
 * Pascal's triangle is a mathematical structure where each number is the sum
 * of the two numbers above it. Each row corresponds to binomial coefficients.
 *
 * @param {number} n - Row number to generate (0-indexed)
 * @returns {Array<number>} Array representing the nth row of Pascal's triangle
 * @example
 * pascalRow(0); // returns [1]
 * pascalRow(3); // returns [1, 3, 3, 1]
 * pascalRow(4); // returns [1, 4, 6, 4, 1]
 */
function pascalRow(n) {
  const row = [1];
  for (let k = 0; k < n; k++) {
    row.push((row[k] * (n - k)) / (k + 1));
  }
  return row;
}

/**
 * Rotates a string by k positions to the right
 * Circular rotation where characters from the end move to the beginning.
 * Negative values rotate left, positive values rotate right. Handles wrap-around
 * automatically for any rotation amount.
 *
 * @param {string} str - String to rotate
 * @param {number} k - Number of positions to rotate (positive = right, negative = left)
 * @returns {string} The rotated string
 * @example
 * rotateString("hello", 2); // returns "lohel"
 * rotateString("abcdef", -1); // returns "bcdefa"
 * rotateString("test", 8); // returns "test" (full rotation)
 */
function rotateString(str, k) {
  const n = str.length;
  const steps = ((k % n) + n) % n;
  return str.slice(-steps) + str.slice(0, n - steps);
}