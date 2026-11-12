import { createServer } from "node:http";

const port = Number(process.env.PUBLIC_TENANT_FIXTURE_PORT || 4311);

const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", `http://127.0.0.1:${port}`)
    .pathname;

  if (pathname === "/ready") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ready");
    return;
  }

  if (pathname === "/public/tenants/studio-alpha/config") {
    response.writeHead(404, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        code: "PUBLIC_WORKSPACE_NOT_FOUND",
        message: "Workspace not found.",
      }),
    );
    return;
  }

  response.writeHead(404, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify({ code: "NOT_FOUND" }));
});

server.listen(port, "0.0.0.0");

const stop = () => server.close(() => process.exit(0));

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
