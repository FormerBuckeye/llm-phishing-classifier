const logger = require('../utils/logger');

/**
 * Build classification prompts with examples
 * Either dynamic (from embeddings) or static (fallback)
 */
class PromptBuilder {
  /**
   * Build prompt with examples (dynamic when embedding available, static otherwise)
   * @param {object} emailData - Email to classify
   * @param {Array<object>} similarExamples - Array of similar emails (optional, null for static)
   * @returns {string} Complete prompt for DeepSeek
   */
  buildPrompt(emailData, similarExamples = null) {
    if (similarExamples && similarExamples.length > 0) {
      return this.buildDynamicPrompt(emailData, similarExamples);
    } else {
      return this.buildStaticFallbackPrompt(emailData);
    }
  }

  /**
   * Build traditional static few-shot prompt (fallback)
   * @param {object} emailData - Email to classify
   * @returns {string} Prompt with fixed examples
   */
  buildStaticFallbackPrompt(emailData) {
    return `Analyze this email and classify it as "phish", "spam", or "benign".

Examples:
1. Subject: "Verify Your Email Now"
   Body: We detected suspicious activity. Click here to verify your account within 24 hours.
   Sender: no-reply-verify@security-alert.com
   → Classification: phish (0.95 confidence)

2. Subject: "Exciting Offer - 90% Off!"
   Body: Don't miss our biggest sale ever! Click now for exclusive deals.
   Sender: deals@marketing-spam.example.com
   → Classification: spam (0.85 confidence)

3. Subject: "Meeting Reminder"
   Body: Don't forget about our meeting at 3pm in conference room B.
   Sender: manager@company.com
   → Classification: benign (0.95 confidence)

Now classify this email:

Subject: ${emailData.subject}
From: ${emailData.senderEmail}
Date: ${emailData.receivedAt || new Date().toISOString()}

Body: ${emailData.body || emailData.snippet || 'No body content available'}

Provide JSON: {"classification": "phish|spam|benign", "confidence": 0.00-1.00, "reason": "brief explanation"}`;
  }

  /**
   * Build dynamic prompt with embedding-based similar examples
   * @param {object} emailData - Email to classify
   * @param {Array<object>} similarExamples - Similar examples from embedding search
   * @returns {string} Prompt with dynamic examples
   */
  buildDynamicPrompt(emailData, similarExamples) {
    const exampleSection = similarExamples.map((example, index) => {
      const similarity = (example.similarity * 100).toFixed(0);
      return `${index + 1}. Subject: "${example.subject}"
   Body: ${example.body.substring(0, 100)}${example.body.length > 100 ? '...' : ''}
   Sender: ${example.senderEmail}
   Similarity: ${similarity}%
   → Classification: ${example.classification} (${example.confidence} confidence)`;
    }).join('\n\n');

    return `Analyze this email and classify it as "phish", "spam", or "benign".

First, here are 3 emails most similar to yours (based on embedding similarity):

${exampleSection}

Now classify this email:

Subject: ${emailData.subject}
From: ${emailData.senderEmail}
Date: ${emailData.receivedAt || new Date().toISOString()}

Body: ${emailData.body || emailData.snippet || 'No body content available'}

Provide JSON: {"classification": "phish|spam|benign", "confidence": 0.00-1.00, "reason": "brief explanation"} `;
  }

  /**
   * Extract text from email for embedding
   * @param {object} emailData - Email data
   * @returns {string} Normalized text
   */
  extractEmbeddingText(emailData) {
    return `${emailData.subject} ${emailData.body || emailData.snippet || ''} ${emailData.senderEmail || ''}`;
  }
}

module.exports = PromptBuilder;
