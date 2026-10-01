import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * High-performance, zero-dependency health check endpoint.
 * Responds in < 1ms without querying the database.
 * Used by Railway deployment health checks, Cloudflare, and uptime monitors
 * to guarantee zero-downtime rolling deploys and prevent 502 Bad Gateway.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'cahaya-silver-king',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
