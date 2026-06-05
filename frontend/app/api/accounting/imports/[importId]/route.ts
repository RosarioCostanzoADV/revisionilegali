import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ importId: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { importId } = await ctx.params;
  return proxyTo(req, `/api/accounting/imports/${importId}`);
}

export const GET = handler;
export const DELETE = handler;
export const PATCH = handler;
