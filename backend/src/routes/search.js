const express = require('express');
const router = express.Router();
const { fetchCategory } = require('../apis/fetcher');
const { extractAll } = require('../apis/extractor');
const categories = require('../config/categories');
const { validateSearchParams } = require('../config/validation');
const logger = require('../config/logger');

const PAGE_SIZE = parseInt(process.env.PAGE_SIZE) || 10;

/**
 * GET /api/search?category=images&q=sunset&page=1
 * Pagination-enabled search with structured errors.
 */
router.get('/search', async (req, res) => {
  // Validate input
  const { error, value } = validateSearchParams(req.query);
  if (error) {
    const errorDetails = error.details.map(d => d.message).join('; ');
    logger.warn({ errors: errorDetails }, 'Invalid search parameters');
    return res.status(400).json({ 
      error: 'invalid_params',
      message: errorDetails 
    });
  }

  const { category, q: query, page } = value;
  const trimmed = (query || '').trim();

  const categoryExists = categories.find(c => c.id === category);
  if (!categoryExists) {
    logger.warn({ category }, 'Category not found');
    return res.status(404).json({ 
      error: 'category_not_found',
      message: `Category "${category}" not found` 
    });
  }

  // Get registry from app.locals — no global
  const apiRegistry = req.app.locals.API_REGISTRY;

  // Validate that knownAPI from the category config actually exists in the registry
  const knownAPIEntry = apiRegistry.find(a => a.name === categoryExists.knownAPI && a.queryTemplate);
  if (!knownAPIEntry) {
    logger.warn({ category, knownAPI: categoryExists.knownAPI }, 'Known API not found in registry');
  }

  try {
    logger.info({ category, query: trimmed, page }, 'Search request started');
    
    const rawResults = await fetchCategory(category, trimmed, apiRegistry);
    const allResults = extractAll(rawResults, category, trimmed, apiRegistry);

    // Paginate results
    const totalCount = allResults.length;
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const paginatedResults = allResults.slice(startIdx, endIdx);

    const hasNextPage = endIdx < totalCount;

    logger.info({ category, query: trimmed, page, totalCount, pageSize: PAGE_SIZE }, 'Search completed');

    return res.json({
      category,
      query: trimmed,
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      count: paginatedResults.length,
      hasNextPage,
      results: paginatedResults
    });

  } catch (err) {
    logger.error({ error: err.message, stack: err.stack, category }, 'Search error');
    // Never leak internal error details to the client in production
    return res.status(500).json({ 
      error: 'service_error',
      message: 'Search failed. Please try again.' 
    });
  }
});

/**
 * GET /api/categories
 */
router.get('/categories', (req, res) => {
  logger.debug('Fetching categories list');
  res.json(categories.map(c => ({
    id: c.id,
    displayName: c.displayName,
    icon: c.icon,
    description: c.description,
    defaultQuery: c.defaultQuery || '',
    knownAPI: c.knownAPI
  })));
});

module.exports = router;
