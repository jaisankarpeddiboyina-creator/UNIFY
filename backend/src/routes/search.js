const express = require('express');
const router = express.Router();
const { fetchCategory } = require('../apis/fetcher');
const { extractAll } = require('../apis/extractor');
const categories = require('../config/categories');

const MAX_QUERY_LENGTH = 200;

/**
 * GET /api/search?category=images&q=sunset
 */
router.get('/search', async (req, res) => {
  const { category, q } = req.query;

  if (!category || !q) {
    return res.status(400).json({ error: 'Missing required params: category and q' });
  }

  const trimmed = q.trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'Query cannot be empty' });
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Query too long (max ${MAX_QUERY_LENGTH} characters)` });
  }

  const categoryExists = categories.find(c => c.id === category);
  if (!categoryExists) {
    return res.status(404).json({ error: `Category "${category}" not found` });
  }

  // Get registry from app.locals — no global
  const apiRegistry = req.app.locals.API_REGISTRY;

  try {
    const rawResults = await fetchCategory(category, trimmed, apiRegistry);
    const results = extractAll(rawResults, category, trimmed, apiRegistry);

    return res.json({
      category,
      query: trimmed,
      count: results.length,
      results
    });

  } catch (err) {
    console.error('Search error:', err);
    // Never leak internal error details to the client in production
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

/**
 * GET /api/categories
 */
router.get('/categories', (req, res) => {
  res.json(categories.map(c => ({
    id: c.id,
    displayName: c.displayName,
    icon: c.icon,
    description: c.description
  })));
});

module.exports = router;
