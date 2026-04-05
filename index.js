const EmailProcessor = require('./services/email-processor');
const logger = require('./utils/logger');
const path = require('path');
require('dotenv').config();

class EmailClassificationApp {
  constructor() {
    this.processor = null;
    this.isRunning = false;
  }

  async start() {
    try {
      logger.info('🚀 Starting Email Classification Stack');
      logger.info('Configuration:', {
        pollInterval: `${process.env.POLL_INTERVAL_SECONDS || 60}s`,
        hoursToProcess: `${process.env.HOURS_TO_PROCESS || 1}h`,
        quarantineEnabled: process.env.ENABLE_QUARANTINE !== 'false',
        database: this.getDatabaseInfo(),
      });

      this.processor = new EmailProcessor();
      await this.processor.init();

      this.isRunning = true;
      this.setupShutdownHandlers();

      // Start continuous polling
      await this.processor.startPolling({
        intervalSeconds: parseInt(process.env.POLL_INTERVAL_SECONDS || 60),
        labelMode: process.env.LABEL_MODE === 'true',
        labelName: process.env.PENDING_LABEL || 'PENDING_CLASSIFICATION',
        hoursToProcess: parseInt(process.env.HOURS_TO_PROCESS || 1),
        maxRuns: process.env.MAX_RUNS ? parseInt(process.env.MAX_RUNS) : null,
      });

    } catch (error) {
      logger.error('❌ Failed to start Email Classification Stack:', error);
      this.shutdown(1);
    }
  }

  getDatabaseInfo() {
    return {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'email_classifier',
      user: process.env.DB_USER || 'postgres',
      // Don't log password
    };
  }

  setupShutdownHandlers() {
    // Handle graceful shutdown
    const shutdownHandler = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await this.shutdown(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown(1);
    });
  }

  async shutdown(code = 0) {
    if (!this.isRunning) {
      process.exit(code);
    }

    this.isRunning = false;

    try {
      if (this.processor) {
        await this.processor.shutdown();
      }

      logger.info('✅ Shutdown completed successfully');
      process.exit(code);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  async runOnce() {
    // Single-run mode for testing
    try {
      logger.info('📋 Running single email processing cycle...');

      this.processor = new EmailProcessor();
      await this.processor.init();

      const result = await this.processor.processRecentEmails(
        parseInt(process.env.HOURS_TO_PROCESS || 1)
      );

      logger.info(`✅ Single run completed: ${result.processed} processed, ${result.quarantined} quarantined`);

      // Show stats
      const stats = await this.processor.getStats();
      if (stats) {
        logger.info('📊 Current Statistics:');
        logger.info(`   Total: ${stats.summary.total}`);
        logger.info(`   Phishing: ${stats.summary.phishing}`);
        logger.info(`   Spam: ${stats.summary.spam}`);
        logger.info(`   Benign: ${stats.summary.benign}`);
        logger.info(`   Quarantined: ${stats.summary.quarantined}`);
      }

      await this.processor.shutdown();

    } catch (error) {
      logger.error('❌ Single run failed:', error);
      if (this.processor) {
        await this.processor.shutdown();
      }
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const app = new EmailClassificationApp();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--once') || args.includes('-o')) {
    app.runOnce();
  } else {
    app.start();
  }
}

module.exports = EmailClassificationApp;
