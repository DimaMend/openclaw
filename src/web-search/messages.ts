/**
 * Web Search message templates
 */

export interface WebSearchResult {
  response: string;
  session_id: string;
  stats: {
    models: Record<string, {
      api: { totalRequests: number; totalErrors: number };
      tokens: { input: number; candidates: number; total: number };
    }>;
  };
}

export interface WebSearchMessages {
  acknowledgment: () => string;
  resultDelivery: (result: WebSearchResult) => string;
  error: (error: string, sessionId?: string) => string;
  timeout: () => string;
  cliNotFound: (path: string) => string;
}

export const messages: WebSearchMessages = {
  /**
   * System acknowledgment when search is triggered
   */
  acknowledgment: () => {
    return "🔍 Выполняю веб-поиск...";
  },

  /**
   * Deliver search results with visual distinction
   */
  resultDelivery: (result: WebSearchResult) => {
    return `🌐 Результат поиска:

${result.response}`;
  },

  /**
   * Error message with user-friendly text and search ID for debugging
   */
  error: (error: string, sessionId?: string) => {
    const errorText = error.length > 200 ? `${error.slice(0, 200)}...` : error;
    const sessionInfo = sessionId ? `\nSearch ID: \`${sessionId}\`` : "";
    
    return `❌ Ошибка поиска:

${errorText}${sessionInfo}`;
  },

  /**
   * Timeout message after 30 seconds
   */
  timeout: () => {
    return "⏱️ Поиск занял слишком много времени";
  },

  /**
   * CLI not found error with configuration hint
   */
  cliNotFound: (path: string) => {
    return `❌ Ошибка поиска:

CLI not found at \`${path}\`
Проверьте настройки webSearch.cliPath в конфигурации`;
  }
};
