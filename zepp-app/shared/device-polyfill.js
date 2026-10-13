try {
  if (typeof Promise !== 'undefined' && typeof Promise._setScheduler === 'function') {
    Promise._setScheduler(function (flush) {
      flush && flush()
    })
  }
} catch (e) {
  // Silent fallback
}
