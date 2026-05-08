import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version || '0.1.0',
    node: process.version,
    timestamp: new Date().toISOString(),
  });
}
