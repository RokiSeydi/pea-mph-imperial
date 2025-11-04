import redis from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

async function clearCache() {
  try {
    await redisClient.connect();
    console.log("📡 Connected to Redis");

    // Get conversation ID from command line argument
    const conversationId = process.argv[2];

    if (!conversationId) {
      console.log("Usage: node clear-cache.js <conversationId> [--all]\n");
      console.log("Examples:");
      console.log("  node clear-cache.js conv-1762274552034");
      console.log(
        "  node clear-cache.js conv-1762274552034 --all  (clears all related keys)"
      );
      console.log("\nOr use --all-conversations to clear everything:");
      console.log("  node clear-cache.js --all-conversations");
      await redisClient.quit();
      return;
    }

    if (conversationId === "--all-conversations") {
      const keys = await redisClient.keys("*");
      if (keys.length === 0) {
        console.log("✅ Cache is already empty");
      } else {
        await redisClient.del(keys);
        console.log(`✅ Cleared ${keys.length} keys from Redis`);
      }
    } else {
      const allFlag = process.argv[3] === "--all";

      if (allFlag) {
        // Clear main conversation, profile, and all specialist-specific chats
        const keys = await redisClient.keys(`${conversationId}*`);
        if (keys.length === 0) {
          console.log(`✅ No cache found for ${conversationId}`);
        } else {
          await redisClient.del(keys);
          console.log(`✅ Cleared ${keys.length} keys for ${conversationId}:`);
          keys.forEach((key) => console.log(`   - ${key}`));
        }
      } else {
        // Clear just the profile and main conversation
        const profileKey = `profile:${conversationId}`;
        const conversationKey = `conversation:${conversationId}`;

        const profileDeleted = await redisClient.del(profileKey);
        const conversationDeleted = await redisClient.del(conversationKey);

        console.log(`✅ Cleared cache for ${conversationId}:`);
        if (profileDeleted > 0) console.log(`   - ${profileKey}`);
        if (conversationDeleted > 0) console.log(`   - ${conversationKey}`);
        if (profileDeleted === 0 && conversationDeleted === 0) {
          console.log("   - No keys found");
        }
      }
    }

    await redisClient.quit();
  } catch (error) {
    console.error("❌ Error clearing cache:", error.message);
    process.exit(1);
  }
}

clearCache();
