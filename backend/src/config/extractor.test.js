const { extractAll, extractors } = require('../apis/extractor');

describe('Extractor - Quotable', () => {
  test('quotable extractor maps results correctly', () => {
    const mockData = {
      results: [
        { content: 'Success is not final', author: 'Winston Churchill', tags: ['success'] }
      ]
    };
    
    const result = extractors.quotable(mockData, 'Quotable', 'http://test', 'success', 'quotes_motivation');
    expect(result[0].title).toBe('Success is not final');
    expect(result[0].description).toBe('— Winston Churchill');
    expect(result[0].source).toBe('Quotable');
  });

  test('quotable extractor handles empty results', () => {
    const result = extractors.quotable({}, 'Quotable', 'http://test', 'test', 'quotes_motivation');
    expect(result).toEqual([]);
  });
});

describe('Extractor - Zenquotes', () => {
  test('zenquotes extractor handles array response', () => {
    const mockData = [
      { q: 'Life is beautiful', a: 'Unknown' }
    ];
    
    const result = extractors.zenquotes(mockData, 'Zenquotes', 'http://test', 'test', 'quotes_motivation');
    expect(result[0].title).toBe('Life is beautiful');
    expect(result[0].description).toBe('— Unknown');
  });

  test('zenquotes extractor handles single object', () => {
    const mockData = { q: 'Test', a: 'Author' };
    const result = extractors.zenquotes(mockData, 'Zenquotes', 'http://test', 'test', 'quotes_motivation');
    expect(result[0].title).toBe('Test');
  });
});

describe('Extractor - extractAll', () => {
  test('extractAll deduplicates by title', () => {
    const callResults = [
      { apiName: 'Quotable', data: { results: [{ content: 'Test Quote', author: 'A' }] }, callUrl: 'http://test', callType: 'json', success: true },
      { apiName: 'Zenquotes', data: [{ q: 'Test Quote', a: 'B' }], callUrl: 'http://test2', callType: 'json', success: true }
    ];

    const mockRegistry = [
      { name: 'Quotable', extractorType: 'quotable' },
      { name: 'Zenquotes', extractorType: 'zenquotes' }
    ];

    const result = extractAll(callResults, 'quotes_motivation', 'test', mockRegistry);
    expect(result.length).toBe(1); // Should deduplicate
  });

  test('extractAll uses fallback for missing extractor', () => {
    const callResults = [
      { apiName: 'Unknown', data: { text: 'Some text' }, callUrl: 'http://test', callType: 'json', success: true }
    ];

    const mockRegistry = [
      { name: 'Unknown', extractorType: 'nonexistent' }
    ];

    const result = extractAll(callResults, 'quotes_motivation', 'test', mockRegistry);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Some text');
  });
});
