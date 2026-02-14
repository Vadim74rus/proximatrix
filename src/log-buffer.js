/**
 * Буфер логов для API просмотра.
 * Перехватывает console.log, console.warn, console.error и сохраняет в памяти.
 */

const MAX_ENTRIES = 2000;

const buffer = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function addEntry(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(a => {
    if (typeof a === 'object' && a !== null) {
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    }
    return String(a);
  }).join(' ');
  buffer.push({ timestamp, level, message });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

function init() {
  console.log = function (...args) {
    addEntry('info', args);
    originalLog.apply(console, args);
  };
  console.warn = function (...args) {
    addEntry('warn', args);
    originalWarn.apply(console, args);
  };
  console.error = function (...args) {
    addEntry('error', args);
    originalError.apply(console, args);
  };
}

function getLogs(options = {}) {
  const { limit = 100, level = 'all', offset = 0 } = options;
  let filtered = buffer;
  if (level !== 'all') {
    const levels = level.split(',').map(s => s.trim().toLowerCase());
    filtered = buffer.filter(e => levels.includes(e.level));
  }
  const total = filtered.length;
  const start = Math.max(0, total - limit - offset);
  const end = total - offset;
  return {
    logs: filtered.slice(start, end).reverse(),
    total,
    limit,
  };
}

module.exports = { init, getLogs };
