const MAILPIT_ORIGIN = "http://127.0.0.1:8025";

const readMailboxJson = async (request, path, params) => {
  let response;
  try {
    response = await request.get(`${MAILPIT_ORIGIN}${path}`, {
      params,
      timeout: 5_000,
      maxRedirects: 0,
    });
  } catch (cause) {
    throw new Error(
      "The local Mailpit SMTP sink is required. Start the service documented in e2e/README.md before running the release smoke.",
      { cause },
    );
  }
  if (!response.ok()) {
    throw new Error(`Mailpit ${path} failed with HTTP ${response.status()}.`);
  }
  return response.json();
};

export const readSmtpMessages = async (request, recipient) => {
  const messages = [];
  let start = 0;
  let count;
  do {
    const page = await readMailboxJson(request, "/api/v1/search", {
      query: `to:${recipient}`,
      start,
      limit: 100,
    });
    if (
      !Array.isArray(page.messages) ||
      !Number.isInteger(page.messages_count) ||
      page.messages_count < 0 ||
      (page.messages.length === 0 && start < page.messages_count)
    ) {
      throw new Error("Mailpit returned an incomplete message listing.");
    }
    count = page.messages_count;
    messages.push(...page.messages);
    start += page.messages.length;
  } while (start < count);

  // Mailpit searches may also match address fragments; assert the exact inbox.
  return messages.filter((message) =>
    message.To?.some(({ Address }) => Address === recipient),
  );
};

export const readSmtpMessage = (request, id) =>
  readMailboxJson(request, `/api/v1/message/${encodeURIComponent(id)}`);
