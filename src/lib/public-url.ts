import { networkInterfaces } from "os";

function isPrivateIpv4(ip: string) {
  return (
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function isVirtualIface(name: string) {
  return /utun|awdl|llw|bridge|vmnet|vbox|docker|vnic|tailscale/i.test(name);
}

export function detectLanIps() {
  const preferred: string[] = [];
  const others: string[] = [];
  let nets: ReturnType<typeof networkInterfaces>;

  try {
    nets = networkInterfaces();
  } catch {
    return [];
  }

  for (const [name, items] of Object.entries(nets)) {
    for (const item of items ?? []) {
      if (!item || item.internal) continue;
      const family = String(item.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (item.address.startsWith("169.254.")) continue;
      if (!isPrivateIpv4(item.address)) continue;
      if (isVirtualIface(name)) {
        others.push(item.address);
      } else {
        preferred.push(item.address);
      }
    }
  }

  return [...new Set([...preferred, ...others])];
}

export function detectLanIp() {
  return detectLanIps()[0] ?? null;
}

export function lanOrigin(port = process.env.PORT ?? "3000") {
  const lan = detectLanIp();
  if (lan) {
    return `http://${lan}:${port}`;
  }

  return `http://localhost:${port}`;
}

export function lanOrigins(port = process.env.PORT ?? "3000") {
  const ips = detectLanIps();
  if (ips.length === 0) {
    return [`http://localhost:${port}`];
  }
  return ips.map((ip) => `http://${ip}:${port}`);
}
