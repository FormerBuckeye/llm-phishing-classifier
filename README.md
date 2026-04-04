# LLM Phishing Classifier

A production-ready email classification system that uses DeepSeek LLM to automatically detect and quarantine phishing emails in real-time.

## Current Implementation Status

**⚠️ Hybrid Architecture (V1.5)**

This service currently operates with a **hybrid approach** that combines V1 and V2 features:

- **Processing**: Time-based polling (V1 architecture)
- **Detection**: DeepSeek LLM AI classification (V2 quality)
- **Delivery Logic**: Smart decision making with inbox restoration (V2 features)
- **Speed**: Optimized 10-second polling interval (enhancement)

### Hybrid Flow (Current)

```
Email Arrives
    ↓
Gmail delivers to INBOX (native)
    ↓
Service polls every 10 seconds (time-based)
    ↓
DeepSeek classifies: phish/spam/benign
    ↓
Decision Based on Confidence Score:
  - High-confidence threat (≥0.7) → Stay in SPAM ✓
  - Low-confidence threat (<0.7) → INBOX + UNREAD for review ⚠
  - Benign → INBOX + UNREAD ✓
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

### V2 (Planned - Enhanced)
**Goals:**
- Gmail label-based processing with pending queue
- Priority routing for different email types
- Zero inbox exposure for confirmed threats
- Two-layer security (Gmail filter + AI classification)

**Planned Architecture:**
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

**Status:** Code foundation in place, pending Gmail filter setup

## Current Configuration

**Runtime Settings (as configured):**
- **Processing Mode**: Time-based polling
- **Poll Interval**: 10 seconds (configurable)
- **Processing Window**: Last 1 hour
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

### Two-Layer Security (Planned Implementation)
1. **Gmail Layer** (fast, broad): Native spam filter catches suspicious emails immediately
2. **AI Layer** (sophisticated): Service polls and classifies with DeepSeek for delivery decisions

Current implementation provides AI-enhanced protection with 10-second processing intervals.

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

**For True Zero-Exposure (V2):** To implement full pending-label flow:

1. Create Gmail filter:
   ```
   Matches: *
   Do this: Apply label "PENDING_CLASSIFICATION", Mark as read
   ```

2. Update code to use label-based queries instead of time-based

3. Modify service to poll pending label queue

## License

MIT

---

**Version Tags:**
- **v1.0** (commit 894926b) - Basic email classification
- **v2.0** (commit 438e914) - Code foundation for pending-label flow
- **Current** - Hybrid implementation with 10s optimized polling
