import { NextRequest } from "next/server";
import { proxyTo, proxyFormDataTo } from "../_proxy";

export async function GET(req: NextRequest) {
  return proxyTo(req, `/api/documents${req.nextUrl.search}`);
}

export async function POST(req: NextRequest) {
  return proxyFormDataTo(req, "/api/documents");
}
