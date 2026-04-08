const { v4: uuidv4 } = require('uuid');

const extractors = {};

// ── IMAGES ────────────────────────────────────────────────────────────────────

extractors.direct_image = (data, apiName, callUrl, query, category) => [{
  id: uuidv4(),
  title: `${query} — via ${apiName}`,
  description: '',
  source: apiName,
  category,
  url: callUrl,
  imageUrl: callUrl,
  metadata: {}
}];

// ── QUOTES / MOTIVATION ───────────────────────────────────────────────────────

extractors.quotable = (data, apiName, callUrl, query, category) => {
  const results = data?.results || [];
  return results.map(item => ({
    id: uuidv4(),
    title: item.content || '',
    description: item.author ? `— ${item.author}` : '',
    source: apiName,
    category,
    url: null,
    imageUrl: null,
    metadata: { author: item.author || '', tags: item.tags || [] }
  }));
};

extractors.adviceslip = (data, apiName, callUrl, query, category) => {
  const slips = data?.slips || [];
  return slips.map(item => ({
    id: uuidv4(),
    title: item.advice || '',
    description: 'Advice',
    source: apiName,
    category,
    url: null,
    imageUrl: null,
    metadata: { id: item.id }
  }));
};

extractors.zenquotes = (data, apiName, callUrl, query, category) => {
  const items = Array.isArray(data) ? data : [data];
  return items.filter(item => item?.q).map(item => ({
    id: uuidv4(),
    title: item.q,
    description: item.a ? `— ${item.a}` : '',
    source: apiName,
    category,
    url: null,
    imageUrl: null,
    metadata: { author: item.a || '' }
  }));
};

extractors.affirmations = (data, apiName, callUrl, query, category) => {
  if (!data?.affirmation) return [];
  return [{
    id: uuidv4(),
    title: data.affirmation,
    description: 'Daily Affirmation',
    source: apiName,
    category,
    url: null,
    imageUrl: null,
    metadata: {}
  }];
};

extractors.forismatic = (data, apiName, callUrl, query, category) => {
  if (!data?.quoteText) return [];
  return [{
    id: uuidv4(),
    title: data.quoteText,
    description: data.quoteAuthor ? `— ${data.quoteAuthor}` : '',
    source: apiName,
    category,
    url: data.quoteLink || null,
    imageUrl: null,
    metadata: { author: data.quoteAuthor || '' }
  }];
};

// ── FALLBACK ──────────────────────────────────────────────────────────────────

extractors._fallback = (data, apiName, callUrl, query, category) => {
  const text = typeof data === 'string' ? data
    : data?.text || data?.message || data?.result || JSON.stringify(data).slice(0, 100);
  if (!text) return [];
  return [{
    id: uuidv4(),
    title: text,
    description: '',
    source: apiName,
    category,
    url: null,
    imageUrl: null,
    metadata: {}
  }];
};

// ── DISPATCH ──────────────────────────────────────────────────────────────────

/**
 * Given raw API call results, run the right extractor for each.
 * apiRegistry passed explicitly — no global.
 */
function extractAll(callResults, categoryId, query, apiRegistry) {
  const normalised = [];
  const seenTitles = new Set();

  for (const result of callResults) {
    const api = apiRegistry.find(a => a.name === result.apiName);
    if (!api) continue;

    const extractorType = api.extractorType || '_fallback';
    const fn = extractors[extractorType] || extractors._fallback;

    try {
      const items = fn(result.data, result.apiName, result.callUrl, query, categoryId);
      for (const item of items) {
        const dedupKey = item.title?.trim().toLowerCase();
        if (dedupKey && seenTitles.has(dedupKey)) continue;
        if (dedupKey) seenTitles.add(dedupKey);
        normalised.push(item);
      }
    } catch (err) {
      console.error(`Extractor error [${extractorType}] for ${result.apiName}:`, err.message);
    }
  }

  return normalised;
}

module.exports = { extractAll };
