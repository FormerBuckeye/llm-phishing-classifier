const axios = require('axios');
const logger = require('../utils/logger');
const PromptBuilder = require('./classifier-prompt-builder');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.promptBuilder = new PromptBuilder();

    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  async classifyEmail(emailData, similarExamples = null) {
    try {
      const prompt = this.promptBuilder.buildPrompt(emailData, similarExamples);

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 100,
        response_format: { type: 'json_object' },
      });

      const result = this.parseClassificationResponse(response.data);

      logger.info('Email classification completed', {
        subject: emailData.subject,
        classification: result.classification,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('DeepSeek classification failed:', error.message);

      if (error.response) {
        logger.error('DeepSeek API error response:', {
          status: error.response.status,
          data: error.response.data,
        });
      }

      throw error;
    }
  }

  getSystemPrompt() {
    return `You are an expert email security analyst specializing in phishing and spam detection. Your task is to analyze emails and classify them as either "phish", "spam", or "benign".

Classification criteria:
1. **phish**: Emails attempting to steal credentials, sensitive information, or containing malicious links. Includes:
   - Suspicious URLs or links to unknown domains
   - Requests for passwords, credit cards, or personal information
   - Urgent/stressful language pushing immediate action
   - Spoofed sender addresses mimicking legitimate organizations
   - Attachments with suspicious file types

2. **spam**: Unsolicited promotional or unwanted emails that are not malicious. Includes:
   - Marketing emails without consent
   - Newsletters the user didn't subscribe to
   - Repeated promotional content
   - Generally annoying but not dangerous

3. **benign**: Legitimate emails that are safe. Includes:
   - Personal correspondence
   - Expected business communications
   - Subscribed newsletters
   - Transactional emails from trusted sources

Respond ONLY with a JSON object in this exact format:
{
  "classification": "phish|spam|benign",
  "confidence": 0.00-1.00,
  "reason": "Brief explanation of why this classification was chosen"
}

Be conservative - when in doubt, prefer "benign" over false positives.`;
  }

  buildClassificationPrompt(emailData) {
    return `Analyze this email and classify it as "phish", "spam", or "benign".

Email Details:
- From: ${emailData.senderName || 'Unknown'} <${emailData.senderEmail}>
- Subject: ${emailData.subject}
- Date: ${emailData.date || new Date().toISOString()}

Email Body:
${emailData.body || emailData.snippet || 'No body content available'}

Important: If the email body contains URLs, pay close attention to:
- Domain reputation (is it a known legitimate domain?)
- URL structure (suspicious subdomains, URL shorteners)
- Whether the displayed text matches the actual URL

Classification:`;
  }

  parseClassificationResponse(response) {
    try {
      // Extract content from the response
      const content = response.choices[0].message.content;

      // Debug: Log the raw response when it looks suspicious
      if (!content || content.length > 500 || !content.trim().startsWith('{')) {
        logger.warn('Suspicious DeepSeek response format:', {
          content_preview: content?.substring(0, 200),
          content_length: content?.length,
        });
      }

      const parsed = JSON.parse(content);

      // Validate the response structure
      if (!parsed.classification || !parsed.confidence || !parsed.reason) {
        logger.error('Invalid response structure from DeepSeek:', JSON.stringify(parsed, null, 2));
        throw new Error('Invalid response structure from DeepSeek');
      }

      // Normalize classification
      const normalizedClassification = parsed.classification.toLowerCase();
      if (!['phish', 'spam', 'benign'].includes(normalizedClassification)) {
        logger.error('Invalid classification value:', parsed.classification);
        throw new Error(`Invalid classification: ${parsed.classification}`);
      }

      return {
        classification: normalizedClassification,
        confidence: Math.max(0, Math.min(1, parseFloat(parsed.confidence))),
        reason: parsed.reason,
        rawResponse: parsed,
      };
    } catch (error) {
      logger.error('Failed to parse DeepSeek response:', error);
      logger.error('Raw response that failed to parse:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response format from DeepSeek API');
    }
  }

  async testConnection() {
    try {
      const response = await this.client.get('/models');
      logger.info('✅ DeepSeek API connection successful');
      logger.debug('Available models:', response.data);
      return true;
    } catch (error) {
      logger.error('❌ DeepSeek API connection failed:', error.message);
      return false;
    }
  }

  async batchClassify(emails) {
    // For future enhancement - batch classification
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.classifyEmail(email);
        results.push({ email, result });
      } catch (error) {
        results.push({
          email,
          result: {
            classification: 'error',
            confidence: 0,
            reason: error.message,
          },
        });
      }
    }

    return results;
  }
}

module.exports = DeepSeekService;
