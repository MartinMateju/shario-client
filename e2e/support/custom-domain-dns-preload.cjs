const dns = require("node:dns");

const hosts = new Set([
  "api.shario.localhost",
  "shario.localhost",
  "studio-alpha.test",
  "studio-alpha.shario.localhost",
  "studio-beta.shario.localhost",
]);

const loopbackResult = (hostname, options) => {
  if (!hosts.has(String(hostname).toLowerCase())) return null;
  const family =
    (typeof options === "number" ? options : options?.family) === 6 ? 6 : 4;
  const result = { address: family === 6 ? "::1" : "127.0.0.1", family };
  return options?.all ? [result] : result;
};

if (process.env.E2E_HTTPS_MODE === "1") {
  const original = dns.lookup.bind(dns);
  const originalPromise = dns.promises.lookup.bind(dns.promises);
  dns.lookup = (hostname, options, callback) => {
    const cb = typeof options === "function" ? options : callback;
    const opts = typeof options === "function" ? undefined : options;
    const result = loopbackResult(hostname, opts);
    if (!result) return original(hostname, options, callback);
    process.nextTick(() =>
      Array.isArray(result)
        ? cb(null, result)
        : cb(null, result.address, result.family),
    );
  };
  dns.promises.lookup = (hostname, options) => {
    const result = loopbackResult(hostname, options);
    return result
      ? Promise.resolve(result)
      : originalPromise(hostname, options);
  };
}

module.exports = { loopbackResult };
