# Email Classification Stack

A production-ready email classification system that uses DeepSeek LLM to automatically detect and quarantine phishing emails in real-time.

## Features

- **Live Gmail Integration**: Continuously monitors Gmail inbox for incoming emails
- **AI-Powered Classification**: Uses DeepSeek LLM to classify emails as "phish", "spam", or "benign"
- **Automated Quarantine**: Automatically moves detected phishing emails to Spam folder
- **Persistent Storage**: Stores all classification results in PostgreSQL database
- **Comprehensive Logging**: Winston logger with multiple log levels and file output
- **Statistics & Monitoring**: Built-in stats collection and error logging
- **Graceful Error Handling**: Resilient to API failures and network issues

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Gmail API     │────▶│ Email Processor │────▶│   PostgreSQL    │
│   (Polling)     │     │                 │     │   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ DeepSeek LLM    │
                        │ Classification  │
                        └─────────────────┘
```

## Requirements

- Node.js 16+ 🟢
- PostgreSQL 12+ 🐘
- Gmail Account 📧
- DeepSeek API Key 🔑

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd email-classification-stack
npm install
```

### 2. Database Setup

First, create a PostgreSQL database:

```bash
createdb email_classifier
```

Then copy the environment file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=email_classifier
DB_USER=postgres
DB_PASSWORD=your_password
```

Initialize the database schema:

```bash
npm run setup-db
```

### 3. Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 Credentials (Desktop application)
5. Download credentials and save as `config/credentials.json`

On first run, the system will:
1. Open a browser window for OAuth authorization
2. Prompt you to grant Gmail access
3. Save the token in `config/token.json` for future runs

### 4. DeepSeek API Setup

1. Get your API key from [DeepSeek Platform](https://platform.deepseek.com/)
2. Add to `.env`:

```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 5. Verify Installation

Run the test command to verify all connections:

```bash
# Test Gmail connection
npm run test-gmail

# Test DeepSeek classification
npm run test-classify
```

## Usage

### Start Continuous Monitoring

```bash
npm start
```

The system will:
- Poll Gmail every 60 seconds (configurable)
- Process new emails from the last hour
- Classify and quarantine phishing emails
- Log all activities

### Run Once (Testing)

```bash
npm run dev -- --once
# or
node src/index.js --once
```

### Configuration Options

Edit `.env` to customize behavior:

```env
# Polling interval in seconds (default: 60)
POLL_INTERVAL_SECONDS=30

# How many hours back to process (default: 1)
HOURS_TO_PROCESS=2

# Maximum runs before stopping (null = infinite)
MAX_RUNS=100

# Log level (info, debug, warn, error)
LOG_LEVEL=info

# Disable quarantine for testing
ENABLE_QUARANTINE=false
```

## Project Structure

```
email-classification-stack/
├── src/
│   ├── services/
│   │   ├── gmail-service.js      # Gmail API integration
│   │   ├── deepseek-service.js   # LLM classification
│   │   └── email-processor.js    # Main orchestrator
│   ├── database/
│   │   ├── schema.sql            # PostgreSQL schema
│   │   ├── setup.js              # DB initialization
│   │   └── db-service.js         # Database operations
│   ├── utils/
│   │   └── logger.js             # Winston logger
│   └── index.js                  # Main application
├── config/                       # OAuth credentials
├── logs/                         # Log files
├── .env                          # Environment variables
├── package.json
└── README.md
```

## Database Schema

### email_classifications

Stores all email classification results:

- `id`: Auto-incrementing primary key
- `message_id`: Gmail message ID (unique)
- `email_address`: Sender email
- `subject`, `sender_name`, `sender_email`: Metadata
- `received_at`: Timestamp
- `classification`: "phish", "spam", or "benign"
- `confidence_score`: LLM confidence (0-1)
- `raw_classification_data`: JSON response
- `action_taken`: "none" or "quarantined"
- `is_quarantined`: Boolean flag
- `quarantined_at`: Timestamp

### processing_log

Debug and error tracking:

- `id`: Auto-increment
- `process_type`: Type of process (e.g., "message_processing")
- `status": "success" or "error"
- `message_id`: Associated Gmail message
- `details`: JSON metadata
- `error_message`: Error details
- `created_at`: Timestamp

## Testing

### Test Gmail Connection

```bash
npm run test-gmail
```

This will verify:
- OAuth authentication
- Gmail API access
- Message fetching capabilities

### Test Classification

```bash
npm run test-classify
```

This will test:
- DeepSeek API connection
- Classification for a sample email
- Response parsing

### Manual Testing

Send test emails to your Gmail:

1. **Phishing Test**: Email with suspicious links requesting credentials
2. **Spam Test**: Promotional email with sales content
3. **Benign Test**: Regular business or personal email

Check logs to verify proper classification and quarantine actions.

## Monitoring & Debugging

### View Logs

```bash
# Real-time log monitoring
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log
```

### Query Database

```bash
# Connect to PostgreSQL
psql email_classifier

# View recent classifications
SELECT * FROM email_classifications ORDER BY received_at DESC LIMIT 10;

# View statistics
SELECT classification, COUNT(*)
FROM email_classifications
GROUP BY classification;

# View quarantined emails
SELECT * FROM email_classifications WHERE is_quarantined = true;

# View errors
SELECT * FROM processing_log WHERE status = 'error' ORDER BY created_at DESC;
```

## Classification Logic

The DeepSeek LLM uses this classification approach:

### **Phish** (❌ High Risk)
- Suspicious URLs or unknown domains
- Requests for passwords/credit cards
- Urgent language demanding immediate action
- Spoofed sender addresses
- Suspicious attachments

### **Spam** (⚠️ Low Risk)
- Unsolicited promotional content
- Unwanted newsletters
- Marketing emails without consent
- Annoying but not dangerous

### **Benign** (✅ Safe)
- Personal correspondence
- Expected business emails
- Subscribed newsletters
- Transactional emails from trusted sources

**Confidence Threshold**: Only emails with 70%+ confidence are quarantined to minimize false positives.

## Performance Considerations

- **Rate Limiting**: 100ms delay between email processing to avoid API limits
- **Memory Management**: Processing history cleared every 10 runs
- **Error Handling**: Resilient to individual email processing failures
- **Database Pool**: Up to 20 connections with connection pooling
- **Logging**: Rotating log files (5MB each, 5 files maximum)

## Troubleshooting

### Gmail Authentication Fails

**Solution**:
1. Delete `config/token.json`*
2. Re-run `npm start`
3. Complete OAuth flow in browser

### DeepSeek API Errors

**Solution**:
1. Verify API key in `.env`
2. Check API quota limits
3. Test with: `npm run test-classify`

### Database Connection Fails

**Solution**:
1. Verify PostgreSQL is running
2. Check credentials in `.env`
3. Run: `npm run setup-db`

### Emails Not Being Quarantined

**Solution**:
1. Check `ENABLE_QUARANTINE=true` in `.env`
2. Review logs for classification decisions
3. Verify Gmail permissions in OAuth scope
4. Test with: `ENABLE_QUARANTINE=false` first

## Production Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

### Process Manager

Using PM2 for production:

```bash
npm install -g pm2
pm2 start src/index.js --name email-classifier
pm2 save
pm2 startup
```

### Monitoring

- Health check endpoint: Add HTTP server status endpoint
- Metrics: Export Prometheus/Grafana metrics
- Alerts: Set up alerts for high quarantine rates

## Security Considerations

- **Credential Storage**: OAuth tokens stored in `config/token.json` (gitignored)
- **API Keys**: Store API keys in `.env` (gitignored)
- **Database**: Use SSL for remote database connections
- **Gmail Permissions**: Only request minimal required scopes
- **Log Sanitization**: Avoid logging email bodies with sensitive data

## Contributing

This project uses:

- ESLint / Prettier for code formatting
- Jest for testing (to be added)
- Winston for logging
- PostgreSQL for storage
- Google APIs for Gmail
- DeepSeek for classification

## License

ISC

## Support

For issues or questions:
1. Check troubleshooting section
2. Review logs for error details
3. Open an issue on GitHub

---

**Note**: This system is designed for 24-hour continuous operation as specified in the requirements. The polling-based architecture ensures reliability even without Gmail push notifications setup.
