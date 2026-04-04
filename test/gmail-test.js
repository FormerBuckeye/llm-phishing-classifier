const GmailService = require('../services/gmail-service');
const logger = require('../utils/logger');

async function testGmail() {
  logger.info('🔍 Testing Gmail API Connection...');

  const gmail = new GmailService();

  try {
    // Initialize Gmail service
    await gmail.init();

    logger.info('✅ Gmail service initialized');

    // Test listing recent messages
    logger.info('📧 Fetching recent messages...');
    const recentMessages = await gmail.getRecentMessages(1, 10);

    if (recentMessages.length === 0) {
      logger.info('No recent messages found');
    } else {
      logger.info(`✅ Found ${recentMessages.length} recent message(s)`);

      // Test getting message details for the first message
      if (recentMessages.length > 0) {
        const firstMessageId = recentMessages[0].id;
        logger.info(`🔍 Getting details for message: ${firstMessageId}`);

        const messageDetails = await gmail.getMessageDetails(firstMessageId);

        logger.info('Message details:', {
          subject: messageDetails.headers.subject,
          from: messageDetails.headers.from,
          date: messageDetails.headers.date,
          labels: messageDetails.labelIds,
        });

        logger.info('✅ Message details retrieved successfully');
      }
    }

    logger.info('🎉 Gmail API test completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Gmail API test failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testGmail();
}

module.exports = { testGmail };
