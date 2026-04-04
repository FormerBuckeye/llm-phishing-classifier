const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels'
];

const TOKEN_PATH = path.join(__dirname, '../config/token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json');

class GmailService {
  constructor() {
    this.auth = null;
    this.gmail = null;
  }

  async init() {
    try {
      this.auth = await this.authorize();
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      logger.info('✅ Gmail service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Gmail service:', error);
      throw error;
    }
  }

  async authorize() {
    try {
      const credentials = this.loadCredentials();
      const token = this.loadToken();

      if (token) {
        const auth = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          credentials.redirect_uris[0]
        );
        auth.setCredentials(token);

        // Verify token is still valid
        try {
          await this.verifyToken(auth);
          return auth;
        } catch (err) {
          logger.info('Token expired or invalid, re-authenticating...');
        }
      }

      // If no valid token, get new authentication
      return await this.getNewToken(credentials);
    } catch (error) {
      logger.error('Authorization failed:', error);
      throw error;
    }
  }

  loadCredentials() {
    try {
      const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
      const credentials = JSON.parse(content);

      if (credentials.installed) {
        return credentials.installed;
      }
      if (credentials.web) {
        return credentials.web;
      }
      return credentials;
    } catch (error) {
      throw new Error(
        `Cannot load credentials from ${CREDENTIALS_PATH}. ` +
        `Please add your OAuth2 credentials file. Error: ${error.message}`
      );
    }
  }

  loadToken() {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const tokenContent = fs.readFileSync(TOKEN_PATH, 'utf8');
        return JSON.parse(tokenContent);
      }
      return null;
    } catch (error) {
      logger.warn('Could not load token:', error.message);
      return null;
    }
  }

  async getNewToken(credentials) {
    const auth = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uris[0]
    );

    const authClient = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });

    // Save the token
    this.saveToken(authClient.credentials);
    logger.info('✅ New token saved successfully');

    return authClient;
  }

  saveToken(token) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  }

  async verifyToken(auth) {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    await oauth2.userinfo.get();
  }

  async listMessages(maxResults = 100, query = '') {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
      });

      return response.data.messages || [];
    } catch (error) {
      logger.error('Error listing messages:', error);
      throw error;
    }
  }

  async getMessage(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return response.data;
    } catch (error) {
      logger.error(`Error getting message ${messageId}:`, error);
      throw error;
    }
  }

  async getMessageDetails(messageId) {
    try {
      const message = await this.getMessage(messageId);
      const headers = {};

      if (message.payload && message.payload.headers) {
        message.payload.headers.forEach(header => {
          headers[header.name.toLowerCase()] = header.value;
        });
      }

      return {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        snippet: message.snippet,
        historyId: message.historyId,
        internalDate: message.internalDate,
        headers: {
          subject: headers['subject'] || 'No Subject',
          from: headers['from'] || 'Unknown',
          to: headers['to'] || '',
          date: headers['date'] || new Date().toISOString(),
          messageId: headers['message-id'] || message.id,
        },
        fullMessage: message,
      };
    } catch (error) {
      logger.error(`Error getting message details for ${messageId}:`, error);
      throw error;
    }
  }

  async getRecentMessages(hours = 1, maxResults = 50) {
    try {
      // Query for messages from the last N hours (include both inbox and spam)
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const dateStr = since.toISOString().split('T')[0];
      const query = `in:inbox OR in:spam after:${dateStr}`;

      const messages = await this.listMessages(maxResults, query);
      logger.info(`Found ${messages.length} messages from the last ${hours} hour(s)`);

      return messages;
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw error;
    }
  }

  async modifyMessageLabels(messageId, addLabelIds = [], removeLabelIds = []) {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds,
        },
      });

      logger.info(`Modified labels for message ${messageId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error modifying labels for ${messageId}:`, error);
      throw error;
    }
  }

  async moveToSpam(messageId) {
    try {
      // Get label ID for SPAM
      const labels = await this.gmail.users.labels.list({
        userId: 'me',
      });

      const spamLabel = labels.data.labels.find(label => label.name === 'SPAM');
      if (!spamLabel) {
        throw new Error('SPAM label not found');
      }

      // Remove INBOX label and add SPAM label
      const result = await this.modifyMessageLabels(
        messageId,
        [spamLabel.id],
        ['INBOX']
      );

      logger.info(`Message ${messageId} moved to Spam`);
      return result;
    } catch (error) {
      logger.error(`Error moving message ${messageId} to spam:`, error);
      throw error;
    }
  }

  async getLabelId(labelName) {
    try {
      const labels = await this.gmail.users.labels.list({
        userId: 'me',
      });

      const label = labels.data.labels.find(l => l.name === labelName);
      return label ? label.id : null;
    } catch (error) {
      logger.error('Error getting labels:', error);
      throw error;
    }
  }

  async startWatch() {
    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          labelFilterAction: 'include',
          topicName: process.env.GMAIL_PUBSUB_TOPIC,
        },
      });

      logger.info('Started watching Gmail for changes:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error starting Gmail watch:', error);
      throw error;
    }
  }

  async stopWatch() {
    // Stop the watch - note: Gmail watch expires after 7 days anyway
    logger.info('Gmail watch will expire automatically after 7 days');
  }
}

module.exports = GmailService;
