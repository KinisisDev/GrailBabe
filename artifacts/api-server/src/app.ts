import "./loadEnv";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { entraAuthMiddleware } from "./middlewares/entraAuth";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import * as inngestFunctions from "./inngest/functions";
import {
  rateLimitMiddleware,
  generalRateLimit,
} from "./middleware/rateLimit";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        req.log.error("Stripe webhook body is not a Buffer");
        res.status(500).json({ error: "Webhook processing error" });
        return;
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      req.log.error({ err: error }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.use(rateLimitMiddleware(generalRateLimit));

app.use(entraAuthMiddleware());

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: Object.values(inngestFunctions),
  }),
);

app.use("/api", router);

export default app;
