# LLM Phishing Classifier

A production-ready email classification system that uses DeepSeek LLM to automatically detect and quarantine phishing emails in real-time.

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
- No queue-based processing
- Basic classification only

### V2 (Enhanced - commit 438e914)
**Major Improvements:**

**1. GmailService Enhancements:**
- `getPendingMessages()` - queries Gmail for PENDING_CLASSIFICATION labeled emails
- Label helpers: `addLabel()`, `removeLabel()`, `markUnread()`, `moveToInbox()`

**2. Smart Processing Flow:**
- Modified `processRecentEmails()` → uses `getPendingMessages()` instead of time queries
- Automatic removal of PENDING_CLASSIFICATION label after classifying
- Enhanced delivery logic:
  - High-confidence quarantine: stays in spam ✓
  - Low-confidence threats: inbox + unread (review) ⚠
  - Benign: inbox + unread ✓

**3. Two-Layer Security Architecture:**
```
Inbound Email → Gmail Filter → Suspicious → SPAM
                                     → Service polls SPAM → DeepSeek Classification
                                     → Decision:
                                       - High confidence phish → stays SPAM
                                       - Low confidence phish → INBOX + UNREAD
                                       - Benign → INBOX + UNREAD
```

**4. Tested & Verified**
- Phishing email correctly classified as phish (95% confidence)
- Quarantine logic working as designed
- Service processes within 60-second intervals

### V2 vs V1 Key Changes

| Feature | V1 | V2 |
|---------|----|----|
| Message Query | Time-based (last N hours) | Label-based (PENDING_CLASSIFICATION) |
| Label Management | ❌ None | ✅ Full (add/remove/mark/move) |
| Pending Label | ❌ No concept | ✅ Automatic removal after processing |
| Delivery Logic | Simple (spam only) | Smart (spam/phish/benign) |
| Security Layers | 1 (basic) | 2 (native + AI) |

## Architecture

Two-layer email security with Gmail native filter + AI classification:

1. **Gmail Layer** (fast, broad): Native spam filter moves suspicious emails to SPAM immediately
2. **AI Layer** (sophisticated): Service polls SPAM, classifies with DeepSeek, makes delivery decision:
   - **Phish/spam (≥0.7)** → keep quarantined in SPAM ✓
   - **Phish/spam (<0.7)** → move to INBOX + UNREAD for review ⚠
   - **Benign** → move to INBOX + UNREAD ✓

## Installation & Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure:
   - `DEEPSEEK_API_KEY=your_key`
   - `GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.labels`
4. Obtain `credentials.json` from Google Cloud Console
5. Run setup: `node database/setup.js`
6. Start service: `npm start`

## Configuration

Key environment variables:
- `POLL_INTERVAL_SECONDS=60` - polling interval in seconds
- `HOURS_TO_PROCESS=1` - hours back to process (time-based mode, unused in V2)
- `QUARANTINE_ENABLED=true` - enable automatic quarantine

## Version Tags

- **v1.0** - Initial release (basic classification)
- **v2.0** - Enhanced pending-label flow with improved delivery logic

## Security Notes

- Gmail native spam filter provides first layer (fast, broad)
- DeepSeek AI classification provides second layer (sophisticated, AI-powered)
- Both layers work together to prevent phishing emails from reaching inbox
- Confirmed threats stay quarantined in spam for manual review
- Suspicious but uncertain emails deliver to inbox + unread for review

## License

MIT

---

**Version History:**
- **v1.0** (commit 894926b) - Basic email classification
- **v2.0** (commit 438e914) - Enhanced pending-label flow with smart delivery logic
EOF
echo "README.md created with V1/V2 documentation"