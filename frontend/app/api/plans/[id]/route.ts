import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

type Ctx = { params: Promise<{ id: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyTo(req, `/api/plans/${id}`);
}

export const GET = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
