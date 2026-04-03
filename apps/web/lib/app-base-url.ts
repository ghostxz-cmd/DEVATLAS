export function getAppBaseUrl(request?: Request) {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }

  if (request) {
    return new URL(request.url).origin.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}