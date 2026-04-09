const { selectAPIs, fetchCategory } = require('../src/apis/fetcher');

describe('Fetcher - selectAPIs', () => {
  const mockRegistry = [
    { name: 'Quotable', category: 'quotes_motivation', queryTemplate: 'https://api.quotable.io/search?query={query}' },
    { name: 'Zenquotes', category: 'quotes_motivation', queryTemplate: 'https://zenquotes.io/api/search?q={query}' },
    { name: 'Affirmations', category: 'quotes_motivation', queryTemplate: 'https://www.affirmations.dev/' },
  ];

  test('selectAPIs returns known API first', () => {
    const selected = selectAPIs('quotes_motivation', mockRegistry);
    expect(selected[0].name).toBe('Quotable');
  });

  test('selectAPIs does not exceed MAX_API_CALLS', () => {
    const selected = selectAPIs('quotes_motivation', mockRegistry);
    expect(selected.length).toBeLessThanOrEqual(5);
  });

  test('selectAPIs returns empty array for non-existent category', () => {
    const selected = selectAPIs('nonexistent', mockRegistry);
    expect(selected).toEqual([]);
  });

  test('selectAPIs includes known API when available', () => {
    const selected = selectAPIs('quotes_motivation', mockRegistry);
    const hasKnownAPI = selected.some(a => a.name === 'Quotable');
    expect(hasKnownAPI).toBe(true);
  });
});

describe('Fetcher - fetchCategory', () => {
  const mockRegistry = [
    { name: 'Quotable', category: 'quotes_motivation', queryTemplate: 'https://api.quotable.io/search?query={query}', extractorType: 'quotable' },
  ];

  test('fetchCategory returns empty array for empty registry', async () => {
    const result = await fetchCategory('quotes_motivation', 'test', []);
    expect(result).toEqual([]);
  });

  test('fetchCategory filters by category', async () => {
    const result = await fetchCategory('nonexistent', 'test', mockRegistry);
    expect(result).toEqual([]);
  });
});
