import { ProductivityService } from "../../apps/api/src/services/productivityService";

export const config = {
  maxDuration: 60,
};

function getSecret(req: any) {
  const header = typeof req.headers?.authorization === "string" ? req.headers.authorization : "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice("bearer ".length);
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get("secret") ?? "";
}

export default async function cronSync(req: any, res: any) {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    res.statusCode = 500;
    res.json({ error: "missing_cron_secret" });
    return;
  }

  const provided = getSecret(req);
  if (provided !== expected) {
    res.statusCode = 401;
    res.json({ error: "unauthorized" });
    return;
  }

  const service = new ProductivityService();
  try {
    const result = await service.syncNow({ initiatedByUserId: "system" });
    res.statusCode = 200;
    res.json({ ok: true, result });
  } catch (e) {
    res.statusCode = 500;
    res.json({ ok: false, error: e instanceof Error ? e.message : "unknown_error" });
  }
}

