import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

type Ctx = { params: Promise<{ tenantId: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { tenantId } = await ctx.params;
  return proxyTo(req, `/api/tenants/${tenantId}`);
}

export const GET = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
