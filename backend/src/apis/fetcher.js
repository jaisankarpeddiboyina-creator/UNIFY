const fetch = require('node-fetch');
const categories = require('../config/categories');
const logger = require('../config/logger');

const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS) || 8000;
const MAX_API_CALLS = parseInt(process.env.MAX_API_CALLS) || 5;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 2;
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS) || 500;

/**
 * Fisher-Yates shuffle — unbiased, unlike sort(() => Math.random() - 0.5)
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Select up to MAX_API_CALLS APIs for a category.
 * knownAPI always included. Rest randomly shuffled.
 * apiRegistry passed explicitly — no global.
 */
function selectAPIs(categoryId, apiRegistry) {
  const categoryConfig = categories.find(c => c.id === categoryId);
  if (!categoryConfig) return [];

  const allAPIs = apiRegistry.filter(
    api => api.category === categoryId && api.queryTemplate
  );
  if (allAPIs.length === 0) return [];

  const known = allAPIs.find(api => api.name === categoryConfig.knownAPI);
  const others = allAPIs.filter(api => api.name !== categoryConfig.knownAPI);
  const shuffled = shuffle(others);
  const callCount = Math.min(allAPIs.length, MAX_API_CALLS);

  return known
    ? [known, ...shuffled.slice(0, callCount - 1)]
    : shuffled.slice(0, callCount);
}

/**
 * Build call URL from queryTemplate.
 */
function buildUrl(api, query) {
  if (!api.queryTemplate) return api.url;
  if (api.searchable === false) return api.queryTemplate;
  return api.queryTemplate.replace('{query}', encodeURIComponent(query));
}

/**
 * Execute one API call with timeout and retry logic.
 */
async function callOneAPI(api, query, timeoutMs = API_TIMEOUT, retryCount = 0) {
  const callUrl = buildUrl(api, query);

  if (api.callType === 'direct_image') {
    return { success: true, apiName: api.name, callType: 'direct_image', callUrl, data: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(callUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'UNIFY/1.0' }
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}`;
      logger.warn({ apiName: api.name, statusCode: response.status }, errorMsg);
      return { success: false, apiName: api.name, error: errorMsg };
    }

    if (api.extractorType === 'forismatic') {
      try {
        const text = await response.text();
        const clean = text.replace(/^[\)\]\}',\s]+/, '').replace(/\\'/g, "'");
        const data = JSON.parse(clean);
        return { success: true, apiName: api.name, callType: 'json', callUrl, data };
      } catch (parseErr) {
        logger.warn({ apiName: api.name, error: parseErr.message }, 'Forismatic parse error');
        return { success: false, apiName: api.name, error: `Forismatic parse error: ${parseErr.message}` };
      }
    }

    const data = await response.json();
    return { success: true, apiName: api.name, callType: 'json', callUrl, data };

  } catch (err) {
    clearTimeout(timer);
    
    // Retry on transient errors (timeout, ECONNREFUSED, etc.)
    const isTransientError = err.name === 'AbortError' || err.code === 'ECONNREFUSED';
    if (isTransientError && retryCount < MAX_RETRIES) {
      logger.info({ apiName: api.name, retryCount: retryCount + 1, maxRetries: MAX_RETRIES }, 'Retrying API call');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return callOneAPI(api, query, timeoutMs, retryCount + 1);
    }

    logger.warn({ apiName: api.name, error: err.message }, 'API call failed');
    return { success: false, apiName: api.name, error: err.message };
  }
}

/**
 * Main: select APIs, call all in parallel, return successes only.
 * apiRegistry passed in from req.app.locals — no global.
 */
async function fetchCategory(categoryId, query, apiRegistry) {
  const selectedAPIs = selectAPIs(categoryId, apiRegistry);
  if (selectedAPIs.length === 0) return [];

  logger.info({ category: categoryId, query, apiCount: selectedAPIs.length, apis: selectedAPIs.map(a => a.name) }, 'Executing search');

  const promises = selectedAPIs.map(api => callOneAPI(api, query));
  const settledResults = await Promise.allSettled(promises);
  
  // Log success/failure per API
  for (let i = 0; i < settledResults.length; i++) {
    const settled = settledResults[i];
    const apiName = selectedAPIs[i].name;
    if (settled.status === 'fulfilled') {
      const result = settled.value;
      logger.info({ apiName, success: result.success, error: result.error }, result.success ? 'API call succeeded' : 'API call failed');
    } else {
      logger.error({ apiName, reason: settled.reason?.message || settled.reason }, 'API call rejected');
    }
  }

  // Extract successful results
  const results = settledResults
    .filter(s => s.status === 'fulfilled' && s.value.success)
    .map(s => s.value);
  
  logger.info({ category: categoryId, successCount: results.length, totalAttempted: selectedAPIs.length }, 'Search completed');
  return results;
}

module.exports = { fetchCategory, selectAPIs };
