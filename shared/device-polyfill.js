/**
 * Safe QuickJS Promise Polyfill for Zepp OS 2.x & 3.x
 * Firmware 6.x.x.x+
 * 
 * Zepp OS 2.x and 3.x embed a native ES2020 QuickJS engine with native Promise.
 * Standard polyfills that invoke Promise._setScheduler crash with:
 * "Promise._setScheduler is not a function".
 */

try {
  if (typeof Promise !== 'undefined' && typeof Promise._setScheduler === 'function') {
    Promise._setScheduler(function (flush) {
      flush && flush()
    })
  }
} catch (e) {
  // Silent fallback: Native QuickJS promises run asynchronously without custom scheduler
}
