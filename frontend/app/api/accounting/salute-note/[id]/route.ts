import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ id: string }> };

async function handler(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyTo(req, `/api/accounting/salute-note/${id}`);
}

export const DELETE = handler;
