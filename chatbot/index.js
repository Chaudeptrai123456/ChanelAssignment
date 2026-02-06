import express from "express";
import axios from "axios";
import cors from "cors";
import http from "http";
import crypto from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { WebSocketServer } from "ws";

const app = express();
app.use(cors());
app.use(express.json());

// ==========================
// HTTP keep-alive
// ==========================
const agent = new http.Agent({ keepAlive: true });

// ==========================
// LocalAI client
// ==========================
const localAI = axios.create({
  baseURL: "http://localhost:8080/v1",
  httpAgent: agent,
  timeout: 120000,
});

// Chat model
const CHAT_MODEL = "meta-llama-3.1-8b-instruct";
// Embedding model
const EMBEDDING_MODEL = "qwen3-embedding-0.6b";

// ==========================
// Qdrant client
// ==========================
const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

const COLLECTION = "chat_memory";

// ==========================
// System prompt
// ==========================
const SYSTEM_PROMPT = {
  role: "system",
  content: "You are a helpful AI assistant. Answer briefly and clearly.",
};

// ==========================
// Init Qdrant collection (chạy 1 lần)
// ==========================
async function initQdrant() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.find((c) => c.name === COLLECTION);

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: 1024,
        distance: "Cosine",
      },
      payload_schema: {
        anonymousId: { type: "keyword" },
        role: { type: "keyword" },
        timestamp: { type: "integer" },
      },
    });

    console.log("✅ Qdrant collection created with payload schema");
  }
}

initQdrant();

// ==========================
// Embedding function
// ==========================
async function embed(text) {
  const res = await localAI.post("/embeddings", {
    model: EMBEDDING_MODEL,
    input: text,
  });

  return res.data.data[0].embedding;
}

// ==========================
// Save memory
// ==========================
async function saveMemory({ anonymousId, role, content }) {
  const vector = await embed(content);

  await qdrant.upsert(COLLECTION, {
    points: [
      {
        id: crypto.randomUUID(),
        vector,
        payload: {
          anonymousId,
          role,
          content,
          timestamp: Date.now(),
        },
      },
    ],
  });
}

// ==========================
// Load relevant history
// ==========================
async function loadHistory(anonymousId, message) {
  const vector = await embed(message);

  const result = await qdrant.search(COLLECTION, {
    vector,
    limit: 5,
    score_threshold: 0.75,
    filter: {
      must: [
        {
          key: "anonymousId",
          match: { value: anonymousId },
        },
      ],
    },
  });

  return result.map((p) => ({
    role: p.payload.role,
    content: p.payload.content,
  }));
}

// ==========================
// Chat API
// ==========================
app.post("/chat", async (req, res) => {
  const { message, anonymousId } = req.body;

  if (!message || !anonymousId) {
    return res.status(400).json({ error: "Missing message or anonymousId" });
  }

  try {
    // 1️⃣ Load memory
    const history = await loadHistory(anonymousId, message);

    // 2️⃣ Call LocalAI
    const response = await localAI.post("/chat/completions", {
      model: CHAT_MODEL,
      messages: [SYSTEM_PROMPT, ...history, { role: "user", content: message }],
      temperature: 0.6,
      max_tokens: 300,
    });

    const reply = response.data.choices[0].message.content;

    // 3️⃣ Save memory
    await saveMemory({
      anonymousId,
      role: "user",
      content: message,
    });

    await saveMemory({
      anonymousId,
      role: "assistant",
      content: reply,
    });

    res.json({ reply });
  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);
    res.status(500).json({ error: "AI error" });
  }
});
async function streamChat({ messages, onToken }) {
  const res = await localAI.post(
    "/chat/completions",
    {
      model: CHAT_MODEL,
      messages,
      temperature: 0.6,
      stream: true,
    },
    { responseType: "stream" },
  );

  res.data.on("data", (chunk) => {
    const lines = chunk
      .toString()
      .split("\n")
      .filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.replace("data: ", "");
      if (data === "[DONE]") return;

      const json = JSON.parse(data);
      const token = json.choices?.[0]?.delta?.content;
      if (token) onToken(token);
    }
  });
}

// ==========================

const server = http.createServer(app);

const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  console.log("🟢 Client connected");

  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type !== "chat") return;

      const { message, anonymousId } = data;

      // 1️⃣ load memory
      const history = await loadHistory(anonymousId, message);

      const messages = [
        SYSTEM_PROMPT,
        ...history,
        { role: "user", content: message },
      ];

      let fullReply = "";

      // 2️⃣ stream AI
      await streamChat({
        messages,
        onToken: (token) => {
          fullReply += token;
          ws.send(
            JSON.stringify({
              type: "token",
              content: token,
            }),
          );
        },
      });

      // 3️⃣ save memory
      await saveMemory({ anonymousId, role: "user", content: message });
      await saveMemory({
        anonymousId,
        role: "assistant",
        content: fullReply,
      });

      ws.send(JSON.stringify({ type: "done" }));
    } catch (err) {
      console.error("❌ WS error:", err.message);
      ws.send(JSON.stringify({ type: "error", message: "AI error" }));
    }
  });

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});
server.listen(3000, () => {
  console.log("🚀 HTTP + WebSocket server running at http://localhost:3000");
});
