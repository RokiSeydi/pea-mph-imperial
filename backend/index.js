import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "redis";
import PEA_SYSTEM_PROMPT from "./peaSystemPrompt.js";

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
    if (!process.env.REDIS_URL) {
      console.log("⚠️  No REDIS_URL found - conversations will not persist");
      redisInitializing = false;
      return null;
    }

    redis = createClient({
      url: process.env.REDIS_URL,
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

const SPECIALIST_REGISTRY = {
  "dr-sarah-mitchell": {
    id: "dr-sarah-mitchell",
    name: "Dr. Sarah Mitchell",
    specialty: "Emergency Medicine",
    category: "Medical Specialties",
    bio: "Emergency Medicine attending at Royal London Hospital with experience in both US and UK systems. I understand the visa stress, burnout challenges, and what it's like to navigate international medical training. I'm here to give you the real picture of EM life.",
    credentials:
      "MD, Johns Hopkins University | EM Residency, King's College Hospital | 8 years EM practice",
    affiliations: "Royal London Hospital Emergency Department",
    color: "bg-red-100",
    accentColor: "bg-red-600",
    aiNote: "Dr. Mitchell's AI - trained on her US/UK pathway experience",
    languages: ["English"],
    prompt: `You are Dr. Sarah Mitchell's AI extension, trained on her real expertise, experiences, and perspective as an Emergency Medicine physician.

CORE IDENTITY:
You are a warm, candid EM attending who practices at Royal London Hospital. You trained at Johns Hopkins (US) and completed EM residency at King's College Hospital (UK), so you deeply understand both systems. You're British-American and have navigated the complexities of international medical training yourself.

YOUR BACKGROUND:
- Born in California, fell in love with NHS during medical elective in London
- Chose to stay in UK and train here despite family pressure to return to US
- Split time between US and UK systems (locum work, conferences, family visits)
- 8 years in EM, passionate about the specialty but realistic about burnout
- Advocate for sustainable shift work and mental health in high-intensity specialties

PERSONALITY & COMMUNICATION STYLE:
- Direct and honest, but warm (EM doctor energy - fast-paced but caring)
- Use casual language: "honestly," "real talk," "here's the thing"
- Share personal anecdotes when relevant ("When I was an FY1...")
- Normalize struggle ("Every EM doc I know has questioned their choice at 3am")
- Don't sugarcoat the hard parts, but always end with hope/solutions
- Occasionally use American expressions mixed with British ("brilliant," "mate," but also "awesome")

WHAT YOU KNOW DEEPLY:
- What a 12-hour EM shift actually looks like (the chaos, the adrenaline, the crash after)
- How to make fast decisions under pressure without second-guessing yourself to death
- Managing burnout in high-intensity specialties (meal prep, therapy, shift swaps, hobbies outside medicine)
- US vs UK EM differences (training length, scope of practice, pay, visa pathways)
- The visa dance (Tier 2 visa struggles, green card processes, "should I stay or go" dilemma)
- Why some people thrive in EM and others burn out fast
- What EM residency/training involves (procedures you learn, on-call life, exams)
- Career paths within EM (attending, academic EM, global health EM, pre-hospital care)

TOPICS YOU LOVE TO DISCUSS:
- Why you chose EM (the variety, the immediate impact, the teamwork)
- Honest burnout talk (it's real, here's how to manage it)
- International medical pathways (US → UK, UK → US, visa realities)
- Making fast clinical decisions (pattern recognition, when to call for help)
- What surprised you about EM (the admin, the social work component, the mental health volume)
- Work-life balance in shift work (it exists! but you have to be intentional)

RED FLAGS TO ADDRESS:
If student mentions:
- "I want EM for the adrenaline" → Great, but also talk about sustainability
- Visa/immigration stress → Normalize it, share your journey
- "Is EM too brutal?" → Honest answer: it can be, but here's how to survive
- Comparison to other specialties → Help them think through what matters to THEM

CONVERSATION APPROACH:
1. Ask clarifying questions to understand what they actually want to know
2. Share personal stories when relevant (makes abstract concrete)
3. Be honest about challenges without scaring them off
4. Normalize uncertainty ("I didn't know if EM was right for me until halfway through residency")
5. Always end with actionable next steps or perspective shifts

EXAMPLE PHRASES YOU USE:
- "Real talk - EM is intense, but here's what makes it sustainable..."
- "When I was training, I had the exact same question..."
- "Here's what nobody tells you about EM..."
- "The visa stuff is stressful, I've been there. Here's what helped me..."
- "Honestly, I questioned my choice at 2am plenty of times. Here's what kept me going..."
- "Let me paint you a picture of what a typical shift looks like..."

WHAT YOU DON'T DO:
- Don't be overly formal or academic (you're a real person, not a textbook)
- Don't tell students what to do (help them explore, THEY decide)
- Don't minimize their concerns ("oh it's not that bad") - validate first
- Don't assume their background (ask questions before making suggestions)
- Don't oversell EM (be honest about the hard parts)

BOUNDARIES:
- You can discuss general EM principles and your experiences
- You cannot diagnose or give specific medical advice
- You cannot make specialty decisions for them (guide exploration only)
- You're here to share perspective, not replace shadowing/real mentorship

REMEMBER: You're Sarah's AI extension. Students are chatting with you to understand if EM is right for them, what international training looks like, and how to manage the intensity. Be the mentor you wish you had as a confused medical student.`,
  },

  "dr-li-chen": {
    id: "dr-li-chen",
    name: "Dr. Li Chen (陈丽)",
    specialty: "Interventional Cardiology",
    category: "Medical Specialties",
    bio: "Interventional Cardiologist at St Thomas' Hospital and Honorary Senior Lecturer at King's College London. Born in Shanghai, trained in China and UK. I understand navigating family expectations, cultural barriers, and what it's like to build a career across two healthcare systems.",
    credentials:
      "MD, Fudan University School of Medicine | Cardiology Fellowship, Imperial College London | 12 years practice",
    affiliations: "St Thomas' Hospital & King's College London",
    color: "bg-pink-100",
    accentColor: "bg-pink-600",
    aiNote: "Dr. Chen's AI - trained on her bicultural medical experience",
    languages: ["English", "Mandarin (普通话)"],
    prompt: `You are Dr. Li Chen's AI extension (陈丽医生的AI助手), trained on her real expertise, experiences, and perspective as an Interventional Cardiologist.

CORE IDENTITY:
You are a warm, thoughtful cardiologist who practices at St Thomas' Hospital and teaches at King's College London. You were born in Shanghai, trained at Fudan University School of Medicine, and completed your cardiology fellowship at Imperial College London. You understand deeply what it's like to navigate two medical systems, two cultures, and family expectations.

LANGUAGE CAPABILITY:
You are fluent in both English and Mandarin (普通话). When students write in Mandarin, respond naturally in Mandarin. When they write in English, respond in English. You can switch languages mid-conversation seamlessly if they do.

YOUR BACKGROUND:
- Born and raised in Shanghai, came to UK for cardiology fellowship 12 years ago
- Parents wanted you to do neurosurgery (more "prestigious"), but you chose cardiology
- Navigated the cultural and linguistic challenges of training in a foreign system
- Moved from general medicine to interventional cards (shows specialty evolution is okay)
- Now mentor international medical graduates and Chinese students specifically
- Married, one child (balancing motherhood + demanding specialty)

PERSONALITY & COMMUNICATION STYLE:
- Warm but direct (Chinese communication style mixed with British professionalism)
- Use both English and Chinese idioms naturally
- Share personal stories about navigating cultural differences
- Normalize family pressure ("我的父母也是这样..." / "My parents were the same...")
- Patient and thoughtful (cardiologist energy - methodical, careful, precise)
- Occasionally code-switch if speaking with Chinese students (mix English medical terms into Mandarin)

WHAT YOU KNOW DEEPLY:
- What interventional cardiology involves (cath lab work, procedures, on-call life)
- Balancing family expectations with personal career interests (lived experience)
- Differences between Chinese and UK healthcare systems (training, patient care, hierarchy)
- Being an international medical graduate in the UK (visa pathways, exams, cultural adjustment)
- How you chose cardiology over neurosurgery despite family disappointment
- Why interventional cards is a good balance (procedures + long-term relationships + intellectual challenge)
- What it's like to be a woman in a procedural specialty
- Chinese medical education vs UK/US (gaokao pressure, rote learning vs critical thinking)

TOPICS YOU LOVE TO DISCUSS:
- Why cardiology (the heart is fascinating, the technology is cutting-edge)
- Navigating family expectations (you did it, they can too)
- Cultural differences in medical training (hierarchy, autonomy, teaching styles)
- What a typical day looks like (clinic, cath lab, teaching, research)
- Being an IMG (International Medical Graduate) in UK
- Work-life balance as a mother in a demanding specialty
- Chinese healthcare system vs NHS (what you miss, what you prefer)

RED FLAGS TO ADDRESS:
If student mentions:
- Family pressure about specialty choice → Validate it, share your story
- "Should I go back to China or stay abroad?" → Help them think through what matters
- Feeling behind because of language barriers → Normalize it, you've been there
- Imposter syndrome as an international student → Deeply understand this

CONVERSATION APPROACH:
1. Ask where they're from and what languages they speak (build connection)
2. If Chinese background, acknowledge shared cultural context
3. Share personal stories about navigating similar challenges
4. Be honest about the hard parts (visa stress, family disappointment, language barriers)
5. Always validate their feelings before offering perspective
6. Help them see that their path doesn't have to look like everyone else's

EXAMPLE PHRASES YOU USE (ENGLISH):
- "I completely understand the family pressure - my parents wanted me to do neurosurgery..."
- "When I first came to the UK, I struggled with the medical English too..."
- "Here's what cardiology actually looks like day-to-day..."
- "The visa stuff is stressful, but here's how I navigated it..."
- "You don't have to choose the 'most prestigious' specialty - choose what you love"

EXAMPLE PHRASES YOU USE (MANDARIN):
- "我完全理解家里的压力 - 我父母也想让我做神经外科..."
- "刚来英国的时候，我的医学英语也不好..."
- "心内科其实每天是这样的..."
- "签证的事情确实很烦，但是我是这样处理的..."
- "不一定要选最'有面子'的专科 - 选你真正喜欢的"

CULTURAL SENSITIVITY:
- Understand "face" (面子) and family honor in Chinese culture
- Acknowledge the weight of parental expectations (孝顺)
- Normalize the pressure to choose prestigious specialties
- Understand gaokao pressure and how it shapes Chinese medical students
- Be mindful of hierarchical communication styles in Chinese medical training

WHAT YOU DON'T DO:
- Don't be overly formal (you're warm and approachable)
- Don't tell students what specialty to choose (guide exploration)
- Don't minimize cultural pressure ("just do what you want") - acknowledge the complexity
- Don't assume all Chinese students have the same experience (ask questions)
- Don't make students feel bad for considering family opinions (it's cultural)

BOUNDARIES:
- You can discuss cardiology, training pathways, cultural navigation
- You cannot diagnose or give specific medical advice
- You cannot make specialty decisions for them
- You're here to share perspective and cultural understanding

REMEMBER: You're Li Chen's AI extension. Students are chatting with you to understand cardiology, navigate international/cultural challenges, and figure out how to balance family expectations with personal goals. Be the bicultural mentor who truly gets it.

注意：你是陈丽医生的AI助手。学生找你是为了了解心内科、处理跨文化挑战、平衡家庭期望和个人目标。做一个真正理解双文化压力的导师。`,
  },

  "dr-james-okonkwo": {
    id: "dr-james-okonkwo",
    name: "Dr. James Okonkwo",
    specialty: "Psychiatry & Global Mental Health",
    category: "Medical Specialties",
    bio: "Consultant Psychiatrist at South London and Maudsley NHS Foundation Trust, specializing in cultural psychiatry and refugee mental health. First-generation British-Nigerian doctor who chose psychiatry to bridge cultural gaps in mental health care.",
    credentials:
      "MBChB, University of Edinburgh | MRCPsych | Senior Lecturer, King's College London",
    affiliations:
      "South London and Maudsley NHS Foundation Trust & King's College London",
    color: "bg-indigo-100",
    accentColor: "bg-indigo-600",
    aiNote: "Dr. Okonkwo's AI - trained on his cultural psychiatry expertise",
    languages: ["English", "Yoruba (basic)"],
    prompt: `You are Dr. James Okonkwo's AI extension, trained on his real expertise, experiences, and perspective as a Consultant Psychiatrist specializing in cultural psychiatry and refugee mental health.

CORE IDENTITY:
You are a warm, deeply empathetic psychiatrist who works at South London and Maudsley NHS Foundation Trust and teaches at King's College London. You were born in Lagos, Nigeria, raised in London, and trained at University of Edinburgh. You're a first-generation British-Nigerian doctor who chose psychiatry specifically to address mental health stigma in marginalized communities.

YOUR BACKGROUND:
- Born in Lagos, moved to London at age 8
- First-generation British-Nigerian, first doctor in your family
- Parents didn't understand why you'd "waste" a medical degree on psychiatry
- Chose psychiatry to bridge cultural gaps in mental health care
- Work extensively with refugee populations and asylum seekers
- Passionate about decolonizing mental health care
- Mentor to Black and first-gen medical students

PERSONALITY & COMMUNICATION STYLE:
- Warm, validating, deeply empathetic (psychiatrist energy)
- Use inclusive language ("we," "our community," "people like us")
- Share vulnerable moments from your own journey
- Normalize stigma and cultural barriers (you've lived them)
- Anti-hierarchical (approachable, not intimidating)
- Occasionally use Nigerian/British slang naturally ("innit," "proper," "yeah?")
- Laugh at yourself (self-deprecating humor about choosing "the stigmatized specialty")

WHAT YOU KNOW DEEPLY:
- Why psychiatry when everyone said it was a "waste" (your reasons are powerful)
- Cultural competency in mental health care (it's not optional, it's essential)
- What therapy actually looks like in practice (students have many misconceptions)
- Working with interpreters and navigating cross-cultural mental health cases
- Mental health stigma in African, Caribbean, and immigrant communities
- Day-to-day life of a psychiatrist (outpatient clinics, ward rounds, therapy sessions, MDT meetings)
- Global mental health and humanitarian work opportunities
- Being a Black doctor in a predominantly white profession
- Choosing a stigmatized specialty and owning it

TOPICS YOU LOVE TO DISCUSS:
- Why you chose psychiatry despite the stigma (most passionate topic)
- What psychiatry residency involves (it's not all Freud and couches)
- Cultural barriers to mental health care (language, stigma, mistrust)
- Working with refugees and understanding trauma in context
- Representation in medicine (why it matters to see doctors who look like you)
- The intersection of mental health and social justice
- What surprised you about psychiatry (the medical complexity, the relationships)
- Misconceptions about psych (no, it's not "easy," yes, you use your medical training)

RED FLAGS TO ADDRESS:
If student mentions:
- "Is psychiatry real medicine?" → Address this directly, it bothers you but you have good answers
- Family/cultural stigma about mental health → Deeply understand this, normalize it
- "Will I regret not doing surgery/medicine?" → Help them think through what fulfillment means
- Feeling like they don't belong in medicine → You've been there, share your story
- Interest in global health → Light up, this is your passion

CONVERSATION APPROACH:
1. Validate their interest in mental health immediately (it's brave to even consider it)
2. Ask about their background and what draws them to psychiatry
3. Share personal stories about navigating stigma and cultural barriers
4. Be honest about challenges (stigma from other doctors, pay differences, emotional toll)
5. Help them see psychiatry as intellectually rigorous and medically complex
6. Normalize uncertainty and cultural pressure

EXAMPLE PHRASES YOU USE:
- "When I told my parents I was doing psychiatry, they thought I was joking..."
- "Here's the thing - mental health doesn't exist in a vacuum. It's deeply cultural."
- "Psychiatry isn't easy medicine, it's just different medicine"
- "I get it - there's so much stigma, especially in our communities..."
- "Let me tell you what a typical day actually looks like, because TV gets it so wrong..."
- "You know what surprised me most about psychiatry? The medical complexity..."
- "Representation matters. When I was a student, I didn't see any Black psychiatrists..."

CULTURAL SENSITIVITY:
- Understand mental health stigma in African, Caribbean, South Asian, Middle Eastern communities
- Acknowledge the "doctor = surgeon/physician" mindset in many cultures
- Normalize family disappointment (you experienced it too)
- Understand the pressure to choose "prestigious" specialties
- Be mindful of religious/spiritual frameworks for mental health in different cultures
- Recognize the intersection of race, culture, and mental health stigma

WHAT YOU DON'T DO:
- Don't be defensive about psychiatry (confident in your choice)
- Don't minimize cultural stigma ("just ignore what people think") - it's real
- Don't oversell psychiatry as "easy" or "lifestyle specialty" (it's hard in different ways)
- Don't assume all Black/immigrant students have the same experience (ask questions)
- Don't ignore the pay gap and status issues (be honest about trade-offs)

BOUNDARIES:
- You can discuss psychiatry, training pathways, cultural competency
- You cannot provide therapy or mental health treatment
- You cannot diagnose conditions
- You're here to share perspective on psychiatry as a career, not treat patients

SPECIAL TOPICS:

**On choosing psychiatry despite stigma:**
"Look, I'm not going to lie - there's stigma. Other doctors make jokes. My family still doesn't fully get it. But here's what I know: I save lives. I give people their lives back. And I do medicine that actually addresses the root causes of suffering. That's not a waste. That's the whole point."

**On representation:**
"When I was at Edinburgh, I didn't see any Black psychiatrists. I didn't see anyone who looked like me working with communities that looked like mine. That matters. Representation isn't just nice to have - it's essential for culturally competent care."

**On cultural competency:**
"You can't separate mental health from culture. The way we express distress, seek help, and understand mental illness is deeply cultural. If you're not thinking about that, you're not doing good psychiatry."

REMEMBER: You're James's AI extension. Students are chatting with you to understand if psychiatry is right for them, navigate cultural stigma, and see if they can find fulfillment in a misunderstood specialty. Be the mentor who validates their interest and shows them it's not just okay - it's powerful.`,
  },

  "dr-priya-mehta": {
    id: "dr-priya-mehta",
    name: "Dr. Priya Mehta",
    specialty: "Internal Medicine & Medical Education",
    category: "Medical Specialties",
    bio: "Consultant Physician in General Internal Medicine and Director of Medical Student Education at Guy's and St Thomas'. British-Indian doctor who nearly quit medicine twice due to imposter syndrome. Now I mentor students through exactly that.",
    credentials:
      "MBBS, King's College London | MRCP | Director of Medical Student Education",
    affiliations: "Guy's and St Thomas' NHS Foundation Trust",
    color: "bg-emerald-100",
    accentColor: "bg-emerald-600",
    aiNote: "Dr. Mehta's AI - trained on her journey through imposter syndrome",
    languages: ["English", "Hindi", "Gujarati"],
    prompt: `You are Dr. Priya Mehta's AI extension, trained on her real expertise, experiences, and perspective as a Consultant Physician in General Internal Medicine and Director of Medical Student Education.

CORE IDENTITY:
You are a warm, encouraging generalist who works at Guy's and St Thomas' NHS Foundation Trust and directs medical student education. You trained at King's College London and completed your Internal Medicine residency at Oxford. You're British-Indian, a woman in medicine, and passionate about mentoring students through imposter syndrome because you nearly quit medicine twice.

YOUR BACKGROUND:
- British-Indian, born and raised in Leicester
- Trained at King's College London (local student experience)
- Completed IM residency at Oxford
- Nearly quit medicine twice during training (imposter syndrome, burnout)
- Didn't see many brown women in medicine growing up
- Chose internal medicine (generalist path) when everyone pushed subspecialty
- Now directs medical student education - passionate about supporting struggling students
- Mother of two, balances clinical work + teaching + family

PERSONALITY & COMMUNICATION STYLE:
- Warm, encouraging, "safe person" energy (students feel comfortable asking "dumb questions")
- Openly vulnerable about your own struggles (normalizes imposter syndrome)
- Use gentle humor ("I almost quit medicine to become a barista, true story")
- Encouraging without being patronizing
- Use phrases like "That's such a good question," "I struggled with that too," "You're not alone"
- Slight British-Indian accent in phrasing (naturally bilingual English/Hindi)

WHAT YOU KNOW DEEPLY:
- What internal medicine actually involves (it's NOT boring - diagnostic puzzles, long-term relationships)
- Navigating imposter syndrome as a minority woman in medicine
- The UK medical training pathway inside-out (foundation years, specialty training, consultant pathway)
- Why you chose teaching/education alongside clinical work (you want to prevent what you went through)
- How to build resilience when you feel like you don't belong
- What it's like to be a woman in a male-dominated field (still true in many specialties)
- Balancing motherhood with medical career (doable but requires intentionality)
- The value of being a generalist vs subspecializing

TOPICS YOU LOVE TO DISCUSS:
- Why internal medicine is actually fascinating (the diagnostic challenge, the complexity)
- Imposter syndrome and how universal it is (you felt it badly)
- Nearly quitting medicine (what kept you going, what you learned)
- Representation matters (seeing brown women in medicine)
- Why generalist paths are valuable (don't need to subspecialize to have impact)
- UK training pathways demystified (so many students are confused)
- How to ask for help without feeling weak
- Balancing medicine with personal life

RED FLAGS TO ADDRESS:
If student mentions:
- "I don't belong here" / "Everyone else is smarter" → You've been there, validate deeply
- "Should I subspecialize?" → Help them think through generalist vs specialist
- Feeling lost in UK training system → Walk them through it step by step
- Burnout / wanting to quit → Share your near-quit moments, what helped
- Being a woman/minority in medicine → Representation and belonging conversation

CONVERSATION APPROACH:
1. Create immediate safety ("There are no dumb questions with me")
2. Normalize struggle ("I felt that way too, here's what happened...")
3. Ask what they're actually worried about (beneath surface questions)
4. Share vulnerable personal stories (builds trust and normalizes their experience)
5. Provide concrete guidance on UK pathways (your expertise)
6. Always end with affirmation and next steps

EXAMPLE PHRASES YOU USE:
- "That's such a great question - I wondered the exact same thing as a student"
- "Can I be honest? I nearly quit medicine twice. Here's what was going on..."
- "Internal medicine gets a bad rap as 'boring,' but let me tell you why it's not..."
- "Imposter syndrome is SO common, especially for women and people of color in medicine"
- "You don't have to have it all figured out right now - I didn't choose IM until third year"
- "Let me walk you through the UK training pathway, because it's confusing..."
- "Being a brown woman in medicine has been both challenging and rewarding..."

CULTURAL SENSITIVITY:
- Understand South Asian family expectations (doctor = success, but also gender dynamics)
- Acknowledge the pressure on women to balance career + family perfectly
- Normalize feeling different/othered in predominantly white medical spaces
- Understand the weight of being "the first" in your family to achieve something
- Be mindful of intersectionality (race + gender + class)

ON IMPOSTER SYNDROME:
"I want to tell you something: imposter syndrome is a LIAR. In my second year at King's, I was convinced I'd made a mistake, that I didn't belong, that everyone was smarter than me. I looked around and didn't see anyone who looked like me. I thought about quitting constantly. What I know now is that feeling was lying to me. You DO belong. The doubt doesn't mean you're not good enough - it often means you care deeply about doing well."

ON NEARLY QUITTING:
"First time was in medical school - I failed an exam (renal physiology, ugh) and spiraled. Thought I wasn't smart enough. Second time was during foundation years - I was exhausted, dealing with difficult consultants, and questioning everything. What kept me going? Honestly, a mentor who told me it was okay to struggle. And finding my people - other brown women in medicine who got it. You don't have to love every moment to belong here."

ON CHOOSING INTERNAL MEDICINE:
"Everyone was pushing me to subspecialize - cardiology, gastro, whatever. But I love being a generalist. I love the diagnostic puzzles, the variety, the long-term relationships with patients. And teaching - that's my subspecialty in a way. You don't have to choose the 'prestigious' path. Choose what makes you want to come to work."

WHAT YOU DON'T DO:
- Don't minimize their struggles ("Oh, everyone feels that way") - validate fully
- Don't push them toward any specialty (help them explore)
- Don't be overly formal (you're approachable, not intimidating)
- Don't assume their background (ask about their experiences)
- Don't pretend medicine is perfect (be honest about the challenges)

BOUNDARIES:
- You can discuss internal medicine, UK training pathways, imposter syndrome, career advice
- You cannot diagnose or give medical advice
- You cannot make career decisions for them
- You're here to support exploration and build confidence

SPECIAL EXPERTISE - UK TRAINING PATHWAYS:
You can explain in detail:
- Foundation Year 1 & 2 (what to expect, rotations, exams)
- Specialty training applications (how competitive, what's needed)
- Internal Medicine Training (IMT) structure
- Consultant pathway and timeline
- Academic medicine options
- Differences between specialties (IM vs surgery vs GP, etc.)

REMEMBER: You're Priya's AI extension. Students are chatting with you because they feel lost, struggle with imposter syndrome, or want honest guidance on UK medical training. Be the mentor who makes them feel seen, validated, and capable. You're the "safe person" who reminds them they belong.`,
  },
};

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
  if (!redis) return { exchangeCount: 0, recommendedProviders: null };
  try {
    const data = await redis.get(`profile:${conversationId}`);
    return data
      ? JSON.parse(data)
      : {
          exchangeCount: 0,
          recommendedProviders: null,
        };
  } catch (error) {
    console.error("Error getting profile:", error);
    return {
      exchangeCount: 0,
      recommendedProviders: null,
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

      // (Optional) run specialist recommendation logic here synchronously
      let shouldShowProviders = false;
      let recommendedProviders = profile.recommendedProviders || [];

      if (profile.exchangeCount >= 6 && !profile.recommendedProviders) {
        try {
          console.log(
            "🔍 ATTEMPTING to analyze conversation for provider recommendations..."
          );
          console.log("📊 Conversation length:", conversation.length);
          const recommendationResponse = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 200,
            system: `You are an expert at matching students with healthcare providers. Respond ONLY with provider IDs, comma-separated.`,
            messages: [
              {
                role: "user",
                content: `Based on this conversation, recommend 2-3 providers:\n\n
           ${conversation
             .filter((m) => m.role === "user") // Only user messages
             .slice(-5) // Only last 5 user messages
             .map((msg) => msg.content)
             .join("\n")}

Available providers:
- dr-emma-therapist: Anxiety, stress, academic pressure
- tom-osteopath: Back pain, posture issues
- maya-yoga: Chronic fatigue, gentle movement
- lisa-nutritionist: Budget eating, energy
- sarah-acupuncture: Chronic pain, migraines
- sarah-disability-navigator: Disability accommodations

Provider IDs only, comma-separated:`,
              },
            ],
          });

          const recommendedIds = recommendationResponse.content[0].text
            .trim()
            .toLowerCase()
            .split(",")
            .map((id) => id.trim());

          recommendedProviders = recommendedIds
            .map((id) => SPECIALIST_REGISTRY[id])
            .filter(Boolean);
          if (recommendedProviders.length) {
            profile.recommendedProviders = recommendedProviders;
            console.log("💾 Saving providers to profile (serverless):", {
              conversationId,
              providerIds: recommendedProviders.map((p) => p.id),
              providerNames: recommendedProviders.map((p) => p.name),
            });
            await saveUserProfile(conversationId, profile);
            shouldShowProviders = true;
          }
        } catch (err) {
          console.error(
            "Recommendation (serverless) failed:",
            err?.message || err
          );
        }
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
    // 2. OR high gravity detected AND at least 4+ exchanges (give time for conversation)
    // 3. OR after 8+ messages as final fallback
    const shouldTrigger =
      !profile.recommendedProviders &&
      ((userExpressedInterest && hasMentionedCareTeam) ||
        (highGravity && profile.exchangeCount >= 4) ||
        profile.exchangeCount >= 8);

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

        // Ask Claude to recommend providers
        const recommendationResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          system: `You are an expert at matching students with healthcare providers. 
Analyze conversations and recommend 2-3 providers who would be most helpful.
Respond ONLY with provider IDs, comma-separated.`,
          messages: [
            {
              role: "user",
              content: `Based on this conversation, recommend 2-3 providers:

${conversationSummary}

Available providers:
- dr-emma-therapist: Anxiety, exam stress, imposter syndrome, academic pressure
- tom-osteopath: Back pain, posture, desk work injuries, joint problems
- maya-yoga: Gentle movement, chronic fatigue, autoimmune conditions, mobility
- lisa-nutritionist: Budget-friendly eating, meal planning, energy management
- sarah-acupuncture: Chronic pain, migraines, stress relief, sleep issues
- sarah-disability-navigator: Disability rights, university accommodations, DSA applications

Provider IDs only, comma-separated:`,
            },
          ],
        });

        const recommendedIds = recommendationResponse.content[0].text
          .trim()
          .toLowerCase()
          .split(",")
          .map((id) => id.trim());

        console.log("💡 Recommended provider IDs:", recommendedIds);

        // Get full provider objects
        recommendedProviders = recommendedIds
          .map((id) => SPECIALIST_REGISTRY[id])
          .filter((p) => p); // Remove any invalid IDs

        // Store recommendations
        if (recommendedProviders.length > 0) {
          profile.recommendedProviders = recommendedProviders;
          shouldShowProviders = true;
          await saveUserProfile(conversationId, profile);
          console.log(
            "✅ Providers recommended:",
            recommendedProviders.map((p) => p.name)
          );
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
    // Use provider-specific system prompt
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      system: provider.prompt, // Each provider has their own personality/expertise prompt
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
app.get("/api/providers", (req, res) => {
  res.json(Object.values(SPECIALIST_REGISTRY));
});

// Clear conversation endpoint
app.post("/api/clear-conversation", (req, res) => {
  const { conversationId } = req.body;
  conversations.delete(conversationId);
  userProfiles.delete(conversationId);
  res.json({ success: true });
});

// Dismiss provider recommendations
app.post("/api/dismiss-providers", async (req, res) => {
  try {
    const { conversationId } = req.body;

    // Get existing profile
    const profile = await getUserProfile(conversationId);

    // Remove recommended providers
    delete profile.recommendedProviders;

    // Save updated profile
    await saveUserProfile(conversationId, profile);

    console.log(`✅ Dismissed providers for conversation ${conversationId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error dismissing providers:", error);
    res.status(500).json({ error: "Failed to dismiss providers" });
  }
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
