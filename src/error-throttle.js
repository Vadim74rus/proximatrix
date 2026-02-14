/**
 * Подавление спама повторяющихся ошибок в логах.
 * Первая ошибка логируется сразу, повторы в течение 60 сек подавляются.
 * После 60 сек выводится сводка: "повторено N раз".
 */

const THROTTLE_MS = 60000;  // 1 минута
const MIN_REPEATS_TO_SUPPRESS = 3;

const cache = new Map(); // key -> { lastLog, count }

function throttleError(prefix, target, errMsg, logFn = console.error) {
  const key = `err:${prefix}:${target}:${errMsg}`;
  const now = Date.now();
  let entry = cache.get(key);

  if (!entry) {
    entry = { lastLog: 0, count: 0 };
    cache.set(key, entry);
  }
  entry.count++;

  if (entry.count === 1) {
    logFn(`❌ ${prefix} (${target}): ${errMsg}`);
    entry.lastLog = now;
  } else if (now - entry.lastLog >= THROTTLE_MS) {
    if (entry.count > MIN_REPEATS_TO_SUPPRESS) {
      logFn(`❌ ${prefix} (${target}): ${errMsg} [повторено ${entry.count} раз за ${THROTTLE_MS / 1000} сек]`);
    } else {
      logFn(`❌ ${prefix} (${target}): ${errMsg}`);
    }
    entry.lastLog = now;
    entry.count = 0;
  }
}

function throttleWarn(message, logFn = console.warn) {
  const key = 'warn:' + message.slice(0, 100);
  const now = Date.now();
  let entry = cache.get(key);

  if (!entry) {
    entry = { lastLog: 0, count: 0 };
    cache.set(key, entry);
  }
  entry.count++;

  if (entry.count === 1) {
    logFn(`⚠️  ${message}`);
    entry.lastLog = now;
  } else if (now - entry.lastLog >= THROTTLE_MS) {
    if (entry.count > MIN_REPEATS_TO_SUPPRESS) {
      logFn(`⚠️  ${message} [повторено ${entry.count} раз]`);
    } else {
      logFn(`⚠️  ${message}`);
    }
    entry.lastLog = now;
    entry.count = 0;
  }
}

module.exports = { throttleError, throttleWarn };
