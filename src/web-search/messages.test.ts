import { describe, it, expect } from 'vitest';
import { messages } from './messages.js';

describe('messages', () => {
  it('acknowledgment contains magnifying glass', () => {
    expect(messages.acknowledgment()).toContain('🔍');
  });
  
  it('resultDelivery formats correctly', () => {
    const result = {
      response: 'Test response',
      session_id: 'abc-123',
      stats: { 
        models: {
          'gemini-1.5': {
            api: { totalRequests: 1, totalErrors: 0 },
            tokens: { input: 100, candidates: 50, total: 150 }
          }
        }
      }
    };
    
    const formatted = messages.resultDelivery(result);
    expect(formatted).toContain('🌐');
    expect(formatted).toContain('Результат поиска');
    expect(formatted).toContain('Test response');
  });
  
  it('error includes session ID', () => {
    const error = messages.error('Something went wrong', 'abc-123');
    expect(error).toContain('❌');
    expect(error).toContain('Search ID: `abc-123`');
  });
  
  it('error truncates long messages', () => {
    const longError = 'A'.repeat(300);
    const error = messages.error(longError, 'abc-123');
    expect(error).toContain('...');
    expect(error.length).toBeLessThan(250);
  });
  
  it('timeout message is clear', () => {
    expect(messages.timeout()).toContain('⏱️');
    expect(messages.timeout()).toContain('слишком много времени');
  });
  
  it('cliNotFound includes path', () => {
    const error = messages.cliNotFound('/path/to/cli');
    expect(error).toContain('❌');
    expect(error).toContain('/path/to/cli');
    expect(error).toContain('webSearch.cliPath');
  });
});
