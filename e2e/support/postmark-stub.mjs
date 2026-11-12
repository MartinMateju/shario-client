import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.E2E_POSTMARK_PORT || 4100);
const controlKey = process.env.E2E_TEST_KEY || "shario-e2e-local-key";
const accountToken =
  process.env.POSTMARK_ACCOUNT_TOKEN || "e2e-postmark-account-token";
const systemServerToken =
  process.env.POSTMARK_SYSTEM_SERVER_TOKEN ||
  "e2e-postmark-system-server-token";
const maximumBodyBytes = 1024 * 1024;

const state = {
  nextServerId: 10_001,
  nextWebhookId: 20_001,
  nextMessageId: 1,
  servers: [],
  webhooks: [],
  messages: [],
};

const reset = () => {
  state.nextServerId = 10_001;
  state.nextWebhookId = 20_001;
  state.nextMessageId = 1;
  state.servers.length = 0;
  state.webhooks.length = 0;
  state.messages.length = 0;
};

const json = (response, status, body) => {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
};

const providerError = (response, status, message, errorCode = 10) =>
  json(response, status, { ErrorCode: errorCode, Message: message });

const readJson = async (request) => {
  const chunks = [];
  let received = 0;

  for await (const chunk of request) {
    received += chunk.length;
    if (received > maximumBodyBytes) {
      throw Object.assign(new Error("Request body is too large."), {
        statusCode: 413,
      });
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), {
      statusCode: 400,
    });
  }
};

const isControlRequest = (request) =>
  request.headers["x-e2e-key"] === controlKey;

const accountAuthorized = (request) =>
  request.headers["x-postmark-account-token"] === accountToken;

const knownServerTokens = () =>
  new Set([
    systemServerToken,
    ...state.servers.map((server) => server.ApiTokens[0]),
  ]);

const serverTokenFrom = (request) =>
  String(request.headers["x-postmark-server-token"] || "");

const serverAuthorized = (request) =>
  knownServerTokens().has(serverTokenFrom(request));

const messageView = (message) => ({
  messageId: message.messageId,
  from: message.body.From || "",
  to: message.body.To || "",
  subject: message.body.Subject || "",
  textBody: message.body.TextBody || "",
  htmlBody: message.body.HtmlBody || "",
  replyTo: message.body.ReplyTo || "",
  metadata: message.body.Metadata || {},
  messageStream: message.body.MessageStream || "",
});

const webhookView = (webhook) => {
  const view = { ...webhook };
  delete view.serverToken;
  return view;
};

const verifyWebhook = async (webhook) => {
  const callbackUrl = new URL(webhook.Url);
  if (
    callbackUrl.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(callbackUrl.hostname)
  ) {
    throw Object.assign(
      new Error("E2E webhook callbacks must use loopback HTTP."),
      {
        statusCode: 422,
      },
    );
  }

  const headers = Object.fromEntries(
    (webhook.HttpHeaders || []).map(({ Name, Value }) => [Name, Value]),
  );
  headers["content-type"] = "application/json";
  headers.authorization = `Basic ${Buffer.from(
    `${webhook.HttpAuth.Username || ""}:${webhook.HttpAuth.Password || ""}`,
  ).toString("base64")}`;
  const occurredAt = new Date().toISOString();
  const probes = {
    Delivery: { Recipient: "sample@example.com", DeliveredAt: occurredAt },
    Bounce: {
      ID: 101,
      Type: "HardBounce",
      TypeCode: 1,
      Email: "sample@example.com",
      BouncedAt: occurredAt,
    },
    SpamComplaint: {
      ID: 102,
      Email: "sample@example.com",
      BouncedAt: occurredAt,
    },
  };
  const results = [];
  for (const [recordType, trigger] of Object.entries(webhook.Triggers)) {
    if (trigger.Enabled !== true) continue;
    let statusCode = 0;
    if (probes[recordType]) {
      try {
        const callback = await fetch(callbackUrl, {
          method: "POST",
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(5_000),
          body: JSON.stringify({
            RecordType: recordType,
            MessageID: `e2e-verification-${recordType.toLowerCase()}`,
            MessageStream: webhook.MessageStream,
            ServerID: 23,
            ...probes[recordType],
          }),
        });
        statusCode = callback.status;
        await callback.arrayBuffer();
      } catch {
        // A missing callback must fail setup just as a rejected callback does.
      }
    }
    trigger.Status = statusCode === 200 ? "verified" : "failed";
    results.push({
      TriggerType: recordType,
      Success: statusCode === 200,
      StatusCode: statusCode,
    });
  }
  const verified =
    results.length > 0 && results.every(({ Success }) => Success);
  webhook.Status = verified ? "verified" : "failed";
  return { verified, results };
};

const respondWithWebhook = async (response, webhook, shouldVerify) => {
  if (shouldVerify) {
    const { verified, results } = await verifyWebhook(webhook);
    if (!verified) {
      json(response, 422, {
        ErrorCode: 1364,
        Message: "Webhook verification failed.",
        Results: results,
      });
      return;
    }
  }
  json(response, 200, { ErrorCode: 0, ...webhookView(webhook) });
};

const handleControl = async (request, response, url) => {
  if (!isControlRequest(request)) {
    json(response, 403, { message: "Invalid E2E control key." });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__e2e/reset") {
    reset();
    json(response, 200, { reset: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__e2e/state") {
    json(response, 200, {
      serverCount: state.servers.length,
      webhookCount: state.webhooks.length,
      messageCount: state.messages.length,
    });
    return;
  }

  if (
    request.method === "GET" &&
    ["/__e2e/messages", "/__e2e/messages/latest"].includes(url.pathname)
  ) {
    const purpose = String(url.searchParams.get("purpose") || "");
    const recipient = String(url.searchParams.get("to") || "").toLowerCase();
    const emailLogId = String(url.searchParams.get("emailLogId") || "");
    const messages = state.messages.filter((message) => {
      const metadataPurpose = String(message.body.Metadata?.purpose || "");
      const metadataLogId = String(message.body.Metadata?.emailLogId || "");
      const to = String(message.body.To || "").toLowerCase();
      return (
        (!purpose || metadataPurpose === purpose) &&
        (!emailLogId || metadataLogId === emailLogId) &&
        (!recipient || to === recipient)
      );
    });

    if (url.pathname === "/__e2e/messages") {
      json(response, 200, { messages: messages.map(messageView) });
      return;
    }

    const latest = messages.at(-1);
    if (!latest) {
      json(response, 404, { message: "No matching E2E email was captured." });
      return;
    }

    json(response, 200, messageView(latest));
    return;
  }

  json(response, 404, { message: "Unknown E2E control route." });
};

const handleServers = async (request, response, url) => {
  if (!accountAuthorized(request)) {
    providerError(response, 401, "Invalid account token.", 10);
    return;
  }

  if (request.method === "GET") {
    const requestedName = String(url.searchParams.get("name") || "");
    const servers = requestedName
      ? state.servers.filter((server) => server.Name === requestedName)
      : state.servers;
    json(response, 200, {
      TotalCount: servers.length,
      Servers: servers,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/servers") {
    const body = await readJson(request);
    const name = String(body.Name || "").trim();
    if (!name) {
      providerError(response, 422, "Name is required.", 300);
      return;
    }

    const existing = state.servers.find((server) => server.Name === name);
    if (existing) {
      json(response, 200, { ErrorCode: 0, ...existing });
      return;
    }

    const id = state.nextServerId++;
    const server = {
      ID: id,
      Name: name,
      ApiTokens: [`e2e-postmark-tenant-token-${id}`],
      Color: body.Color || "Turquoise",
    };
    state.servers.push(server);
    json(response, 200, { ErrorCode: 0, ...server });
    return;
  }

  providerError(response, 405, "Method not allowed.", 405);
};

const handleWebhooks = async (request, response, url) => {
  if (!serverAuthorized(request)) {
    providerError(response, 401, "Invalid server token.", 10);
    return;
  }

  const serverToken = serverTokenFrom(request);

  if (request.method === "GET" && url.pathname === "/webhooks") {
    const stream = String(url.searchParams.get("MessageStream") || "");
    const webhooks = state.webhooks.filter(
      (webhook) =>
        webhook.serverToken === serverToken &&
        (!stream || webhook.MessageStream === stream),
    );
    json(response, 200, {
      TotalCount: webhooks.length,
      Webhooks: webhooks.map(webhookView),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/webhooks") {
    const body = await readJson(request);
    const webhook = {
      ID: state.nextWebhookId++,
      Url: String(body.Url || ""),
      MessageStream: String(body.MessageStream || "outbound"),
      HttpAuth: body.HttpAuth || {},
      HttpHeaders: body.HttpHeaders || [],
      Triggers: body.Triggers || {},
      Status: "unverified",
      serverToken,
    };
    state.webhooks.push(webhook);
    await respondWithWebhook(response, webhook, body.Verify === true);
    return;
  }

  const webhookMatch = url.pathname.match(/^\/webhooks\/(\d+)$/);
  if (request.method === "PUT" && webhookMatch) {
    const id = Number(webhookMatch[1]);
    const existing = state.webhooks.find(
      (webhook) => webhook.ID === id && webhook.serverToken === serverToken,
    );
    if (!existing) {
      providerError(response, 404, "Webhook not found.", 404);
      return;
    }
    const body = await readJson(request);
    Object.assign(existing, {
      Url: String(body.Url || existing.Url),
      HttpAuth: body.HttpAuth || existing.HttpAuth,
      HttpHeaders: body.HttpHeaders || existing.HttpHeaders,
      Triggers: body.Triggers || existing.Triggers,
      Status: "unverified",
    });
    await respondWithWebhook(response, existing, body.Verify === true);
    return;
  }

  providerError(response, 405, "Method not allowed.", 405);
};

const handleEmail = async (request, response) => {
  if (!serverAuthorized(request)) {
    providerError(response, 401, "Invalid server token.", 10);
    return;
  }

  const body = await readJson(request);
  if (!body.From || !body.To || !body.Subject) {
    providerError(response, 422, "From, To and Subject are required.", 300);
    return;
  }

  const sequence = state.nextMessageId++;
  const messageId = `00000000-0000-4000-8000-${String(sequence).padStart(
    12,
    "0",
  )}`;
  state.messages.push({
    body,
    messageId,
    serverToken: serverTokenFrom(request),
  });
  json(response, 200, {
    ErrorCode: 0,
    Message: "OK",
    MessageID: messageId,
    SubmittedAt: "2026-01-15T12:00:00.000Z",
    To: body.To,
  });
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  try {
    if (request.method === "GET" && url.pathname === "/ready") {
      json(response, 200, { ready: true });
      return;
    }

    if (url.pathname.startsWith("/__e2e/")) {
      await handleControl(request, response, url);
      return;
    }

    if (url.pathname === "/servers") {
      await handleServers(request, response, url);
      return;
    }

    if (
      url.pathname === "/webhooks" ||
      /^\/webhooks\/\d+$/.test(url.pathname)
    ) {
      await handleWebhooks(request, response, url);
      return;
    }

    if (request.method === "POST" && url.pathname === "/email") {
      await handleEmail(request, response);
      return;
    }

    providerError(response, 404, "Unknown Postmark stub route.", 404);
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    providerError(
      response,
      status,
      error instanceof Error ? error.message : "Postmark stub failed.",
      status,
    );
  }
});

server.listen(port, host, () => {
  process.stdout.write(
    `${JSON.stringify({ event: "e2e-postmark-ready", host, port: server.address().port })}\n`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
