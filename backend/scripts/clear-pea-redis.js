#!/usr/bin/env node
import dotenv from "dotenv";
import { createClient } from "redis";

// Load .env from backend folder (the script should be run from repo root or backend/)
dotenv.config();

async function main() {
  const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    console.error(
      "No UPSTASH_REDIS_URL or REDIS_URL found in environment. Set one in backend/.env or export it and retry."
    );
    process.exit(1);
  }

  const client = createClient({ url: redisUrl });
  client.on("error", (err) => console.error("Redis Client Error", err));

  try {
    await client.connect();
    console.log("Connected to Redis, scanning for app keys...");

    const patterns = ["conversation:*", "profile:*"];
    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (!keys || keys.length === 0) {
        console.log(`No keys found for pattern ${pattern}`);
        continue;
      }

      console.log(`Found ${keys.length} keys for pattern ${pattern}. Deleting...`);

      // Delete in chunks to avoid argument list limits
      const chunkSize = 500;
      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        await client.del(...chunk);
        console.log(`Deleted ${chunk.length} keys`);
      }
    }

    console.log("Done. Disconnected from Redis.");
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error clearing Redis keys:", err);
    try {
      await client.disconnect();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

main();
