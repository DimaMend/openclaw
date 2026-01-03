import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWebSearch } from './executor.js';
import { promisify } from 'util';

// Mock child_process before importing the module
vi.mock('child_process', () => {
  const execMock = vi.fn();
  return {
    exec: execMock,
  };
});

// Import after mock is defined
import { exec } from 'child_process';

// Create promisified mock that matches how it's used in the executor
const execPromise = promisify(exec as any);

describe('executeWebSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes CLI with query', async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, JSON.stringify({
          response: 'Test result',
          session_id: 'abc-123',
          stats: { models: {} }
        }), '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(true);
    expect(result.result?.response).toBe('Test result');
    expect(vi.mocked(exec)).toHaveBeenCalledWith(
      expect.stringContaining('web-search-by-Gemini.sh'),
      expect.objectContaining({ timeout: 30000 }),
      expect.any(Function)
    );
  });
  
  it('handles timeout error', async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('timeout');
        error.code = 'ETIMEOUT';
        callback(error, '', '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
  
  it('handles CLI not found error', async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('not found');
        error.code = 'ENOENT';
        callback(error, '', '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
  
  it('handles permission denied error', async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('Permission denied');
        error.code = 'EACCES';
        callback(error, '', '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('executable');
  });
  
  it('supports dry run mode', async () => {
    const result = await executeWebSearch('test query', { dryRun: true });
    
    expect(result.success).toBe(true);
    expect(result.result?.response).toContain('DRY RUN');
    expect(vi.mocked(exec)).not.toHaveBeenCalled();
  });
  
  it('escapes special characters in query', async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        // Check that command is properly escaped
        expect(cmd).not.toContain('dangerous');
        expect(cmd).toContain('dollar\\$sign');
        callback(null, JSON.stringify({
          response: 'Test',
          session_id: 'abc',
          stats: { models: {} }
        }), '');
      }
      return {} as any;
    });
    
    await executeWebSearch('query with dollar$sign and "quotes"');
    
    expect(vi.mocked(exec)).toHaveBeenCalled();
  });
  
  it('handles non-JSON output gracefully', async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, 'Plain text response', '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(true);
    expect(result.result?.response).toBe('Plain text response');
    expect(result.result?.session_id).toContain('fallback');
  });
});
