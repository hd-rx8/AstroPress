export interface WordPressRequestErrorOptions {
  /** The requested path (e.g. "posts", "pages/42") — used in the error message. */
  operation: string;
  url: string;
  /** e.g. "500 Internal Server Error" */
  status?: string;
  cause?: unknown;
}

/**
 * Raised for any failure while talking to the WordPress REST API: network
 * failures, timeouts, non-2xx responses, and malformed JSON bodies.
 */
export class WordPressRequestError extends Error {
  readonly operation: string;
  readonly url: string;
  readonly status?: string;

  constructor(options: WordPressRequestErrorOptions) {
    const lines = [`Failed to fetch WordPress ${options.operation}`, `URL: ${options.url}`];
    if (options.status) {
      lines.push(`Status: ${options.status}`);
    }

    super(lines.join('\n'), options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'WordPressRequestError';
    this.operation = options.operation;
    this.url = options.url;
    this.status = options.status;
  }
}

/**
 * Raised when a paginated collection endpoint's first page (`page=1`) does
 * not report a valid, positive integer `X-WP-TotalPages` — the value the
 * aggregator relies on to know how many further pages to fetch.
 */
export class WordPressPaginationError extends Error {
  constructor(operation: string, totalPages: unknown) {
    super(
      `WordPress ${operation} page 1 did not report a valid X-WP-TotalPages header (received: ${String(totalPages)})`,
    );
    this.name = 'WordPressPaginationError';
  }
}
