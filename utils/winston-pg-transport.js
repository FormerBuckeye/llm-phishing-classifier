const winston = require('winston');
const { Pool } = require('pg');

/**
 * PostgreSQL Transport for Winston
 * Saves all logs to PostgreSQL system_logs table
 */
class PostgresTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.dbService = options.dbService;
  }

  /**
 * Log method required by winston transports
 * @param {Object} logObject - Log information object from winston
 * @param {Function} callback - Callback function
 */
  log(logObject, callback) {
    // Extract only necessary fields to avoid recursion and size limits
    const level = logObject.level;
    const message = String(logObject.message).substring(0, 4000);
    const meta = logObject.meta !== undefined ? JSON.stringify(logObject.meta).substring(0, 10000) : null;

    this.dbService.saveSystemLog(level, message, meta)
      .then(() => {
        if (callback) callback(null, true);
      })
      .catch((error) => {
        // If database logging fails, log to console
        // But can't use logger here or we'd get infinite recursion
        console.error('Database logging failed:', error.message);
        if (callback) callback(error, null);
      });
  }
}

module.exports = PostgresTransport;
