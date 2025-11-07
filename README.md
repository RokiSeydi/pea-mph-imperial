# Pea - AI Mentorship Coordinator & Specialist Team Platform

An intelligent mentorship platform that connects medical students with AI-powered healthcare specialists. Pea acts as a personal mentor coordinator, understanding your needs and assembling a personalized team of AI specialists trained on real provider expertise.

## 🌟 Features

### Core Functionality

- **Intelligent Matching**: Pea analyzes conversations to understand your background, interests, and values
- **Dynamic Specialist Recommendations**: AI recommends 2-3 relevant specialists based on conversation context
- **Persistent Conversations**: All chats saved to Redis with 7-day retention
- **Context Sharing**: Specialists receive conversation history from Pea (no need to repeat yourself)
- **Multi-line Messages**: Shift+Enter for new lines, Enter to send

### AI Specialists

20+ specialist mentors trained on real healthcare expertise. Each specialist has:
- Personalized bio and credentials
- Specialty-focused expertise
- Multi-language support
- Context-aware conversation guidelines
- Professional background and affiliations

See `backend/specialists.js` for the complete registry of available specialists.

### UI/UX

- **iMessage-style Chat Interface**: Familiar, comfortable design
- **Split-screen Specialist View**: Chat with Pea while browsing recommended specialists
- **Mobile-optimized**: Scroll-to-bottom button, responsive design
- **Specialist Persistence**: "View Your Team" button always available once specialists recommended
- **Dismissible Recommendations**: Permanently remove specialists if not needed

## 🏗️ Architecture

```
HH-AGENTIC/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx   # Main application component with pronouns support
│   │   └── index.css
│   └── package.json
│
├── backend/           # Express.js API server
│   ├── index.js      # Main server with all endpoints
│   ├── peaSystemPrompt.js       # Pea's personality & instructions
│   ├── specialists.js           # Centralized specialist registry (20+)
│   ├── scripts/
│   │   └── clear-pea-redis.js  # Dev utility to reset Redis data
│   ├── api/
│   │   └── index.js  # Vercel serverless handler
│   └── package.json
│
└── api/              # (Legacy - cleaned up)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Redis database (Vercel Redis or local Redis)
- Anthropic API key (Claude)

### Environment Variables

**Backend** (`backend/.env`):

```env
PORT=3001
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
FRONTEND_URL=http://localhost:5173
REDIS_URL=your_redis_connection_url_here
```

**Frontend** (Vercel environment variables):

```env
VITE_API_URL=https://your-backend-url.vercel.app
```

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/RokiSeydi/hh-agentic-v1.git
cd hh-agentic-v1
```

2. **Setup Backend**

```bash
cd backend
npm install
cp .env.example .env  # Add your API keys
node index.js
```

Backend runs on `http://localhost:3001`

3. **Setup Frontend** (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## 📡 API Endpoints

### Main Endpoints

- `POST /api/stream-chat` - Stream chat responses from Pea with dynamic specialist recommendations
- `POST /api/provider-chat` - Chat with specific AI specialist (with context injection from main conversation)
- `POST /api/set-profile` - Update user profile (pronouns, recommendations, etc.)
- `GET /api/health` - Health check endpoint (returns provider count)

### How Specialist Recommendations Work

1. User chats with Pea about their interests, background, and challenges
2. Backend analyzes conversation for:
   - User expressing interest in mentorship
   - Pea mentioning the mentorship team/support team/care team
   - Exchange count thresholds (varies by urgency)
   - High-gravity stressors (multiple mentions of pain, anxiety, burnout, etc.)
3. When triggered, Claude analyzes full conversation against live `SPECIALIST_REGISTRY`
4. Claude recommends 1-2 most relevant specialists based on expertise match
5. Recommendations saved to Redis and persist across sessions
6. Specialists receive context from main conversation (no need for user to repeat themselves)

## 🗄️ Data Persistence

### Redis Storage Structure

```
conversation:{conversationId}           # Main Pea conversation (7-day TTL)
profile:{conversationId}                # User profile with recommendations (7-day TTL)
conversation:{conversationId}-{specialistId}  # Specialist-specific chats (7-day TTL)
```

### Storage Functions

- `getConversation(id)` - Retrieve messages
- `saveConversation(id, messages)` - Save messages with TTL
- `getUserProfile(id)` - Get user metadata
- `saveUserProfile(id, profile)` - Save user metadata

## 🎨 Key Features Deep Dive

### Context Passing to Specialists

When you first message a specialist, the backend:

1. Retrieves your full Pea conversation
2. Extracts all your messages (not Pea's responses)
3. Creates a context summary
4. Passes it to the specialist with: "The person you're talking to has shared the following with Pea..."
5. Specialist acknowledges context and provides informed support

### Multi-line Input

- Press **Enter** → Send message
- Press **Shift+Enter** → New line
- Textarea auto-expands up to 4 lines

### Scroll-to-Bottom Button

- Appears when scrolled up >100px
- Mobile-only (hidden on desktop)
- Works in all chat views

## 🚢 Deployment

### Vercel Deployment

**Backend:**

1. Connect GitHub repo to Vercel
2. Set Root Directory: `backend`
3. Add environment variables (see above)
4. Deploy

**Frontend:**

1. Connect GitHub repo to Vercel (separate project)
2. Set Root Directory: `frontend`
3. Set Framework: Vite
4. Add `VITE_API_URL` environment variable
5. Deploy

### Important Notes

- Backend uses serverless functions (Vercel handles scaling)
- Redis initialization is lazy (connects on first use in serverless)
- CORS configured to accept requests from frontend URL

## � Development Tools

### Clearing Redis Data

To reset conversation and profile data during testing:

```bash
cd backend
node scripts/clear-pea-redis.js
```

This safely deletes all `conversation:*` and `profile:*` keys from Redis.

**Note:** You can also test in an incognito window to avoid cached localStorage data.

**Frontend:**

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- PostHog (analytics)

**Backend:**

- Node.js / Express
- Anthropic SDK (Claude Sonnet 4.5)
- Redis (node-redis client)
- dotenv

## 📊 Cohort Tracking with UTM Parameters

Track different cohorts of users with UTM parameters. All UTM params are automatically captured in PostHog analytics.

### URL Format

```
https://pea-amsa.vercel.app?utm_source=COHORT_NAME&utm_campaign=CAMPAIGN&utm_medium=MEDIUM&utm_content=CONTENT
```

### Example URLs

**Medical Student Cohort A:**
```
https://pea-amsa.vercel.app?utm_source=med_students_cohort_a&utm_campaign=november_pilot&utm_medium=email
```

**King's College London Students:**
```
https://pea-amsa.vercel.app?utm_source=kcl&utm_campaign=amsa_partnership&utm_medium=internal
```

**AMSA Chapter Promotion:**
```
https://pea-amsa.vercel.app?utm_source=amsa_chapter&utm_campaign=wellness_week&utm_medium=social
```

**Edinburgh Medical School - Cohort 1:**
```
https://pea-amsa.vercel.app?utm_source=edinburgh_cohort_1&utm_campaign=edinburgh_pilot&utm_medium=email
```

**Edinburgh Medical School - Cohort 2:**
```
https://pea-amsa.vercel.app?utm_source=edinburgh_cohort_2&utm_campaign=edinburgh_pilot&utm_medium=email
```

**Edinburgh Medical School - Cohort 3:**
```
https://pea-amsa.vercel.app?utm_source=edinburgh_cohort_3&utm_campaign=edinburgh_pilot&utm_medium=email
```

**Edinburgh Medical School - Cohort 4:**
```
https://pea-amsa.vercel.app?utm_source=edinburgh_cohort_4&utm_campaign=edinburgh_pilot&utm_medium=email
```

**Edinburgh Medical School - Cohort 5:**
```
https://pea-amsa.vercel.app?utm_source=edinburgh_cohort_5&utm_campaign=edinburgh_pilot&utm_medium=email
```

### Available Parameters

- `utm_source`: Cohort identifier (e.g., `med_students_cohort_a`, `kcl`, `amsa_chapter`)
- `utm_medium`: Marketing channel (e.g., `email`, `social`, `internal`, `direct`)
- `utm_campaign`: Campaign name (e.g., `november_pilot`, `wellness_week`)
- `utm_content`: Additional content tag for A/B testing
- `utm_term`: Search term or variation identifier

### Analytics Tracking

UTM parameters are automatically:
1. ✅ Captured from URL on page load
2. ✅ Stored in sessionStorage for persistence across reloads
3. ✅ Attached to all PostHog events (app_loaded, message_sent, specialists_recommended)
4. ✅ Used to segment users in PostHog dashboards

### PostHog Setup

All UTM parameters appear as user properties in PostHog, allowing you to:
- Filter events by cohort
- Track conversion rates per cohort
- Compare engagement across different student groups
- Create custom dashboards for each campaign

## � Recent Updates

### November 2025 - Registry Refactoring & UX Improvements

**Infrastructure:**
- ✅ Centralized specialist registry in `backend/specialists.js` (20+ healthcare specialists)
- ✅ Dynamic specialist recommendations using live registry (no hardcoded IDs)
- ✅ Added `backend/scripts/clear-pea-redis.js` utility for development data resets
- ✅ Cleaned up legacy API files (`api/chat.mjs`, `api/providers.mjs`)

**Features:**
- ✅ Added pronouns support to user profiles (backend endpoint + frontend state + localStorage)
- ✅ Improved specialist conversation quality with injected guidelines (2-4 sentence max, one question at a time, conversational tone)
- ✅ Expanded specialist recommendation triggers with mentorship/team language detection

**Recommendation Logic:**
- ✅ Trigger on Pea mentioning care/support/mentorship team + user interest
- ✅ Trigger on high-gravity stressors (3+ mentions of burnout, anxiety, pain, etc.)
- ✅ Fallback trigger after 5+ exchanges if no previous matches
- ✅ Claude analyzes against actual registry (only validates existing specialist IDs)

**System Prompt Updates:**
- ✅ Added "RECOMMENDED LANGUAGE FOR INTRODUCTIONS" to guide Pea's mentor connection phrasing
- ✅ Injected "CRITICAL CONVERSATION GUIDELINES" into all specialist AI prompts
- ✅ Enhanced context passing so specialists understand conversation history

**Previous Updates:**
- ✅ Added UTM parameter tracking for cohort analytics
- ✅ Implemented staggered message reveals for better UX
- ✅ Fixed specialist matching logic (no more false recommendations)
- ✅ Added specialty-matched voucher offering strategy
- ✅ Enhanced system prompt with contextual follow-ups and feedback collection
- ✅ Added Redis persistence for all conversations
- ✅ Fixed provider context passing bug
- ✅ Added page refresh persistence
- ✅ Added "View Your Team" CTA button
- ✅ Added "Dismiss Recommendations" feature
- ✅ Added multi-line textarea support (Shift+Enter)
- ✅ Added scroll-to-bottom button (mobile)
- ✅ Fixed Redis initialization for serverless environments

## 🤝 Contributing

This is a private project. For questions or access, contact the repository owner.

## 📄 License

Private - All rights reserved.

## 🐛 Known Issues

- None currently tracked

## 📞 Support

For issues or questions, open an issue on GitHub or contact the development team.

---

Built with ❤️ for student health and wellbeing
