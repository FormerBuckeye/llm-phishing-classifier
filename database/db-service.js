const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'email_classifier',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  async connect() {
    try {
      this.pool = new Pool(this.config);

      // Test the connection
      const client = await this.pool.connect();
      client.release();

      logger.info('✅ Connected to PostgreSQL database');
    } catch (error) {
      logger.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async saveClassification(classificationData) {
    const {
      messageId,
      emailAddress,
      subject,
      senderName,
      senderEmail,
      receivedAt,
      classification,
      confidenceScore,
      rawClassification,
      actionTaken,
      isQuarantined,
      quarantinedAt,
    } = classificationData;

    // First, check if we already have this message
    const existingCheck = await this.findClassificationByMessageId(messageId);

    if (existingCheck) {
      // Update existing classification
      const updateQuery = `
        UPDATE email_classifications
        SET
          email_address = $2,
          subject = $3,
          sender_name = $4,
          sender_email = $5,
          received_at = $6,
          classification = $7,
          confidence_score = $8,
          raw_classification_data = $9,
          action_taken = $10,
          is_quarantined = $11,
          quarantined_at = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE message_id = $1
        RETURNING *
      `;

      const values = [
        messageId,
        emailAddress,
        subject,
        senderName,
        senderEmail,
        receivedAt,
        classification,
        confidenceScore,
        rawClassification,
        actionTaken,
        isQuarantined,
        quarantinedAt,
      ];

      const result = await this.pool.query(updateQuery, values);
      logger.debug('Updated existing classification for message:', messageId);
      return result.rows[0];
    }

    // Insert new classification
    const insertQuery = `
      INSERT INTO email_classifications (
        message_id,
        email_address,
        subject,
        sender_name,
        sender_email,
        received_at,
        classification,
        confidence_score,
        raw_classification_data,
        action_taken,
        is_quarantined,
        quarantined_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      messageId,
      emailAddress,
      subject,
      senderName,
      senderEmail,
      receivedAt,
      classification,
      confidenceScore,
      rawClassification,
      actionTaken,
      isQuarantined,
      quarantinedAt,
    ];

    try {
      const result = await this.pool.query(insertQuery, values);
      logger.debug('Saved new classification to database', { messageId, classification });
      return result.rows[0];
    } catch (error) {
      logger.error('Database error saving classification:', error);
      throw error;
    }
  }

  async findClassificationByMessageId(messageId) {
    const query = 'SELECT * FROM email_classifications WHERE message_id = $1';
    const result = await this.pool.query(query, [messageId]);
    return result.rows[0] || null;
  }

  async getStatsByDate(date) {
    const query = `
      SELECT
        email_address,
        COUNT(*) as total_emails,
        SUM(CASE WHEN classification = 'phish' THEN 1 ELSE 0 END) as phishing_count,
        SUM(CASE WHEN classification = 'spam' THEN 1 ELSE 0 END) as spam_count,
        SUM(CASE WHEN classification = 'benign' THEN 1 ELSE 0 END) as benign_count,
        SUM(CASE WHEN is_quarantined = true THEN 1 ELSE 0 END) as quarantined_count
      FROM email_classifications
      WHERE DATE(received_at) = $1
      GROUP BY email_address
    `;

    const result = await this.pool.query(query, [date]);
    return result.rows;
  }

  async saveProcessingLog(processType, status, messageId = null, details = null, error = null) {
    const query = `
      INSERT INTO processing_log (process_type, status, message_id, details, error_message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      processType,
      status,
      messageId,
      details ? JSON.stringify(details) : null,
      error,
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving processing log:', error);
      // Don't throw - processing log failures shouldn't break the main flow
    }
  }

  async getRecentClassifications(limit = 100, offset = 0) {
    const query = `
      SELECT * FROM email_classifications
      ORDER BY received_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  async getClassificationsByType(classification, limit = 100) {
    const query = `
      SELECT * FROM email_classifications
      WHERE classification = $1
      ORDER BY received_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [classification, limit]);
    return result.rows;
  }

  async getQuarantinedEmails(limit = 100) {
    const query = `
      SELECT * FROM email_classifications
      WHERE is_quarantined = true
      ORDER BY quarantined_at DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getDailyStats(date) {
    const query = `
      SELECT * FROM classification_stats
      WHERE classification_date = $1
      ORDER BY email_address
    `;

    const result = await this.pool.query(query, [date]);
    return result.rows;
  }

  async getProcessingErrors(limit = 50) {
    const query = `
      SELECT * FROM processing_log
      WHERE status = 'error'
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async cleanupOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const queries = [
      `DELETE FROM email_classifications WHERE created_at < $1`,
      `DELETE FROM processing_log WHERE created_at < $1`,
    ];

    for (const query of queries) {
      const result = await this.pool.query(query, [cutoffDate]);
      logger.info(`Cleaned up ${result.rowCount} rows from ${query.split('FROM')[1].trim()}`);
    }

    logger.info(`Database cleanup completed - removed data older than ${daysToKeep} days`);
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Disconnected from database');
    }
  }

  // Save system logs for debugging and audit trail
  async saveSystemLog(level, message, meta = null) {
    try {
      const query = `
        INSERT INTO system_logs (level, message, meta, timestamp)
        VALUES ($1, $2, $3, NOW())
      `;

      const values = [
        level,
        message.substring(0, 4000), // Truncate long messages
        meta ? JSON.stringify(meta).substring(0, 10000) : null // Truncate long meta
      ];

      await this.pool.query(query, values);
    } catch (error) {
      // Log to console if database logging fails
      console.error('Database logging failed:', error.message);
    }
  }
}

module.exports = DatabaseService;
