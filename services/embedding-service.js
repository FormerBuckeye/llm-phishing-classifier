const { Configuration, OpenAIApi } = require('openai');
const logger = require('../utils/logger');

class EmbeddingService {
  constructor() {
    // Optional: only initialize if API key provided
    this.openai = null;
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAIApi(new Configuration({
        apiKey: process.env.OPENAI_API_KEY
      }));
      logger.info('✅ OpenAI embedding service initialized');
    } else {
      logger.info('ℹ️  OpenAI API key not provided - using static few-shot fallback');
    }
  }

  /**
   * Check if OpenAI embeddings are available
   * @returns {boolean} True if OpenAI is configured
   */
  isEnabled() {
    return this.openai !== null;
  }

  /**
   * Get embedding for text using OpenAI
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} 1536-dim vector
   */
  async getEmbedding(text) {
    if (!this.isEnabled()) {
      throw new Error('OpenAI not configured. Call isEnabled() first.');
    }

    try {
      const response = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: text
      });

      const embedding = response.data.data[0].embedding;
      logger.debug(`Generated embedding for text: ${text.substring(0, 50)}...`);

      return embedding;
    } catch (error) {
      logger.error('OpenAI embedding generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Array<number>} vecA - First vector
   * @param {Array<number>} vecB - Second vector
   * @returns {number} Cosine similarity (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find k-nearest neighbors (most similar embeddings)
   * @param {Array<number>} targetEmbedding - Query embedding
   * @param {Array<object>} candidates - Array of {id, embedding, metadata}
   * @param {number} k - Number of neighbors to return
   * @returns {Array<object>} Top k similar items with similarity scores
   */
  findNearestNeighbors(targetEmbedding, candidates, k = 3) {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const scored = candidates.map(candidate => ({
      ...candidate,
      similarity: this.cosineSimilarity(targetEmbedding, candidate.embedding)
    }));

    // Sort by similarity (descending) and take top k
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * Get static few-shot examples for fallback classification
   * Used when OpenAI is not configured
   * @returns {string} Formatted prompt examples
   */
  getStaticExamples() {
    return `Example 1:
Subject: Verify your email now
Body: We detected suspicious activity. Click here to verify...
Sender: no-reply-verify@security-alert.com
Classification: phish (0.95 confidence)

Example 2:
Subject: Exciting offer - 90% off everything!
Body: Don't miss our biggest sale ever!
Sender: deals@marketing-spam.example.com
Classification: spam (0.85 confidence)

Example 3:
Subject: Weekly team meeting
Body: Reminder about our meeting at 3pm
Sender: manager@company.com
Classification: benign (0.95 confidence)`;
  }
}

module.exports = EmbeddingService;
