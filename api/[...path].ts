import serverless from "serverless-http";
import { createApp } from "../apps/api/src/app";

const app = createApp();
const handler = serverless(app);

export default async function vercelHandler(req: any, res: any) {
  return handler(req, res);
}

