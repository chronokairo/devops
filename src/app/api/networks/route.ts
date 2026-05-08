import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const ifaces = os.networkInterfaces();

  const localNetworks = Object.entries(ifaces).map(([name, addrs]) => ({
    name,
    addresses: (addrs || []).map((a) => ({
      address: a.address,
      family: a.family,
      netmask: a.netmask,
      cidr: a.cidr,
      internal: a.internal,
      mac: a.mac,
    })),
  }));

  const inventoryUrl = process.env.NETWORK_INVENTORY_URL;
  let remoteNetworks: any[] = [];
  let remoteError: string | null = null;

  if (inventoryUrl) {
    try {
      const res = await fetch(inventoryUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      remoteNetworks = data.networks || data.resources || data || [];
    } catch (err) {
      remoteError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    hostname: os.hostname(),
    localNetworks,
    remoteNetworks,
    remoteError: inventoryUrl
      ? remoteError
      : 'Defina NETWORK_INVENTORY_URL para carregar redes remotas (VPCs, sub-redes, regras de firewall, DNS, load balancers).',
  });
}
