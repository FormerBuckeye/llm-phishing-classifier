# LLM Phishing Classifier

A production-ready email classification system that uses DeepSeek LLM to automatically detect and quarantine phishing emails in real-time.

## Current Implementation Status

**✅ V2 Ready - Hybrid Architecture**

This service supports **dual-mode operation** with both V1.5 and V2 features:

- **Processing Mode**: Configurable (time-based or label-based)
    - `LABEL_MODE=false` (default): Time-based polling (V1 architecture)
    - `LABEL_MODE=true`: Label-based polling (V2 with zero inbox exposure)
- **Detection**: DeepSeek LLM AI classification with Dual-Mode prompts (✅)
- **Delivery Logic**: Smart decision making with inbox restoration (V2)
- **Speed**: Optimized 10-second polling interval (✅)
- **Embeddings**: Optional OpenAI Dual-Mode Classification (✅)
- **Label Management**: Automated label application/removal (NEW in V2)

### Hybrid Flow

**V1 Mode (Time-based Polling):**
```
Email Arrives
↓
Gmail delivers to INBOX (native)
↓
Service polls every 10 seconds
↓
Dual-Mode Classification (Static/Dynamic)
↓
DeepSeek classifies: phish/spam/benign
↓
Decision: Move to SPAM or INBOX + UNREAD
```

**V2 Mode (Label-based Polling - Zero Exposure):**
```
Email Arrives
↓
Gmail Filter applies PENDING_CLASSIFICATION label
↓
Service polls label queue every 10 seconds
↓
Dual-Mode Classification (Static/Dynamic)
↓
DeepSeek classifies: phish/spam/benign
↓
Decision:
- High confidence phish/spam → Keep in SPAM, remove PENDING label ✓
- Benign → INBOX + UNREAD, remove PENDING label ✓
```

## Version History

### V1 (Initial Release - commit 894926b)
**Features:**
- Basic email classification using DeepSeek LLM API
- Classifies emails as spam/phish/benign with confidence scores
- Quarantines high-confidence threats (>0.7) to spam folder
- Processes emails from last N hours
- Simple delivery logic

**Limitations:**
- Time-based processing only (no prioritization)
- No Gmail label management
- Basic classification only

### V2 (Implemented)
**Status:** ✅ Available - Label-based processing with zero inbox exposure
**Goals:**
- Gmail label-based processing with pending queue
- Priority routing for different email types
- Zero inbox exposure for confirmed threats
- Two-layer security (Gmail filter + AI classification)

**Quick Start:**

1. **Enable V2 mode in .env:**
```bash
# In .env file:
LABEL_MODE=true
PENDING_LABEL=PENDING_CLASSIFICATION
# Optional: Fast polling for labeled queue
POLL_INTERVAL_SECONDS=10
```


2. **Run setup script (one-time):**
```bash
node tools/setup-priority-routing.js
```
This creates the Gmail filter that applies PENDING_LABEL to all incoming emails.


3. **Verify Gmail OAuth scopes include:**
```bash
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.labels,https://www.googleapis.com/auth/gmail.settings.basic
```
Note: settings.basic scope is required for creating filters. If not available, manually create filter in Gmail Settings > Filters & Blocked Addresses.


4. **Start service:**
```bash
npm start
```

**Verification:**
- Check logs for "Starting V2 label-based polling"
- Send test email and verify it gets the PENDING_CLASSIFICATION label
- Verify classification happens and labels are cleaned up

**Benefits:**
- Zero inbox exposure: Emails never hit inbox before classification
- Lower Gmail API usage: Only processes labeled emails
- More reliable: Gmail filter runs server-side instantly on arrival
- Better audit trail: PENDING_CLASSIFICATION label visible in Gmail UI

**Architecture:**
```
Inbound Email → Gmail Filter → Apply PENDING_CLASSIFICATION label
↓
Service polls label queue → DeepSeek Classification
↓
Decision:
- High confidence phish → stays SPAM
- Low confidence phish → INBOX + UNREAD
- Benign → INBOX + UNREAD
```

**Status:** ✅ Available - Label-based processing with zero inbox exposure

## Current Configuration

**Runtime Settings (as configured):**
- **Processing Mode**: Label-based polling (V2 mode)
- **Poll Interval**: 10 seconds (configurable)
- **Quarantine Threshold**: ≥0.7 confidence
- **AI Model**: DeepSeek (via API)
- **Database**: PostgreSQL

Key environment variables:
- `POLL_INTERVAL_SECONDS=10` - How often to check for new emails
- `HOURS_TO_PROCESS=1` - Hours back to process
- `QUARANTINE_ENABLED=true` - Enable automatic quarantine
- `ENABLE_QUARANTINE=true` - Quarantine threshold 0.7

## Installation & Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure:
   - `DEEPSEEK_API_KEY=your_key`
   - `GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.labels`
4. Obtain `credentials.json` from Google Cloud Console
5. Run setup: `node database/setup.js`
6. Start service: `npm start`

## Features

### Core Capabilities
- ✅ AI-powered email classification (phish/spam/benign)
- ✅ Confidence-based quarantine decisions
- ✅ Smart delivery logic (spam/phish/benign)
- ✅ Database persistence and analytics
- ✅ Automated label management
- ✅ Structured logging

### Enhanced Methods
- `moveToSpam(messageId)` - Quarantine emails
- `moveToInbox(messageId)` - Restore to inbox
- `markUnread(messageId)` - Mark unread for review

### Dual-Mode Classification (NEW in v1.5)
**OpenAI Embeddings Integration** (Optional Enhancement)

The service now supports **dual-mode classification** that automatically switches between:

1. **Dynamic Mode** (with OpenAI API key)
- Generates embeddings for each email using OpenAI's `text-embedding-ada-002`
- Finds 3 most similar examples from ground truth phishing dataset
- Creates dynamic few-shot prompts with similar examples
- Enhanced accuracy through similarity-based context
- Cost: ~$0.00005 per email

2. **Static Mode** (fallback, no API key required)
- Uses fixed few-shot examples in prompts
- No external API costs
- Still provides excellent classification accuracy
- Fully functional without configuration

**Configuration:**
```bash
# Add to .env for dynamic mode (optional)
OPENAI_API_KEY=sk-...
```

**Services:**
- `EmbeddingService` - Generates embeddings via OpenAI API
- `PromptBuilder` - Builds dynamic or static prompts based on availability
- `EmailProcessor` - Integrates similarity search before classification

**Benefits:**
- Zero-configuration fallback (works immediately)
- Enhanced accuracy with embeddings (when configured)
- Graceful degradation (never fails due to missing API key)
- Cost-effective (~5 cents per 1000 emails)

## Testing & Verification

### Current Performance
- Phishing detection: 95% confidence in test scenarios
- Processing interval: 10-second polling
- Quarantine logic: Handles all confidence levels correctly
- Integration: Seamless Gmail API communication

### Example Classification Results
```
Email: "I am good thank you"
Sender: penghuius@gmail.com
Classification: benign
Confidence: 0.9500
Action: delivered to inbox ✓

Email: "Security alert"
Sender: no-reply@accounts.google.com
Classification: benign
Confidence: 0.9500
Action: delivered to inbox ✓

Email: "[TEST-10] Attention:I am Diplomatic agent..."
Sender: aegisaizph@gmail.com
Classification: phish
Confidence: 0.9500
Action: quarantined to spam ✓
```

## Security Architecture

### Two-Layer Security (Implemented)

1. **Gmail Layer** (fast, broad): Gmail filter instantly applies PENDING_CLASSIFICATION label to all incoming emails
2. **AI Layer** (sophisticated): Service polls label queue and classifies with DeepSeek for delivery decisions

The system provides zero inbox exposure with dual-layer security protecting against threats before they reach the inbox.

## Database Schema

**email_classifications table:**
- message_id, email_address, subject
- sender_name, sender_email, received_at
- classification, confidence_score
- action_taken, is_quarantined
- quarantined_at, created_at, updated_at

**processing_log table:**
- Tracks all classification attempts
- Success and error logging
- Performance monitoring

## Notes

**For True Zero-Exposure (V2):** Zero inbox exposure is now fully implemented:

✅ Gmail filter automatically applies PENDING_CLASSIFICATION label to all incoming emails
✅ Service polls label queue and classifies with DeepSeek
✅ After classification, PENDING label is removed and email is routed appropriately:
   - Spam/Phish (≥0.7 confidence) → Remains in SPAM, pending label removed
   - Benign → INBOX + UNREAD, pending label removed
✅ Zero inbox exposure: Users never see emails before AI classification

## License

MIT

---

**Version Tags:**
- **v1.0** (commit 894926b) - Basic email classification
- **v2.0** (commit 438e914) - Code foundation for pending-label flow
- **Current** - V2 label-based processing with zero inbox exposure
