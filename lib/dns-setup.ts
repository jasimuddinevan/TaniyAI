// Must be imported BEFORE any mongodb usage so that SRV DNS resolution
// uses public resolvers (some local environments point Node's DNS at
// 127.0.0.1, which cannot resolve SRV records).
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

export {};
