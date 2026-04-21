const counters = {
  scan_success_total: 0,
  scan_failure_total: 0,
  login_success_total: 0,
  login_failure_total: 0,
};

function inc(key) {
  if (typeof counters[key] === 'number') counters[key] += 1;
}

function snapshot() {
  return {
    ...counters,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
  };
}

module.exports = { inc, snapshot };
