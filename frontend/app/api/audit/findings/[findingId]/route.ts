import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ findingId: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { findingId } = await ctx.params;
  return proxyTo(req, `/api/audit/findings/${findingId}`);
}

export const GET = handler;
export const PATCH = handler;
export const DELETE = handler;
