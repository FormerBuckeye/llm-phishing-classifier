const GmailService = require('./gmail-service');
const DeepSeekService = require('./deepseek-service');
const DatabaseService = require('../database/db-service');
const logger = require('../utils/logger');

class EmailProcessor {
  constructor() {
    this.gmail = new GmailService();
    this.deepseek = new DeepSeekService();
    this.db = new DatabaseService();
    this.processingHistory = new Set(); // Track processed message IDs
  }

  async init() {
    try {
      logger.info('Initializing Email Processor...');

      await this.db.connect();
      await this.gmail.init();
      await this.deepseek.testConnection();

      logger.info('✅ Email Processor initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Email Processor:', error);
      throw error;
    }
  }

  async processRecentEmails(hours = 1) {
    let processedCount = 0;
    let quarantinedCount = 0;

    try {
      logger.info(`Processing emails from the last ${hours} hour(s)`);

      // Fetch recent messages
      const messages = await this.gmail.getRecentMessages(hours);

      if (!messages || messages.length === 0) {
        logger.info('No new messages to process');
        return { processed: 0, quarantined: 0 };
      }

      // Process each message
      for (const message of messages) {
        try {
          const result = await this.processMessage(message.id);

          if (result.processed) {
            processedCount++;

            if (result.quarantined) {
              quarantinedCount++;
            }
          }
        } catch (error) {
          logger.error(`Failed to process message ${message.id}:`, error);
          await this.db.saveProcessingLog('message_processing', 'error', message.id, null, error.message);
        }

        // Add a small delay to avoid rate limiting
        await this.sleep(100);
      }

      logger.info(`Processing completed: ${processedCount} processed, ${quarantinedCount} quarantined`);

    } catch (error) {
      logger.error('Error in processRecentEmails:', error);
      await this.db.saveProcessingLog('recent_email_processing', 'error', null, { hours }, error.message);
    }

    return { processed: processedCount, quarantined: quarantinedCount };
  }

  async processMessage(messageId) {
    try {
      // Skip if already processed
      if (this.processingHistory.has(messageId)) {
        logger.debug(`Skipping already processed message: ${messageId}`);
        return { processed: false, quarantined: false, reason: 'already_processed' };
      }

      // Get message details
      const messageDetails = await this.gmail.getMessageDetails(messageId);

      // Extract sender information
      const sender = this.parseSender(messageDetails.headers.from);

      // Parse and normalize email date to ISO format
      let normalizedDate = new Date().toISOString();
      try {
        const emailDate = messageDetails.headers.date;
        if (emailDate) {
          const parsedDate = new Date(emailDate);
          if (!isNaN(parsedDate.getTime())) {
            normalizedDate = parsedDate.toISOString();
          } else {
            logger.warn(`Invalid date format: ${emailDate}, using current time`);
          }
        }
      } catch (dateError) {
        logger.warn(`Failed to parse email date: ${messageDetails.headers.date}, using current time`);
      }

      // Prepare data for classification
      const emailData = {
        messageId: messageDetails.id,
        subject: messageDetails.headers.subject,
        senderName: sender.name,
        senderEmail: sender.email,
        date: normalizedDate,
        snippet: messageDetails.snippet,
        body: await this.extractEmailBody(messageDetails),
      };

      logger.debug('Processing message:', {
        messageId: emailData.messageId,
        subject: emailData.subject,
        sender: emailData.senderEmail,
      });

      // Classify the email
      const classification = await this.deepseek.classifyEmail(emailData);

      // Determine action based on classification
      let actionTaken = 'none';
      let isQuarantined = false;
      let quarantinedAt = null;

      // Quarantine high-confidence phishing OR spam emails
        const shouldQuarantine = 
        (classification.classification === 'phish' || classification.classification === 'spam') &&
        classification.confidence >= 0.7;

        if (shouldQuarantine) {
        // Quarantine phishing emails with high confidence
        await this.gmail.moveToSpam(messageId);
        actionTaken = 'quarantined';
        isQuarantined = true;
        quarantinedAt = new Date().toISOString();

        logger.warn(`🔒 QUARANTINED phishing email: ${emailData.subject} from ${emailData.senderEmail}`);
      } else {
        // For benign emails, deliver to inbox and mark unread
        await this.gmail.moveToInbox(messageId);
        await this.gmail.markUnread(messageId);
        actionTaken = 'delivered';
        logger.info(`✅ Delivered to inbox: ${emailData.subject}`);
      }

      // Save classification to database
      const dbRecord = await this.db.saveClassification({
        messageId: emailData.messageId,
        emailAddress: emailData.senderEmail,
        subject: emailData.subject,
        senderName: emailData.senderName,
        senderEmail: emailData.senderEmail,
        receivedAt: emailData.date,
        classification: classification.classification,
        confidenceScore: classification.confidence,
        rawClassification: classification.rawResponse,
        actionTaken,
        isQuarantined,
        quarantinedAt,
      });

      // Mark as processed
      this.processingHistory.add(messageId);

      logger.info(`✓ Processed: ${emailData.subject} → ${classification.classification} (${classification.confidence})`);

      // Log processing success
      await this.db.saveProcessingLog('message_processing', 'success', messageId, {
        classification: classification.classification,
        confidence: classification.confidence,
        quarantined: isQuarantined,
      });

      return {
        processed: true,
        quarantined: isQuarantined,
        classification: classification.classification,
        confidence: classification.confidence,
      };

    } catch (error) {
      logger.error(`Error processing message ${messageId}:`, error);
      await this.db.saveProcessingLog('message_processing', 'error', messageId, null, error.message);
      throw error;
    }
  }

  parseSender(fromHeader) {
    if (!fromHeader || fromHeader === 'Unknown') {
      return { name: 'Unknown', email: 'Unknown' };
    }

    // Parse "Name <email@example.com>" format
    const nameMatch = fromHeader.match(/^(.+)\s+<(.+)>$/);
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        email: nameMatch[2],
      };
    }

    // Parse "email@example.com" format
    const emailMatch = fromHeader.match(/^<?(.+@[^>]+)>?$/);
    if (emailMatch) {
      return {
        name: emailMatch[1],
        email: emailMatch[1],
      };
    }

    // Fallback
    return {
      name: fromHeader,
      email: fromHeader,
    };
  }

  async extractEmailBody(messageDetails) {
    try {
      // Extract body from Gmail message structure
      if (messageDetails.fullMessage && messageDetails.fullMessage.payload) {
        const payload = messageDetails.fullMessage.payload;

        if (payload.body && payload.body.data) {
          // Simple body
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }

        if (payload.parts) {
          // Multi-part message
          for (const part of payload.parts) {
            if (part.body && part.body.data && part.mimeType === 'text/plain') {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }

            if (part.body && part.body.data && part.mimeType === 'text/html') {
              // Extract text from HTML if plain text not found
              const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
              return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            }
          }
        }
      }

      return messageDetails.snippet || '';
    } catch (error) {
      logger.warn('Failed to extract email body, using snippet instead:', error.message);
      return messageDetails.snippet || '';
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Continuous polling method
  async startPolling(options = {}) {
    const {
      intervalSeconds = 60, // Poll every 60 seconds
      hoursToProcess = 1, // Process emails from last 1 hour
      maxRuns = null, // null = run indefinitely
    } = options;

    let runCount = 0;

    logger.info(`🔄 Starting continuous polling (interval: ${intervalSeconds}s)`);

    while (maxRuns === null || runCount < maxRuns) {
      try {
        runCount++;
        logger.info(`📊 Polling run #${runCount}`);

        const result = await this.processRecentEmails(hoursToProcess);

        logger.info(`📈 Run ${runCount} stats: ${result.processed} processed, ${result.quarantined} quarantined`);

        // Clear processing history periodically to prevent memory leaks
        if (runCount % 10 === 0) {
          this.processingHistory.clear();
          logger.debug('Cleared processing history cache');
        }

        // Wait for next interval
        logger.debug(`Waiting ${intervalSeconds} seconds for next poll...`);
        await this.sleep(intervalSeconds * 1000);

      } catch (error) {
        logger.error(`Polling run #${runCount} failed:`, error);
        await this.db.saveProcessingLog('polling', 'error', null, { runCount }, error.message);

        // Wait before retrying
        await this.sleep(Math.max(intervalSeconds, 30) * 1000);
      }
    }

    logger.info('🛑 Polling completed (reached max runs)');
  }

  async getStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const phishing = await this.db.getClassificationsByType('phish', 10);
      const spam = await this.db.getClassificationsByType('spam', 10);
      const benign = await this.db.getClassificationsByType('benign', 10);
      const quarantined = await this.db.getQuarantinedEmails(10);
      const recentErrors = await this.db.getProcessingErrors(10);

      // Get counts
      const { rows: [phishCount] } = await this.db.pool.query(
        `SELECT COUNT(*) as count FROM email_classifications WHERE classification = 'phish'`
      );

      const { rows: [spamCount] } = await this.db.pool.query(
        `SELECT COUNT(*) as count FROM email_classifications WHERE classification = 'spam'`
      );

      const { rows: [benignCount] } = await this.db.pool.query(
        `SELECT COUNT(*) as count FROM email_classifications WHERE classification = 'benign'`
      );

      const { rows: [quarantinedCount] } = await this.db.pool.query(
        `SELECT COUNT(*) as count FROM email_classifications WHERE is_quarantined = true`
      );

      return {
        summary: {
          total: parseInt(phishCount.count) + parseInt(spamCount.count) + parseInt(benignCount.count),
          phishing: parseInt(phishCount.count),
          spam: parseInt(spamCount.count),
          benign: parseInt(benignCount.count),
          quarantined: parseInt(quarantinedCount.count),
        },
        recent: {
          phishing,
          spam,
          benign,
          quarantined,
        },
        errors: recentErrors,
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return null;
    }
  }

  async shutdown() {
    logger.info('Shutting down Email Processor...');

    try {
      await this.db.disconnect();
      logger.info('✅ Email Processor shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

module.exports = EmailProcessor;
