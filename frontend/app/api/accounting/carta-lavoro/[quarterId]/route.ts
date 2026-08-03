import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ quarterId: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { quarterId } = await ctx.params;
  return proxyTo(req, `/api/accounting/carta-lavoro/${quarterId}`);
}

export const GET = handler;
export const PUT = handler;
export const DELETE = handler;
