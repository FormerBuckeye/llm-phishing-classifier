const fs = require('fs').promises;
const path = require('path');
const simpleParser = require('mailparser').simpleParser;
const GmailService = require('../services/gmail-service');
const logger = require('../utils/logger');

// Target email address
const TARGET_EMAIL = 'aegisaizph@gmail.com';
const PHISHING_DIR = '/Users/penghuizhang/Downloads/phishing_pot-main 2/email';

async function readEmlFile(filePath) {
  try {
    const emlContent = await fs.readFile(filePath, 'utf8');
    const parsed = await simpleParser(emlContent);

    return {
      subject: parsed.subject || 'No Subject',
      from: parsed.from?.text || 'unknown@example.com',
      to: parsed.to?.text || TARGET_EMAIL,
      text: parsed.text || '',
      html: parsed.html || '',
      date: parsed.date || new Date(),
      messageId: parsed.messageId || `test-${Date.now()}`,
      headers: parsed.headers
    };
  } catch (error) {
    logger.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

async function sendTestEmail(gmail, emailData, counter) {
  try {
    // Prepare raw email content
    const boundary = `===============${Date.now()}==`;

    let emailBody = '';
    if (emailData.html) {
      emailBody = emailData.html;
    } else if (emailData.text) {
      // Convert text to HTML if no HTML available
      emailBody = emailData.text.replace(/\n/g, '<br>');
    }

    // If body is empty, create a simple phishing-like content for testing
    if (!emailBody) {
      emailBody = `
        <html>
        <body>
          <h2>Urgent Security Alert</h2>
          <p>Your account has been compromised. Click here to verify:</p>
          <a href="http://suspicious-website.com/login">Verify Account</a>
        </body>
        </html>
      `;
    }

    const rawMessage = [
      `From: "${emailData.from}" <test-sender-${counter}@example.com>`,
      `To: ${TARGET_EMAIL}`,
      `Subject: [TEST-${counter}] ${emailData.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      emailBody
    ].join('\r\n');

    // Encode the message to base64
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const response = await gmail.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    logger.info(`✓ Sent test email ${counter}: ${emailData.subject}`);
    return response.data.id;
  } catch (error) {
    logger.error(`Failed to send test email ${counter}:`, error.message);
    return null;
  }
}

async function main() {
  try {
    logger.info('🚀 Starting phishing email test...');
    logger.info(`Target email: ${TARGET_EMAIL}`);
    logger.info(`Reading .eml files from: ${PHISHING_DIR}`);

    // Initialize Gmail service
    const gmail = new GmailService();
    await gmail.init();

    // Get list of .eml files
    const files = await fs.readdir(PHISHING_DIR);
    const emlFiles = files
      .filter(f => f.endsWith('.eml'))
      .slice(0, 10); // Take first 10

    logger.info(`Found ${emlFiles.length} .eml files to send`);

    // Process and send each email
    const sentMessages = [];
    let counter = 1;

    for (const filename of emlFiles) {
      logger.info(`\\n📧 Processing ${filename} (${counter}/${emlFiles.length})`);

      const filePath = path.join(PHISHING_DIR, filename);
      const emailData = await readEmlFile(filePath);

      if (emailData) {
        const messageId = await sendTestEmail(gmail, emailData, counter);

        if (messageId) {
          sentMessages.push({
            filename,
            messageId,
            subject: emailData.subject,
            timestamp: new Date().toISOString()
          });
        }

        // Add delay between sends
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      counter++;
    }

    logger.info(`\\n🎉 Sent ${sentMessages.length} test emails`);
    logger.info('Sent messages:', sentMessages);

    // Save report
    const reportPath = path.join(__dirname, '../logs/test-emails-sent.json');
    await fs.writeFile(reportPath, JSON.stringify(sentMessages, null, 2));
    logger.info(`\\n📋 Report saved to: ${reportPath}`);

    logger.info('\\n⏰ Allow 1-2 minutes for the classification service to process...');
    logger.info('Check database with:');
    logger.info('SELECT message_id, subject, classification, confidence_score FROM email_classifications WHERE sender_email LIKE \'%example.com\' ORDER BY created_at DESC;');

  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { readEmlFile, sendTestEmail };
