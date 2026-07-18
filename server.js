// Custom Next.js server entry.
// IMPORTANT: dns.setServers MUST run before anything else (including next)
// so that the mongodb+srv SRV lookup uses public resolvers. Some local
// environments point Node's DNS resolver at 127.0.0.1, which cannot resolve
// SRV records. On Vercel / normal networks this is a harmless no-op.
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  console.log("[server] DNS servers set:", dns.getServers().join(","));
} catch (e) {
  console.log("[server] dns.setServers failed:", e.message);
}

const next = require("next");
const http = require("http");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      handle(req, res);
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
