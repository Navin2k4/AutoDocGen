function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

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

function flatten(arr) {
  return arr.reduce(
    (acc, v) => acc.concat(Array.isArray(v) ? flatten(v) : v),
    []
  );
}

function groupBy(array, keyFn) {
  return array.reduce((acc, item) => {
    const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

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

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function sumNested(arr) {
  return arr.reduce(
    (s, v) =>
      s + (Array.isArray(v) ? sumNested(v) : typeof v === "number" ? v : 0),
    0
  );
}

async function promisePool(tasks, poolSize = 3) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
  }
}

function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return (...more) => curried.apply(this, args.concat(more));
  };
}

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}
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

function reverseString(str) {
  return str.split("").reverse().join("");
}

function countVowels(str) {
  return (str.match(/[aeiou]/gi) || []).length;
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function unique(arr) {
  return [...new Set(arr)];
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null)
    return false;
  const keysA = Object.keys(a),
    keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toQueryString(params) {
  return Object.entries(params)
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
    .join("&");
}

function intersect(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function factorial(n) {
  if (n < 0) throw new Error("Negative numbers not allowed");
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function compact(arr) {
  return arr.filter(Boolean);
}

function findMax(arr) {
  return Math.max(...arr);
}

function pascalRow(n) {
  const row = [1];
  for (let k = 0; k < n; k++) {
    row.push((row[k] * (n - k)) / (k + 1));
  }
  return row;
}

function rotateString(str, k) {
  const n = str.length;
  const steps = ((k % n) + n) % n;
  return str.slice(-steps) + str.slice(0, n - steps);
}
