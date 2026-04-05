#!/usr/bin/env node
require('dotenv').config();

/**
 * V2 Integration Test - End-to-end testing
 *
 * Tests complete V2 flow: label creation, filter, processing pipeline
 */

const GmailService = require('../services/gmail-service');
const EmailProcessor = require('../services/email-processor');
const logger = require('../utils/logger');

async function testV2Integration() {
  logger.info('╔═══════════════════════════════════════════════════════════════╗');
  logger.info('║ V2 Integration Test - Complete End-to-End Testing           ║');
  logger.info('╚═══════════════════════════════════════════════════════════════╝\n');

  const results = {
    phase1_labelManagement: null,
    phase2_filterCreation: null,
    phase3_labelBasedPolling: null,
    phase4_endToEndFlow: null,
  };

  // Test Phase 1: Label Management
  logger.info('📋 Test Phase 1: Gmail Label Management\n');
  const gmail = new GmailService();
  await gmail.init();

  try {
    // Test 1.1: Create/get pending label
    const labelName = process.env.PENDING_LABEL || 'PENDING_CLASSIFICATION';
    const labelId = await gmail.getOrCreateLabel(labelName);

    if (!labelId) throw new Error('Failed to create label');

    logger.info(`✅ Label '${labelName}' ready: ${labelId}`);
    results.phase1_labelManagement = 'PASS';

    // Test 1.2: Apply label to test message
    // We'll use a known message ID if available
    logger.info('ℹ️  Test 1.2: Apply label - requires existing message ID');

    // Test 1.3: Remove label
    logger.info('ℹ️  Test 1.3: Remove label - requires existing message ID');

  } catch (error) {
    logger.error(`❌ Phase 1 failed: ${error.message}`);
    results.phase1_labelManagement = 'FAIL';
  }

  // Test Phase 2: Filter Creation
  logger.info('\n📋 Test Phase 2: Gmail Filter Creation\n');
  try {
    const labelName = process.env.PENDING_LABEL || 'PENDING_CLASSIFICATION';
    const labelId = await gmail.getLabelId(labelName);

    logger.info(`Creating filter for label '${labelName}' (${labelId})`);

    const filter = await gmail.createGmailFilter(
      { size: 1, sizeComparison: 'larger' }, // Match all (size > 1 byte)
      { addLabelIds: [labelId], removeLabelIds: ['UNREAD'] }
    );

    if (!filter) throw new Error('Filter creation failed');

    logger.info(`✅ Filter created: ${filter.id}`);
    results.phase2_filterCreation = 'PASS';

  } catch (error) {
    logger.error(`❌ Phase 2 failed: ${error.message}`);
    results.phase2_filterCreation = 'FAIL';
  }

  // Test Phase 3: Label-based Polling
  logger.info('\n📋 Test Phase 3: Label-Based Polling\n');
  const processor = new EmailProcessor();
  await processor.init();

  try {
    const labelName = process.env.PENDING_LABEL || 'PENDING_CLASSIFICATION';
    const labelId = await gmail.getLabelId(labelName);

    if (!labelId) {
      logger.error(`❌ Label ${labelName} not found`);
      results.phase3_labelBasedPolling = 'FAIL';
    } else {
      // Test getMessagesByLabel
      const messages = await gmail.getMessagesByLabel(labelId, 10);

      if (messages === null) {
        logger.info('✅ getMessagesByLabel works (returned null for empty queue)');
      } else if (Array.isArray(messages)) {
        logger.info(`✅ getMessagesByLabel works (found ${messages.length} messages)`);
      } else {
        throw new Error('Unexpected return type');
      }

      logger.info('✅ Phase 3 functions correctly');
      results.phase3_labelBasedPolling = 'PASS';
    }

  } catch (error) {
    logger.error(`❌ Phase 3 failed: ${error.message}`);
    results.phase3_labelBasedPolling = 'FAIL';
  }

  // Test Phase 4: End-to-end flow (requires test email)
  logger.info('\n📋 Test Phase 4: End-to-End Processing Flow\n');
  try {
    logger.info('To test full flow, manually:');
    logger.info('1. Send test email to Gmail account');
    logger.info('2. Verify it gets PENDING_CLASSIFICATION label');
    logger.info('3. Run: tail -f logs/system.log');
    logger.info('4. Verify processing completes without errors');
    logger.info('5. Check database for classification record\n');

    results.phase4_endToEndFlow = 'NEEDS_MANUAL_TEST';

  } catch (error) {
    logger.error(`❌ Phase 4 failed: ${error.message}`);
    results.phase4_endToEndFlow = 'FAIL';
  }

  // Summary
  logger.info('\n' + '='.repeat(60));
  logger.info('\n📊 V2 Integration Test Results:\n');
  logger.info(`Phase 1 - Label Management: ${results.phase1_labelManagement}`);
  logger.info(`Phase 2 - Filter Creation: ${results.phase2_filterCreation}`);
  logger.info(`Phase 3 - Label Polling: ${results.phase3_labelBasedPolling}`);
  logger.info(`Phase 4 - End-to-End: ${results.phase4_endToEndFlow}`);

  const allPassed = Object.values(results).every(r => r === 'PASS');

  if (allPassed) {
    logger.info('\n✅ All automated tests PASSED!');
    logger.info('\n💡 Next: Test with real email flow');
    logger.info('   Run: node tools/setup-priority-routing.js');
    logger.info('   Then: Send test email and monitor logs\n');
    await gmail.shutdown();
    await processor.shutdown();
    process.exit(0);
  } else {
    logger.error('\n❌ Some tests FAILED - review and fix issues');
    await gmail.shutdown();
    await processor.shutdown();
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testV2Integration()
    .then(() => {
      console.log('\n✅ V2 integration test completed\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ V2 integration test failed:', error.message, '\n');
      process.exit(1);
    });
}

module.exports = { testV2Integration };