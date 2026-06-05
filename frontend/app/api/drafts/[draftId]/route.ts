import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

type Ctx = { params: Promise<{ draftId: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { draftId } = await ctx.params;
  return proxyTo(req, `/api/drafts/${draftId}`);
}

export const GET = handler;
export const PATCH = handler;
export const DELETE = handler;
