#!/usr/bin/env node

/**
 * Setup Priority Routing for Email Classification
 *
 * This script automates the setup of Gmail filters for V2 label-based processing.
 * It creates the PENDING_CLASSIFICATION label and filter rule.
 */

const GmailService = require('../services/gmail-service');
const logger = require('../utils/logger');

async function setupPriorityRouting() {
  try {
    logger.info('╔════════════════════════════════════════════════════╗');
    logger.info('║    Setting Up Priority Routing (V2)              ║');
    logger.info('╚════════════════════════════════════════════════════╝');

    // Initialize Gmail service
    const gmail = new GmailService();
    await gmail.init();

    // Step 1: Create or get PENDING_CLASSIFICATION label
    logger.info('\nStep 1: Creating PENDING_CLASSIFICATION label...\n');

    const labelName = process.env.PENDING_LABEL || 'PENDING_CLASSIFICATION';
    const labelId = await gmail.getOrCreateLabel(labelName);

    if (!labelId) {
      throw new Error(`Failed to get or create label: ${labelName}`);
    }

    logger.info(`✓ Label ready: ${labelName} (${labelId})`);

    // Step 2: Create Gmail filter
    logger.info('\nStep 2: Creating Gmail filter...\n');

    // Filter criteria: match all emails (size > 0 is a universal condition)
    const filterCriteria = {
      size: 0,
      sizeComparison: 'larger',
    };

    // Filter actions: apply label and mark as read
    const filterActions = {
      addLabelIds: [labelId],
      removeLabelIds: ['UNREAD'], // Mark as read initially
    };

    const filter = await gmail.createGmailFilter(filterCriteria, filterActions);

    if (!filter) {
      throw new Error('Failed to create Gmail filter');
    }

    logger.info(`✓ Gmail filter created: ${filter.id}`);
    logger.info('\n╔════════════════════════════════════════════════════╗');
    logger.info('║    Setup Complete!                                 ║');
    logger.info('╚════════════════════════════════════════════════════╝');
    logger.info('\nNext steps:');
    logger.info('1. Update .env: PENDING_LABEL=PENDING_CLASSIFICATION');
    logger.info('2. Restart service to enable label-based polling');
    logger.info('3. Test by sending an email and verifying label application\n');

    await gmail.shutdown();

    return { success: true, labelId, filterId: filter.id };

  } catch (error) {
    logger.error('\n❌ Setup failed:', error.message);
    logger.error('\nTroubleshooting:');
    logger.error('- Verify GMAIL_SCOPES includes gmail.labels and gmail.modify');
    logger.error('- Check credentials.json and token.json are valid');
    logger.error('- Ensure you have permission to create filters\n');
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupPriorityRouting()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Setup completed successfully!\n');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n❌ Setup failed with exit code 1\n');
      process.exit(1);
    });
} else {
  module.exports = { setupPriorityRouting };
}