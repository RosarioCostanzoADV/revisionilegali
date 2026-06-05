import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ paperId: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { paperId } = await ctx.params;
  return proxyTo(req, `/api/audit/working-papers/${paperId}`);
}

export const GET = handler;
export const PATCH = handler;
export const DELETE = handler;
