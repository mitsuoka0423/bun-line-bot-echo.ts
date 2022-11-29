import { Hono } from "hono";
import {
  Client,
  WebhookEvent,
  WebhookRequestBody,
} from "@line/bot-sdk";
import { serveStatic } from "hono/serve-static.bun";

const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
if (!channelAccessToken)
  throw new Error("チャンネルアクセストークンを入力してください。");

const channelSecret = process.env.CHANNEL_SECRET;
if (!channelSecret)
  throw new Error("チャンネルシークレットを入力してください。");

const clientConfig = {
  channelAccessToken,
  channelSecret,
};

const client = new Client(clientConfig);

const port = parseInt(process.env.PORT) || 3000;

const app = new Hono();

app.use("/favicon.ico", serveStatic({ path: "./public/favicon.ico" }));

app.get("/", (c) => {
  return c.json({ message: "Hello World!" });
});

const textEventHandler = async (event: WebhookEvent): Promise<Response> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const { replyToken } = event;
  const { text } = event.message;

  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });
};

app.post("/webhook", async (c) => {
  try {
    const webhookRequestBody: WebhookRequestBody = await c.req.json();

    const promises = webhookRequestBody.events.map(
      async (event: WebhookEvent) => {
        return textEventHandler(event);
      }
    );

    await Promise.all(promises);
    return c.json({ message: "ok!" });
  } catch (e) {
    console.error(e);
    return c.json({ message: "Internal Server Error" }, 500);
  }
});

console.log(`Running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
