const GmailService = require('../services/gmail-service');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

async function insertEmlFiles() {
  try {
    logger.info('🚀 Starting to insert .eml files into inbox...');

    const gmail = new GmailService();
    await gmail.init();

    const PHISHING_DIR = '/Users/penghuizhang/Downloads/phishing_pot-main 2/email';
    const files = await fs.readdir(PHISHING_DIR);
    const emlFiles = files.filter(f => f.endsWith('.eml')).slice(0, 10);

    logger.info(`Found ${emlFiles.length} .eml files`);

    for (let i = 0; i < emlFiles.length; i++) {
      const filename = emlFiles[i];
      logger.info(`📧 Processing ${filename} (${i + 1}/${emlFiles.length})`);

      const filePath = path.join(PHISHING_DIR, filename);
      const emlContent = await fs.readFile(filePath, 'utf8');

      // Encode the raw message
      const encodedMessage = Buffer.from(emlContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Insert directly into inbox
      const response = await gmail.gmail.users.messages.insert({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          labelIds: ['INBOX', 'UNREAD']
        }
      });

      logger.info(`✓ Inserted ${filename}: ${response.data.id}`);

      // Add delay between inserts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('\\n🎉 All .eml files inserted successfully!');
    logger.info('Allow 1-2 minutes for the classification service to process them.');

  } catch (error) {
    logger.error('❌ Failed to insert .eml files:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  insertEmlFiles();
}

module.exports = { insertEmlFiles };
