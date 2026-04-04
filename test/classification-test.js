require('dotenv').config();
const DeepSeekService = require('../services/deepseek-service');
const logger = require('../utils/logger');

// Sample emails for testing
const SAMPLE_EMAILS = [
  {
    name: "Phishing Email (Suspicious)",
    email: {
      messageId: "test-phishing-001",
      subject: "Urgent: Account Security Alert",
      senderName: "Security Team",
      senderEmail: "security-update@example.net",
      date: new Date().toISOString(),
      snippet: "Your account will be suspended unless you verify your credentials immediately. Click here: http://suspicious-link.example.com/login",
      body: `Dear Customer,

Your account has been flagged for suspicious activity. To avoid suspension, you must verify your account within 24 hours.

Click here to verify: http://suspicious-link.example.com/login

Login with your username and password to confirm your identity.

Best regards,
Security Team`
    }
  },
  {
    name: "Spam Email (Marketing)",
    email: {
      messageId: "test-spam-001",
      subject: "🎉 Exclusive Offer: 90% Off All Products!",
      senderName: "Amazing Deals",
      senderEmail: "offers@amazingdeals.com",
      date: new Date().toISOString(),
      snippet: "Limited time offer! Get 90% off all products. Shop now before it's gone!",
      body: `Hi there!

Don't miss out on our biggest sale of the year! Get 90% off all products in our store.

This offer expires in 24 hours, so act fast!

Visit our website: www.amazingdeals.com

Best,
Marketing Team`
    }
  },
  {
    name: "Benign Email (Personal)",
    email: {
      messageId: "test-benign-001",
      subject: "Meeting Tomorrow",
      senderName: "John Smith",
      senderEmail: "john.smith@company.com",
      date: new Date().toISOString(),
      snippet: "Hi, just confirming our meeting tomorrow at 10am. Looking forward to it!",
      body: `Hi there,

Just confirming our meeting tomorrow at 10am in conference room A. I've prepared the Q3 report and look forward to discussing it with you.

Let me know if you need anything else before then.

Best,
John`
    }
  }
];

async function testDeepSeek() {
  logger.info('🔍 Testing DeepSeek Classification...');

  const deepseek = new DeepSeekService();

  try {
    // Test API connection
    logger.info('🌐 Testing DeepSeek API connection...');
    const connected = await deepseek.testConnection();

    if (!connected) {
      logger.error('❌ Cannot connect to DeepSeek API');
      process.exit(1);
    }

    logger.info('✅ DeepSeek API connected');

    // Test classification for each sample email
    for (const [index, sample] of SAMPLE_EMAILS.entries()) {
      logger.info(`\n📧 Testing email ${index + 1}: ${sample.name}`);
      logger.info(`Subject: ${sample.email.subject}`);
      logger.info(`From: ${sample.email.senderEmail}`);

      try {
        const result = await deepseek.classifyEmail(sample.email);

        logger.info('Classification Result:', {
          classification: result.classification,
          confidence: result.confidence,
          reason: result.reason,
        });

        // Verify expected classification
        const expectedType = sample.name.split(' ')[0].toLowerCase();
        if (result.classification !== expectedType) {
          logger.warn(`⚠️  Classification mismatch! Expected: ${expectedType}, Got: ${result.classification}`);
        } else {
          logger.info('✅ Classification matches expected result');
        }
      } catch (error) {
        logger.error(`❌ Classification failed for email ${index + 1}:`, error.message);
      }

      // Add delay between requests
      if (index < SAMPLE_EMAILS.length - 1) {
        logger.info('⏳ Waiting 2 seconds before next test...');
        await sleep(2000);
      }
    }

    logger.info('\n🎉 DeepSeek classification test completed!');
    logger.info('Note: Email classification accuracy may vary. Review logs above for results.');

    process.exit(0);

  } catch (error) {
    logger.error('❌ DeepSeek test failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run test if called directly
if (require.main === module) {
  testDeepSeek();
}

module.exports = { testDeepSeek, SAMPLE_EMAILS };
