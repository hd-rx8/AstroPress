export interface PerformanceBudgetConfig {
  budgets: {
    editorialJsMaxBytes: number;
    interactiveJsMaxBytes: number;
    cssGlobalMaxBytes: number;
    htmlPageMaxBytes: number;
    imageMaxBytes: number;
  };
  rules: {
    requireImageDimensions: boolean;
    requireImageAlt: boolean;
    requireZeroEditorialJs: boolean;
    allowedImageExtensions: string[];
  };
}

export interface RouteAssetAudit {
  route: string;
  htmlPath: string;
  htmlSizeBytes: number;
  htmlGzipBytes: number;
  scriptsCount: number;
  scriptBytes: number;
  imagesCount: number;
  missingDimensionsCount: number;
  missingAltCount: number;
  isEditorial: boolean;
  passed: boolean;
  violations: string[];
}

export interface PerformanceAuditReport {
  timestamp: string;
  durationMs: number;
  passed: boolean;
  totalPages: number;
  totalCssBytes: number;
  totalCssGzipBytes: number;
  routes: RouteAssetAudit[];
  violations: string[];
}
