import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { server as mockServer } from "@/test/mocks/server";

const controlKey = "postmark-stub-contract-key";
const serverToken = "postmark-stub-contract-server-token";
const provisioningHeader = "X-Shario-Postmark-Provisioning-Token";
const attemptId = "10000000-0000-4000-8000-000000000001";
let callbackServer;
let stubProcess;
let stubOrigin;
let callbackOrigin;
let rejectedTrigger;
const callbacks = [];

const api = async (pathname, { method = "GET", body } = {}) => {
  const response = await fetch(`${stubOrigin}${pathname}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-postmark-server-token": serverToken,
      "x-e2e-key": controlKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
};

const configuration = () => ({
  Url: `${callbackOrigin}/webhooks/postmark/outbound`,
  Verify: true,
  MessageStream: "outbound",
  HttpAuth: { Username: "e2e-user", Password: "e2e-password" },
  HttpHeaders: [{ Name: provisioningHeader, Value: attemptId }],
  Triggers: {
    Open: { Enabled: false },
    Delivery: { Enabled: true },
    Bounce: { Enabled: true, IncludeContent: false },
    SpamComplaint: { Enabled: true, IncludeContent: false },
  },
});

beforeAll(async () => {
  // This contract exercises two loopback HTTP servers, without mocked requests.
  mockServer.close();
  callbackServer = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    callbacks.push({ body, headers: request.headers, pathname: request.url });
    response.writeHead(body.RecordType === rejectedTrigger ? 503 : 200);
    response.end();
  });
  callbackServer.listen(0, "127.0.0.1");
  await once(callbackServer, "listening");
  callbackOrigin = `http://127.0.0.1:${callbackServer.address().port}`;

  stubProcess = spawn(
    process.execPath,
    [path.resolve("e2e/support/postmark-stub.mjs")],
    {
      env: {
        ...process.env,
        E2E_POSTMARK_PORT: "0",
        E2E_TEST_KEY: controlKey,
        POSTMARK_SYSTEM_SERVER_TOKEN: serverToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const [ready] = await once(stubProcess.stdout, "data");
  stubOrigin = `http://127.0.0.1:${JSON.parse(ready.toString()).port}`;
});

beforeEach(async () => {
  rejectedTrigger = undefined;
  callbacks.length = 0;
  expect((await api("/__e2e/reset", { method: "POST" })).status).toBe(200);
});

afterAll(async () => {
  if (stubProcess && stubProcess.exitCode === null) {
    const exited = once(stubProcess, "exit");
    stubProcess.kill();
    await exited;
  }
  if (callbackServer) {
    await new Promise((resolve) => callbackServer.close(resolve));
  }
});

describe("Postmark stub webhook verification", () => {
  it("verifies all enabled callbacks with authentication before creating and updating a webhook", async () => {
    const created = await api("/webhooks", {
      method: "POST",
      body: configuration(),
    });
    expect(created.status).toBe(200);
    expect(created.body.Status).toBe("verified");
    expect(callbacks.map(({ body }) => body.RecordType)).toEqual([
      "Delivery",
      "Bounce",
      "SpamComplaint",
    ]);
    for (const { body, headers, pathname } of callbacks) {
      expect(pathname).toBe("/webhooks/postmark/outbound");
      expect(headers.authorization).toBe(
        `Basic ${Buffer.from("e2e-user:e2e-password").toString("base64")}`,
      );
      expect(headers[provisioningHeader.toLowerCase()]).toBe(attemptId);
      expect(body).toMatchObject({ MessageStream: "outbound", ServerID: 23 });
      expect(created.body.Triggers[body.RecordType].Status).toBe("verified");
    }

    callbacks.length = 0;
    const updated = await api(`/webhooks/${created.body.ID}`, {
      method: "PUT",
      body: { ...configuration(), MessageStream: undefined },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      ID: created.body.ID,
      Status: "verified",
      MessageStream: "outbound",
    });
    expect(callbacks).toHaveLength(3);
    expect(
      (await api("/webhooks?MessageStream=outbound")).body.Webhooks,
    ).toEqual(
      [updated.body].map(({ ErrorCode: _errorCode, ...webhook }) => webhook),
    );
  });

  it("fails setup when any enabled callback rejects the provisioning attempt", async () => {
    rejectedTrigger = "Bounce";
    const result = await api("/webhooks", {
      method: "POST",
      body: configuration(),
    });

    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({
      ErrorCode: 1364,
      Results: [
        { TriggerType: "Delivery", Success: true, StatusCode: 200 },
        { TriggerType: "Bounce", Success: false, StatusCode: 503 },
        { TriggerType: "SpamComplaint", Success: true, StatusCode: 200 },
      ],
    });
    expect((await api("/webhooks")).body.Webhooks[0].Status).toBe("failed");
  });

  it("does not mark a webhook verified when verification was not requested", async () => {
    const result = await api("/webhooks", {
      method: "POST",
      body: { ...configuration(), Verify: false },
    });

    expect(result.status).toBe(200);
    expect(result.body.Status).toBe("unverified");
    expect(callbacks).toEqual([]);
  });
});
