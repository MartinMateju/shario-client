import { forwardFirstPartyAuthRequest } from "@/lib/auth/firstPartyAuthProxy.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleRequest = async (request, { params }) => {
  const { path } = await params;
  return forwardFirstPartyAuthRequest(request, path);
};

export const POST = handleRequest;
export const PATCH = handleRequest;
