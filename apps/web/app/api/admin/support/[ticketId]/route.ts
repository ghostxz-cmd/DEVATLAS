import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ ticketId: string }>;
};

async function proxy(
  request: Request,
  method: "GET" | "PATCH" | "POST",
  context: RouteContext,
) {
  const { ticketId } = await context.params;
  const endpoint = `${new URL(request.url).origin}/api/support/tickets/${encodeURIComponent(ticketId)}`;

  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : await request.text(),
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, "GET", context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, "PATCH", context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, "POST", context);
}
