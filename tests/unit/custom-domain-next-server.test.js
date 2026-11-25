import { describe, expect, it } from "vitest";
import { isTrustedCustomDomainProxyRequest } from "../../e2e/support/custom-domain-next-server.mjs";

const request = () => ({
  socket: { remoteAddress: "127.0.0.1" },
  headers: {
    host: "studio-alpha.test",
    "x-forwarded-host": "studio-alpha.test",
    "x-forwarded-proto": "https",
  },
  url: "/api/tenant-auth/auth/customer",
});

describe("custom-domain production Next fixture ingress", () => {
  it("allows only the loopback HTTPS terminator's known public origin", () => {
    expect(isTrustedCustomDomainProxyRequest(request())).toBe(true);
  });
  it.each(["203.0.113.8", "", undefined])(
    "rejects untrusted peer %s",
    (remoteAddress) => {
      const value = request();
      value.socket.remoteAddress = remoteAddress;
      expect(isTrustedCustomDomainProxyRequest(value)).toBe(false);
    },
  );
  it.each([
    { host: "attacker.test", "x-forwarded-host": "attacker.test" },
    {
      host: "studio-alpha.test:3443",
      "x-forwarded-host": "studio-alpha.test:3443",
    },
    { "x-forwarded-host": "attacker.test" },
    { "x-forwarded-proto": "http" },
    { "x-forwarded-proto": undefined },
  ])("rejects noncanonical or forged ingress headers %j", (headers) => {
    const value = request();
    value.headers = { ...value.headers, ...headers };
    expect(isTrustedCustomDomainProxyRequest(value)).toBe(false);
  });
  it.each([
    "https://studio-alpha.test/api/health",
    "//attacker.test/",
    "/\\attacker.test/",
    "/bad\r\npath",
  ])("rejects unsafe request target %s", (url) => {
    expect(isTrustedCustomDomainProxyRequest({ ...request(), url })).toBe(
      false,
    );
  });
});
