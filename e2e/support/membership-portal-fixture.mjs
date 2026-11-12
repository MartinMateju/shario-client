// UI-contract fixture only: this does not process Stripe payments or test the
// server's accounting. Real HTTP/webhook lifecycle tests live in the backend.
import { createServer } from "node:http";
import { handleCustomerPortalFixtureRequest } from "../visual/customer-portal-fixture.mjs";

const port = Number(process.env.MEMBERSHIP_FIXTURE_PORT || 4107);
const key = "local-membership-ui-contract";
const locationIds = ["64b000000000000000000021", "64b000000000000000000022"];
const locations = [
  { id: locationIds[0], name: "Atelier Brno" },
  {
    id: locationIds[1],
    name: "Atelier Prague Ceramic Arts & Community Studio",
  },
];
export const plans = [
  { name: "Klei · Chvíle pro sebe", amount: 89000, minutes: 240, discount: 0 },
  {
    name: "Klei · Pravidelný rytmus",
    amount: 169000,
    minutes: 480,
    discount: 500,
  },
  {
    name: "Klei · Vlastní tvorba",
    amount: 329000,
    minutes: 960,
    discount: 1000,
  },
  { name: "Klei · Profi", amount: 460000, minutes: 1800, discount: 1000 },
].map((plan, index) => ({
  id: `64b00000000000000000010${index}`,
  status: "published",
  publishedVersion: {
    id: `64b00000000000000000020${index}`,
    name: plan.name,
    translations: {
      cs: {
        name: `Přeložené členství ${index + 1}`,
        description: "Český popis členství pro oba ateliéry.",
        terms: "České podmínky osobního členství.",
      },
    },
    prices: [{ currency: "CZK", amountMinor: plan.amount }],
    billing: { type: "recurring", interval: "month", intervalCount: 1 },
    locationScope: { type: "shared_selected", locationIds },
    terms:
      "Personal membership. Hours and discounts cannot be transferred to another person.",
    benefits: [
      {
        key: "studio_hours",
        label: "Personal Open Studio hours",
        translations: { cs: { label: "Osobní hodiny v ateliéru" } },
        type: "allowance",
        unit: "minute",
        quantity: plan.minutes,
        usageScope: "open_studio",
        memberOnly: true,
        rolloverPercent: 25,
      },
      ...(plan.discount
        ? [
            {
              key: "course_discount",
              label: "Personal course discount",
              type: "percentage",
              percentageBps: plan.discount,
              appliesTo: "products",
              productScope: "courses",
              memberOnly: true,
              eligibleProductIds: [],
            },
          ]
        : []),
    ],
  },
}));

const initialState = () => ({
  membership: null,
  checkouts: [],
  cancellationRequests: [],
  resumes: 0,
  planChanges: [],
  cancelledPlanChanges: 0,
});
let state = initialState();
const cors = (request) => ({
  "access-control-allow-origin": request.headers.origin || "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers":
    "authorization,content-type,idempotency-key,x-membership-fixture-key",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "cache-control": "no-store",
});
const send = (request, response, status, data) => {
  response.writeHead(status, {
    ...cors(request),
    "content-type": "application/json",
  });
  response.end(JSON.stringify(data));
};
const body = async (request) => {
  let text = "";
  for await (const chunk of request) text += chunk;
  return text ? JSON.parse(text) : {};
};
const createMembership = (plan, status = "active") => ({
  id: "64b000000000000000000301",
  status,
  planId: plan.id,
  canSchedulePlanChange: status === "active",
  cancelAtPeriodEnd: false,
  planSnapshot: plan.publishedVersion,
  amountMinor: plan.publishedVersion.prices[0].amountMinor,
  currency: "CZK",
  currentPeriodStart: "2027-01-01T00:00:00.000Z",
  currentPeriodEnd: "2027-02-01T00:00:00.000Z",
  balances: [
    {
      benefitKey: "studio_hours",
      unit: "minute",
      available: status === "active" ? 2130 : 0,
      currentPeriodAvailable: status === "active" ? 1800 : 0,
      carryoverAvailable: status === "active" ? 330 : 0,
      carryoverExpiresAt:
        status === "active" ? "2027-02-01T00:00:00.000Z" : null,
    },
  ],
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const path = url.pathname;
  if (request.method === "OPTIONS") {
    response.writeHead(204, cors(request));
    response.end();
    return;
  }
  try {
    if (path.startsWith("/__membership-fixture/")) {
      if (request.headers["x-membership-fixture-key"] !== key)
        return send(request, response, 403, { error: "Fixture key required" });
      if (path.endsWith("/reset") && request.method === "POST") {
        state = initialState();
        return send(request, response, 200, state);
      }
      if (path.endsWith("/state") && request.method === "GET")
        return send(request, response, 200, state);
      if (path.endsWith("/activate") && request.method === "POST") {
        const { planId } = await body(request);
        state.membership = createMembership(
          plans.find((entry) => entry.id === planId) || plans[3],
        );
        return send(request, response, 200, state);
      }
      return send(request, response, 404, { error: "Unknown fixture command" });
    }
    if (
      (path === "/memberships/catalog" ||
        path === "/public/tenants/studio-alpha/memberships") &&
      request.method === "GET"
    )
      return send(request, response, 200, {
        tenant: { name: "Klei", currency: "CZK" },
        locations,
        plans,
      });
    if (path === "/memberships/mine" && request.method === "GET")
      return send(request, response, 200, { membership: state.membership });
    if (path === "/memberships/mine/ledger" && request.method === "GET")
      return send(request, response, 200, { entries: [] });
    if (path === "/memberships/mine/plan-change" && request.method === "POST") {
      const submitted = await body(request);
      const plan = plans.find((entry) => entry.id === submitted.planId);
      if (
        !state.membership?.canSchedulePlanChange ||
        !plan ||
        submitted.planVersionId !== plan.publishedVersion.id ||
        submitted.termsAccepted !== true ||
        !request.headers["idempotency-key"] ||
        Object.hasOwn(submitted, "locationId")
      ) {
        return send(request, response, 400, {
          message: "Invalid scheduled plan change",
        });
      }
      state.planChanges.push({
        ...submitted,
        idempotencyKey: request.headers["idempotency-key"],
      });
      state.membership.scheduledPlanChange = {
        planId: plan.id,
        planVersionId: plan.publishedVersion.id,
        planSnapshot: plan.publishedVersion,
        effectiveAt: state.membership.currentPeriodEnd,
        status: "scheduled",
      };
      state.membership.canSchedulePlanChange = false;
      return send(request, response, 200, { membership: state.membership });
    }
    if (
      path === "/memberships/mine/plan-change" &&
      request.method === "DELETE"
    ) {
      state.cancelledPlanChanges += 1;
      delete state.membership.scheduledPlanChange;
      state.membership.canSchedulePlanChange = true;
      return send(request, response, 200, { membership: state.membership });
    }
    if (path === "/memberships/checkout" && request.method === "POST") {
      const submitted = await body(request);
      const plan = plans.find((entry) => entry.id === submitted.planId);
      if (
        !plan ||
        submitted.planVersionId !== plan.publishedVersion.id ||
        submitted.currency !== "CZK" ||
        submitted.termsAccepted !== true ||
        Object.hasOwn(submitted, "locationId") ||
        !request.headers["idempotency-key"]
      )
        return send(request, response, 400, {
          message: "Invalid membership checkout contract",
        });
      const sessionId = `cs_test_local_membership_${state.checkouts.length + 1}`;
      state.checkouts.push({
        ...submitted,
        sessionId,
        idempotencyKey: request.headers["idempotency-key"],
      });
      state.membership = createMembership(plan, "pending");
      return send(request, response, 200, {
        checkout: {
          sessionId,
          url: `https://checkout.stripe.com/c/pay/${sessionId}`,
        },
      });
    }
    if (path.startsWith("/memberships/checkout/") && request.method === "GET")
      return send(request, response, 200, {
        checkout: {
          status:
            state.membership?.status === "active" ? "activated" : "pending",
        },
        membership: state.membership,
      });
    if (
      path === "/memberships/mine/cancel" &&
      request.method === "POST" &&
      state.membership?.status === "active"
    ) {
      state.cancellationRequests.push(await body(request));
      state.membership.cancelAtPeriodEnd = true;
      return send(request, response, 200, { membership: state.membership });
    }
    if (
      path === "/memberships/mine/resume" &&
      request.method === "POST" &&
      state.membership?.cancelAtPeriodEnd
    ) {
      state.resumes += 1;
      state.membership.cancelAtPeriodEnd = false;
      return send(request, response, 200, { membership: state.membership });
    }
    return await handleCustomerPortalFixtureRequest(request, response);
  } catch (error) {
    return send(request, response, 500, { error: error.message });
  }
});
server.listen(port, "127.0.0.1");
const stop = () => server.close(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
