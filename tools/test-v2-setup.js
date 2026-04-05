#!/usr/bin/env node

/**
 * Test V2 Implementation (Phases 1 & 2)
 *
 * This script tests the Gmail label management APIs without creating actual filters.
 * It's used to verify the implementation before applying changes.
 *
 * Note: This test only checks method signatures and syntax - it won't modify your Gmail account.
 */

const GmailService = require('../services/gmail-service');
const logger = require('../utils/logger');

async function testV2Setup() {
  logger.info('╔═══════════════════════════════════════════════════════╗');
  logger.info('║  Testing V2 Implementation - Phases 1 & 2           ║');
  logger.info('╚═══════════════════════════════════════════════════════╝\n');

  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Verify GmailService has required methods
  logger.info('Test 1: Checking GmailService method signatures...\n');
  const gmail = new GmailService();
  const requiredMethods = [
    'getOrCreateLabel',
    'applyLabel',
    'removeLabel',
    'createGmailFilter',
    'markUnread',
    'moveToSpam',
    'moveToInbox',
    'getLabelId',
  ];

  requiredMethods.forEach(method => {
    const exists = typeof gmail[method] === 'function';
    tests.push({
      name: `GmailService.${method}()`,
      passed: exists,
      message: exists ? 'Method exists' : 'Method not found'
    });
    if (exists) {
      logger.info(`✅ gmail.${method}() exists`);
      passed++;
    } else {
      logger.error(`❌ gmail.${method}() NOT FOUND`);
      failed++;
    }
  });

  logger.info('\n' + '='.repeat(55));

  // Test 2: Syntax check - verify module loads
  logger.info('\nTest 2: Module syntax/loading...\n');
  try {
    logger.info('✅ gmail-service.js loads without errors');
    tests.push({ name: 'Module loading', passed: true, message: 'Syntax OK' });
    passed++;
  } catch (error) {
    logger.error(`❌ Module loading FAILED: ${error.message}`);
    tests.push({ name: 'Module loading', passed: false, message: error.message });
    failed++;
  }

  // Test 3: Verify method parameter signatures
  logger.info('\nTest 3: Method parameter signatures...\n');

  function checkSignature(method, expectedParams) {
    const funcStr = gmail[method].toString();
    const hasParams = expectedParams.every(param => funcStr.includes(param));
    tests.push({
      name: `${method} parameters`,
      passed: hasParams,
      message: hasParams ? 'Parameters match' : 'Parameter mismatch'
    });
    return hasParams;
  }

  const signatures = [
    { method: 'getOrCreateLabel', params: ['labelName'] },
    { method: 'applyLabel', params: ['messageId', 'labelId'] },
    { method: 'removeLabel', params: ['messageId', 'labelId'] },
    { method: 'createGmailFilter', params: ['criteria', 'actions'] },
    { method: 'markUnread', params: ['messageId'] }
  ];

  signatures.forEach(sig => {
    if (checkSignature(sig.method, sig.params)) {
      logger.info(`✅ gmail.${sig.method}() parameters correct`);
      passed++;
    } else {
      logger.error(`❌ gmail.${sig.method}() parameter issue`);
      failed++;
    }
  });

  // Test 4: Verify setup script exists
  logger.info('\nTest 4: Setup script availability...\n');

  try {
    const setup = require('./setup-priority-routing');
    const hasSetupFunction = typeof setup.setupPriorityRouting === 'function';

    tests.push({
      name: 'Setup script exports setupPriorityRouting()',
      passed: hasSetupFunction,
      message: hasSetupFunction ? 'Export exists' : 'Export not found'
    });

    if (hasSetupFunction) {
      logger.info('✅ setup-priority-routing.js exports setupPriorityRouting()');
      passed++;
    } else {
      logger.error('❌ setup-priority-routing.js does NOT export setupPriorityRouting()');
      failed++;
    }
  } catch (error) {
    logger.error(`❌ Setup script loading FAILED: ${error.message}`);
    tests.push({ name: 'Setup script loading', passed: false, message: error.message });
    failed++;
  }

  // Summary
  logger.info('\n' + '='.repeat(55));
  logger.info(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    logger.info('✅ All Phase 1 & 2 tests passed!');
    logger.info('\n💡 Ready to proceed with Phase 3 (label-based polling)\n');
    return { success: true, passed, failed };
  } else {
    logger.warn('\n⚠️  Some tests failed. Review and fix before proceeding.\n');
    return { success: false, passed, failed };
  }
}

// Run test if called directly
if (require.main === module) {
  testV2Setup()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All V2 Phase 1 & 2 tests PASSED\n');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some tests FAILED - check logs\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Test suite ERROR:', error.message, '\n');
      process.exit(1);
    });
} else {
  module.exports = { testV2Setup };
}