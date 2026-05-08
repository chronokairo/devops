import { NextResponse } from 'next/server';
import { webhookEvents } from '../route';

export async function GET() {
  return NextResponse.json(webhookEvents.slice(0, 100));
}
