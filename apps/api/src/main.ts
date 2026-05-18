import "dotenv/config";
import express from "express";
import { env } from "./lib/env";
import { createApp } from "./app";

const api = createApp();
const app = express();

app.use("/api", api);

app.listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT}`);
});
