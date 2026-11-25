import { createAuthTransportConfig } from "@/lib/features/auth/authTransportConfig";

// Only this public allowlist crosses the server/client boundary. Never pass
// CUSTOM_DOMAIN_TENANTS or proxy credentials to the browser.
export const getPublicAuthTransportConfig = () =>
  createAuthTransportConfig({
    platformHostnames: String(process.env.PLATFORM_HOSTNAMES || "").split(","),
  });
