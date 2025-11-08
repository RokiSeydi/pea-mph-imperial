import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "redis";
import PEA_SYSTEM_PROMPT from "./peaSystemPrompt.js";
import SPECIALIST_REGISTRY from "./specialists.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
// Initialize Redis client
let redis;
let redisInitializing = false;
let redisInitialized = false;

async function initRedis() {
  if (redisInitialized || redisInitializing) return redis;

  redisInitializing = true;
  try {
    // Use UPSTASH_REDIS_URL if available, fall back to REDIS_URL
    const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

    if (!redisUrl) {
      console.log(
        "⚠️  No UPSTASH_REDIS_URL or REDIS_URL found - conversations will not persist"
      );
      redisInitializing = false;
      return null;
    }

    redis = createClient({
      url: redisUrl,
    });

    redis.on("error", (err) => console.error("Redis Client Error", err));
    redis.on("connect", () => console.log("✅ Redis connected"));

    await redis.connect();
    redisInitialized = true;
    redisInitializing = false;
    return redis;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    console.log("⚠️  Running without Redis - conversations will not persist");
    redisInitializing = false;
    return null;
  }
}

// Initialize Redis on startup (for non-serverless)
if (!process.env.VERCEL) {
  initRedis();
}

// Detect serverless environment (Vercel sets VERCEL=1)
const isServerless = Boolean(process.env.VERCEL);

// Specialist Registry
// REPLACE THE SPECIALIST_REGISTRY IN YOUR BACKEND WITH THIS:

// UPDATED SPECIALIST REGISTRY - MORE CREDIBLE WITH KCL TIES

// Helper functions for Redis storage
async function getConversation(conversationId) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return [];
  try {
    const data = await redis.get(`conversation:${conversationId}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting conversation:", error);
    return [];
  }
}

async function saveConversation(conversationId, messages) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return;
  try {
    // Store with 7-day TTL (in seconds)
    await redis.setEx(
      `conversation:${conversationId}`,
      60 * 60 * 24 * 7, // 7 days
      JSON.stringify(messages)
    );
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}

async function getUserProfile(conversationId) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis)
    return { exchangeCount: 0, recommendedProviders: null, pronouns: null };
  try {
    const data = await redis.get(`profile:${conversationId}`);
    return data
      ? JSON.parse(data)
      : {
          exchangeCount: 0,
          recommendedProviders: null,
          pronouns: null,
        };
  } catch (error) {
    console.error("Error getting profile:", error);
    return {
      exchangeCount: 0,
      recommendedProviders: null,
      pronouns: null,
    };
  }
}

async function saveUserProfile(conversationId, profile) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return;
  try {
    const serialized = JSON.stringify(profile);
    console.log("💾 Saving profile to Redis:", {
      conversationId,
      profileKeys: Object.keys(profile),
      recommendedProvidersCount: profile.recommendedProviders?.length || 0,
      recommendedProviderIds:
        profile.recommendedProviders?.map((p) => p?.id) || [],
      serializedLength: serialized.length,
    });
    // Store with 7-day TTL (in seconds)
    await redis.setEx(
      `profile:${conversationId}`,
      60 * 60 * 24 * 7, // 7 days
      serialized
    );
  } catch (error) {
    console.error("Error saving profile:", error);
  }
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running",
    providersCount: Object.keys(SPECIALIST_REGISTRY).length,
  });
});

// Load conversation history (for page refresh)
app.post("/api/load-conversation", async (req, res) => {
  try {
    const { conversationId } = req.body;

    // Get main Pea conversation
    const messages = await getConversation(conversationId);

    // Get user profile (for recommended providers)
    const profile = await getUserProfile(conversationId);

    console.log("🔍 Profile from Redis:", {
      conversationId,
      hasProfile: !!profile,
      recommendedProviders: profile.recommendedProviders,
      providerCount: profile.recommendedProviders?.length || 0,
      exchangeCount: profile.exchangeCount,
    });

    // Get all provider conversations
    const providerConversations = {};
    if (
      profile.recommendedProviders &&
      profile.recommendedProviders.length > 0
    ) {
      for (const provider of profile.recommendedProviders) {
        const providerConvKey = `${conversationId}-${provider.id}`;
        const providerMessages = await getConversation(providerConvKey);
        if (providerMessages.length > 0) {
          providerConversations[provider.id] = providerMessages;
        }
      }
    }

    res.json({
      messages: messages || [],
      recommendedProviders: profile.recommendedProviders || [],
      providerConversations: providerConversations,
    });
  } catch (error) {
    console.error("Error loading conversation:", error);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// Streaming chat endpoint with specialist recommendations
app.post("/api/stream-chat", async (req, res) => {
  const { conversationId, message } = req.body;

  if (!message || !conversationId) {
    return res.status(400).json({ error: "Missing conversationId or message" });
  }

  // Get or create conversation history and profile from KV
  let conversation = await getConversation(conversationId);
  let profile = await getUserProfile(conversationId);

  console.log("💬 Conversation loaded:", {
    conversationId,
    messageCount: conversation.length,
    userMessages: conversation.filter((m) => m.role === "user").length,
    lastMessages: conversation
      .slice(-3)
      .map((m) => ({ role: m.role, preview: m.content?.substring(0, 50) })),
  });

  // Fix for existing conversations: sync exchangeCount with actual message history
  // Count user messages (exchanges) in the conversation history
  const actualUserMessageCount = conversation.filter(
    (m) => m.role === "user"
  ).length;

  // If profile counter is way behind actual conversation, catch it up
  if (actualUserMessageCount > profile.exchangeCount) {
    console.log(
      `🔄 Syncing exchangeCount: ${profile.exchangeCount} → ${actualUserMessageCount}`
    );
    profile.exchangeCount = actualUserMessageCount;
  }

  conversation.push({ role: "user", content: message });
  profile.exchangeCount += 1;

  // Save profile with updated exchange count
  await saveUserProfile(conversationId, profile);

  // Set SSE headers
  // If we're in a serverless environment (Vercel) we cannot reliably use long-lived SSE streams.
  if (isServerless) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        system: PEA_SYSTEM_PROMPT,
        messages: conversation.filter((m) => m.content && m.content.trim()),
        max_tokens: 2048,
      });

      const assistantText = Array.isArray(response?.content)
        ? response.content.map((c) => c.text || "").join("")
        : response?.content?.text || "";

      // Save complete response to conversation history
      conversation.push({ role: "assistant", content: assistantText });
      await saveConversation(conversationId, conversation);

      // SERVERLESS-SAFE BEHAVIOR
      // On Vercel we avoid performing another potentially long-running
      // LLM call for recommendations. Instead, return the assistant text
      // quickly and only include any already-stored recommendations from the
      // user's profile. If none exist, return an empty array and defer
      // recommendation work to a background job or later request.

      let shouldShowProviders = false;
      let recommendedProviders = profile.recommendedProviders || [];

      if (recommendedProviders && recommendedProviders.length > 0) {
        shouldShowProviders = true;
      } else {
        // No stored recommendations — log and skip synchronous recommendation.
        console.log(
          "ℹ️ Skipping synchronous recommendation in serverless mode. To get recommendations, run recommendation logic in a background job or on-demand endpoint."
        );
      }

      return res.json({
        message: assistantText,
        shouldShowProviders,
        recommendedProviders,
      });
    } catch (err) {
      console.error("Serverless chat error:", err);
      return res.status(500).json({ error: err.message || "Unknown error" });
    }
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send a comment to keep connection alive
  res.write(": connected\n\n");

  try {
    // Create Anthropic stream
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      system: PEA_SYSTEM_PROMPT,
      messages: conversation.filter((m) => m.content && m.content.trim()),
      max_tokens: 2048,
    });

    let fullResponse = "";

    // Process each chunk
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const text = event.delta.text;
        fullResponse += text;

        // Send the text chunk
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Save complete response to conversation history
    conversation.push({ role: "assistant", content: fullResponse });
    await saveConversation(conversationId, conversation);

    // Check if we should recommend specialists
    let shouldShowProviders = false;
    let recommendedProviders = [];

    // Helper: Check if Pea has mentioned care team in conversation
    const peaMentionedCareTeam = (conversation) => {
      const peaMessages = conversation
        .filter((m) => m.role === "assistant")
        .map((m) => m.content.toLowerCase())
        .join(" ");

      const careTeamKeywords = [
        "care team",
        "support team",
        "team suggestion",
        "specialists",
        "introduce you to",
        "meet some people",
        "build a team",
        "putting together",
        "mentorship team",
        "mentorship connections",
        "connect you with",
        "connecting you with",
        "make some introductions",
        "want to connect you",
        "add them to",
        "part of your",
        "chat with her",
        "chat with him",
        "chat with them",
      ];

      return careTeamKeywords.some((keyword) => peaMessages.includes(keyword));
    };

    // Helper: Detect if user is expressing interest in help/support
    // ONLY counts as interest if Pea already mentioned care team
    const userWantsHelp = (message) => {
      const lower = message.toLowerCase();
      const helpKeywords = [
        "yes",
        "yeah",
        "sure",
        "okay",
        "ok",
        "sounds good",
        "that would be great",
        "would love",
        "let's do it",
        "i'm interested",
      ];
      return helpKeywords.some((keyword) => lower.includes(keyword));
    };

    // Helper: Detect high gravity (multiple stressors)
    // Now requires BOTH high gravity AND sufficient exchanges
    const detectHighGravity = (conversation) => {
      const allMessages = conversation
        .map((m) => m.content)
        .join(" ")
        .toLowerCase();
      const stressors = [
        "pain",
        "stress",
        "anxiety",
        "burnout",
        "overwhelm",
        "exhausted",
        "struggling",
        "difficult",
        "hard",
        "can't cope",
        "too much",
        "pressure",
        "chronic",
        "flare",
        "migraine",
        "insomnia",
        "panic",
      ];
      const matchedStressors = stressors.filter((s) => allMessages.includes(s));
      return matchedStressors.length >= 3;
    };

    const userMessage = conversation[conversation.length - 1].content;
    const hasMentionedCareTeam = peaMentionedCareTeam(conversation);
    const highGravity = detectHighGravity(conversation);
    const userExpressedInterest = userWantsHelp(userMessage);

    console.log(
      `📊 Provider check: exchangeCount=${
        profile.exchangeCount
      }, hasRecommendations=${!!profile.recommendedProviders}, highGravity=${highGravity}, userInterest=${userExpressedInterest}, peaMentionedTeam=${hasMentionedCareTeam}`
    );

    // Trigger recommendations ONLY if:
    // 1. User expressed interest AND Pea already mentioned care team
    // 2. OR high gravity detected AND at least 3+ exchanges (give some time but not too much)
    // 3. OR after 5+ messages as final fallback (earlier than before)
    // 4. OR if Pea mentioned team even without explicit user agreement
    const shouldTrigger =
      !profile.recommendedProviders &&
      ((userExpressedInterest && hasMentionedCareTeam) ||
        (hasMentionedCareTeam && profile.exchangeCount >= 2) ||
        (highGravity && profile.exchangeCount >= 3) ||
        profile.exchangeCount >= 5);

    // If providers already exist, always show them (stay persistent)
    if (profile.recommendedProviders) {
      console.log("✅ Showing existing providers (persistent view)");
      recommendedProviders = profile.recommendedProviders;
      shouldShowProviders = true;
    } else if (shouldTrigger) {
      try {
        console.log(
          "🔍 Analyzing conversation for provider recommendations..."
        );

        // Build conversation summary
        const conversationSummary = conversation
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n");

        // Ask Claude to recommend providers from actual registry
        const registryIds = Object.keys(SPECIALIST_REGISTRY);
        const registryFormatted = registryIds
          .map((id) => {
            const specialist = SPECIALIST_REGISTRY[id];
            return `- ${id}: ${specialist.specialty} | ${specialist.bio?.substring(0, 60)}...`;
          })
          .join("\n");

        const recommendationResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          system: `You are an expert at matching MPH students with experienced healthcare mentors and specialists.

RULE: Recommend 1-2 specialists if there is a GOOD match between the student's interests and the specialist's expertise.
If NO good match exists, respond with: none

Only use specialist IDs that are provided below. NEVER invent IDs.`,
          messages: [
            {
              role: "user",
              content: `Based on this conversation, who should this person talk to?

Conversation:
${conversationSummary}

Available specialists:
${registryFormatted}

RESPOND WITH ONLY: comma-separated specialist ID(s) or "none" if no good match.
Example valid responses:
- michelle-louisor,jean-sim
- anna-yakusik
- none`,
            },
          ],
        });

        // Log the full raw recommendation response for debugging
        console.log("🧾 Raw recommendation response:", JSON.stringify(recommendationResponse));

        // Safely extract the text from potential response shapes
        let recText = "";
        try {
          if (Array.isArray(recommendationResponse?.content) && recommendationResponse.content[0]) {
            recText = (recommendationResponse.content[0].text || "").toString();
          } else if (typeof recommendationResponse?.content === "string") {
            recText = recommendationResponse.content;
          } else if (Array.isArray(recommendationResponse?.content)) {
            recText = recommendationResponse.content.map((c) => c.text || "").join(" ");
          } else {
            recText = String(recommendationResponse?.content || "");
          }
        } catch (e) {
          console.warn("Could not parse recommendationResponse content:", e);
          recText = "";
        }

        recText = recText.trim().toLowerCase();

        if (!recText || recText === "none") {
          console.log("ℹ️ Recommendation returned no providers (none or empty)");
        }

        const recommendedIds = recText
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0 && id !== "none");

        console.log("💡 Recommended provider IDs:", recommendedIds);

        // Validate IDs are in registry
        const validIds = recommendedIds.filter((id) => {
          const exists = !!SPECIALIST_REGISTRY[id];
          if (!exists) {
            console.warn(`⚠️  Provider ID not found in registry: ${id}`);
          }
          return exists;
        });

        console.log("✅ Valid provider IDs after validation:", validIds);

        // Get full provider objects
        recommendedProviders = validIds.map((id) => SPECIALIST_REGISTRY[id]);

        // Store recommendations
        if (recommendedProviders.length > 0) {
          profile.recommendedProviders = recommendedProviders;
          shouldShowProviders = true;
          await saveUserProfile(conversationId, profile);
          console.log(
            "✅ Providers recommended:",
            recommendedProviders.map((p) => p.name)
          );
        } else {
          // Clear previous recommendations if no good match found
          profile.recommendedProviders = null;
          shouldShowProviders = false;
          await saveUserProfile(conversationId, profile);
          console.log("✅ No good specialist match - providers cleared");
        }
      } catch (error) {
        console.error("❌ Error getting recommendations:", error);
        // Continue without recommendations if this fails
      }
    }

    // Send metadata with completion
    res.write(
      `data: ${JSON.stringify({
        done: true,
        shouldShowProviders,
        recommendedProviders: profile.recommendedProviders || [],
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Provider-specific chat endpoint
// ADD THIS TO YOUR BACKEND (server.js or index.js)
// ADD THIS NEW ENDPOINT AFTER YOUR /api/stream-chat ENDPOINT:

// Provider-specific chat endpoint
app.post("/api/provider-chat", async (req, res) => {
  const { conversationId, providerId, message } = req.body;

  if (!message || !conversationId || !providerId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Get provider from registry
  const provider = SPECIALIST_REGISTRY[providerId];
  if (!provider) {
    return res.status(404).json({ error: "Provider not found" });
  }

  // Get or create conversation history for this provider
  const providerConvKey = `${conversationId}-${providerId}`;
  let providerConversation = await getConversation(providerConvKey);

  // CRITICAL: If this is the first message to this provider, get context from main Pea conversation
  if (providerConversation.length === 0) {
    const mainConversation = await getConversation(conversationId);

    // Create a context summary from Pea conversation
    if (mainConversation.length > 0) {
      const contextSummary = mainConversation
        .filter((msg) => msg.role === "user") // Only user messages to understand their situation
        .map((msg) => msg.content)
        .join("\n");

      // Add system context as first message
      providerConversation.push({
        role: "user",
        content: `[Context from Pea: The person you're talking to has shared the following with Pea:\n\n${contextSummary}\n\nNow they're reaching out to you specifically for help with ${provider.specialty.toLowerCase()}. Be warm and acknowledge what they've been dealing with.]`,
      });

      // Add a system acknowledgment so the provider knows to reference it
      providerConversation.push({
        role: "assistant",
        content: `Got it - I understand the context. I'll be warm and reference what they've shared.`,
      });
    }
  }

  providerConversation.push({ role: "user", content: message });

  try {
    // Use provider-specific system prompt with conciseness override
    const enhancedSystemPrompt = `${provider.prompt}

---
CRITICAL CONVERSATION GUIDELINES:
- Keep responses SHORT: 2-4 sentences max per turn
- Ask ONE question at a time, or none if answering their question
- Be natural and conversational, not an info-dump
- Listen more than you lecture
- Only share relevant info when directly asked
- Avoid listing everything you can help with upfront
- Let the person lead; respond to what they actually ask

Remember: This is a chat, not a FAQ.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      system: enhancedSystemPrompt,
      messages: providerConversation.filter(
        (m) => m.content && m.content.trim()
      ),
      max_tokens: 2048,
    });

    const assistantText = Array.isArray(response?.content)
      ? response.content.map((c) => c.text || "").join("")
      : response?.content?.text || "";

    // Save response
    providerConversation.push({ role: "assistant", content: assistantText });
    await saveConversation(providerConvKey, providerConversation);

    return res.json({
      message: assistantText,
      provider: {
        id: provider.id,
        name: provider.name,
        specialty: provider.specialty,
      },
    });
  } catch (error) {
    console.error("Provider chat error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// Save/update a user's profile (safe partial update)
app.post("/api/set-profile", async (req, res) => {
  const { conversationId, profile } = req.body;
  if (!conversationId || !profile) {
    return res.status(400).json({ error: "Missing conversationId or profile" });
  }

  try {
    const existing = (await getUserProfile(conversationId)) || {};
    const merged = { ...existing, ...profile };
    await saveUserProfile(conversationId, merged);
    return res.json({ profile: merged });
  } catch (err) {
    console.error("Failed to set profile:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
});

// EXPLANATION OF THE FIX:
// When a user first chats with a provider, we now:
// 1. Check if this is their first message to this provider (empty conversation history)
// 2. If yes, get the main Pea conversation history
// 3. Extract all user messages (their actual situation/struggles)
// 4. Pass this as context to the provider
// 5. Provider can now reference what the user shared with Pea
//
// This way when Sarah says "Pea filled me in", she actually HAS been filled in!

// Get all providers endpoint (optional, for debugging)
// app.get("/api/providers", (req, res) => {
// Specialist registry is imported from ./specialists.js

// Start server (only for local development)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(
      `✅ API Key configured: ${process.env.ANTHROPIC_API_KEY ? "Yes" : "No"}`
    );
    console.log(
      `✅ Providers loaded: ${Object.keys(SPECIALIST_REGISTRY).length}`
    );
  });
}

// EXPORT FOR VERCEL: one request at a time
export default function handler(req, res) {
  return app(req, res);
}
