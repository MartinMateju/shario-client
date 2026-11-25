// Local UI fixture only. No real accounts, credentials, email provider or database.
// Run: node e2e/support/door-email-template-fixture.mjs
// Then: NEXT_PUBLIC_API_URL=http://localhost:4018 npm run dev -- --port 3118
// Open http://studio-alpha.localhost:3118/en/app/communications?section=templates
import { createServer } from "node:http";
import {
  responseForRequest,
  visualWorkspaceAccess,
} from "../visual/admin-fixtures.js";

const port = Number(process.env.DOOR_EMAIL_FIXTURE_PORT || 4018);
const workspaceLocale = process.env.DOOR_EMAIL_FIXTURE_LOCALE || "en";
const defaultTemplate = () => ({
  defaultLocale: "en",
  contentVariants: {
    en: {
      subject: "{{studioName}} | Entry code 🔑",
      format: "html",
      htmlContent:
        '<h1 style="margin:0 0 20px;font-size:28px;line-height:1.3">Your studio entry code</h1><p>Your booking starts soon at <strong>{{studioName}}</strong>.</p><div style="margin:24px 0;padding:24px;border:1px solid #d8d4cb;border-radius:12px;text-align:center"><p style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px">Entry code</p><p style="margin:0;font-size:34px;font-family:monospace;font-weight:bold;letter-spacing:4px">{{entryCode}}</p></div><p>Booking: {{bookingTime}}</p><p>Address: {{studioAddress}}</p><p>Please keep this code private.</p><p><a href="{{bookingUrl}}">Manage booking</a></p>',
      body: "Your entry code: {{entryCode}}\nStudio: {{studioName}}\nBooking: {{bookingTime}}\nAddress: {{studioAddress}}\nManage booking: {{bookingUrl}}",
    },
    cs: {
      subject: "{{studioName}} | Vstupní kód 🔑",
      format: "plain",
      htmlContent: "",
      body: "Dobrý den,\nváš vstupní kód je: {{entryCode}}\nStudio: {{studioName}}\nRezervace: {{bookingTime}}\nAdresa: {{studioAddress}}\nSpravovat rezervaci: {{bookingUrl}}",
    },
  },
});
const locations = [
  { locationId: "64b000000000000000000001", locationName: "Grohova" },
  { locationId: "64b000000000000000000002", locationName: "Václavská" },
].map((location) => ({
  ...location,
  isCustomized: false,
  template: defaultTemplate(),
}));

const sender = {
  id: "64f000000000000000000009",
  provider: "postmark_managed",
  mode: "managed",
  readiness: "ready",
  senderName: "Atelier Klei preview",
  email: "studio@example.test",
  replyToEmail: "hello@example.test",
  replyToVerifiedAt: "2026-11-16T10:00:00Z",
  providerProvisioningStatus: "ready",
  isActive: true,
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  const method = request.method;
  const headers = {
    "access-control-allow-origin":
      request.headers.origin || "http://studio-alpha.localhost:3118",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers":
      "authorization,content-type,x-tenant-id,x-tenant-slug",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "cache-control": "no-store",
    "content-type": "application/json",
  };
  const send = (status, body) => {
    response.writeHead(status, headers);
    response.end(JSON.stringify(body));
  };
  if (method === "OPTIONS") return send(204, null);
  try {
    if (url.pathname === "/locations" && method === "GET") {
      return send(200, {
        locations: locations.map((location, index) => ({
          id: location.locationId,
          _id: location.locationId,
          name: location.locationName,
          slug: index === 0 ? "grohova" : "vaclavska",
          isPrimary: index === 0,
          isActive: true,
          bookingEnabled: true,
          address: {
            line1: `${location.locationName} 1`,
            city: "Brno",
            country: "CZ",
          },
        })),
        total: locations.length,
        page: 1,
        limit: 100,
      });
    }
    if (url.pathname === "/access-codes/pools" && method === "GET")
      return send(200, { pools: [] });
    if (url.pathname === "/email-templates/door-access" && method === "GET")
      return send(200, { locations });
    if (url.pathname.startsWith("/email-templates/door-access/")) {
      const location = locations.find(
        (item) => item.locationId === url.pathname.split("/").at(-1),
      );
      if (!location)
        return send(404, { message: "Studio location not found." });
      if (method === "PATCH") {
        let raw = "";
        for await (const chunk of request) raw += chunk;
        location.template = JSON.parse(raw);
        location.isCustomized = true;
        return send(200, { location });
      }
      if (method === "DELETE") {
        location.template = defaultTemplate();
        location.isCustomized = false;
        return send(200, { location });
      }
    }
    if (url.pathname === "/email-templates")
      return send(200, { templates: [] });
    if (url.pathname === "/communication-automations") return send(200, []);
    if (url.pathname === "/communication-automations/system/door-access") {
      return send(200, {
        minutesBefore: 15,
        locations: locations.map((item) => ({
          id: item.locationId,
          name: item.locationName,
          enabled: true,
          minutesBefore: 15,
          availableCodes: 2,
          blockedReason: null,
          timezone: "Europe/Prague",
        })),
        deliveries: [],
      });
    }
    if (url.pathname === "/registered-sender-emails")
      return send(200, [sender]);
    if (url.pathname === "/auth/customer/refresh")
      return send(401, { code: "UNAUTHENTICATED" });
    if (url.pathname === "/public/tenants/studio-alpha/config") {
      const auth = responseForRequest({
        method: "POST",
        url: new URL("http://localhost/auth/refresh"),
        workspaceLocale,
      });
      return send(200, { tenant: auth.tenant });
    }
    const payload = responseForRequest({
      method,
      url,
      workspaceAccess: visualWorkspaceAccess,
      workspaceLocale,
    });
    if (payload) {
      if (payload.tenant) {
        payload.tenant.plan = "studio_plus";
        payload.tenant.modules.access_codes = true;
      }
      if (payload.effectiveModules)
        payload.effectiveModules.access_codes = true;
      return send(200, payload);
    }
    console.warn("Unhandled local fixture request:", method, url.pathname);
    return send(404, { message: "Local fixture route not configured." });
  } catch (error) {
    return send(400, { message: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Door email UI fixture: http://localhost:${port}`);
});
