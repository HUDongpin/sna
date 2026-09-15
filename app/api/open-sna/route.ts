export const dynamic = "force-dynamic";

function missingOpenSnaApi() {
  return Response.json(
    {
      error: "This Open SNA API path does not exist. Use POST /api/open-sna/analyze.",
      code: "NOT_FOUND",
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export const GET = missingOpenSnaApi;
export const POST = missingOpenSnaApi;
export const PUT = missingOpenSnaApi;
export const PATCH = missingOpenSnaApi;
export const DELETE = missingOpenSnaApi;
export const OPTIONS = missingOpenSnaApi;
