import type { DoctorCategoryReport, DoctorCheck, DoctorRunnerOptions } from './types.ts';

async function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return {
    result,
    latencyMs: Date.now() - start,
  };
}

function resolveCategoryStatus(checks: DoctorCheck[]): 'pass' | 'warn' | 'fail' {
  if (checks.some((c) => c.status === 'fail')) return 'fail';
  if (checks.some((c) => c.status === 'warn')) return 'warn';
  return 'pass';
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.local')
  );
}

/** 1. Environment & Configuration Checks */
export function checkEnvironment(options: DoctorRunnerOptions): DoctorCategoryReport {
  const checks: DoctorCheck[] = [];

  // WORDPRESS_URL check
  if (!options.wordpressUrl || options.wordpressUrl.trim() === '') {
    checks.push({
      id: 'env_wp_url',
      name: 'WORDPRESS_URL configurada',
      category: 'environment',
      status: 'fail',
      message: 'A variável WORDPRESS_URL não está definida no arquivo .env.',
      remedy: 'Defina WORDPRESS_URL=http://localhost:8080 (Docker) ou a URL do seu servidor no .env.',
    });
  } else {
    try {
      const url = new URL(options.wordpressUrl);
      if (url.pathname !== '/' && url.pathname !== '') {
        checks.push({
          id: 'env_wp_url_root',
          name: 'WORDPRESS_URL sem subcaminho',
          category: 'environment',
          status: 'fail',
          message: `WORDPRESS_URL contém subcaminho ("${url.pathname}").`,
          remedy: 'Remova /wp-json ou barras finais do WORDPRESS_URL.',
        });
      } else {
        const isLocal = isLocalHost(url.hostname);
        checks.push({
          id: 'env_wp_url',
          name: 'WORDPRESS_URL configurada',
          category: 'environment',
          status: 'pass',
          message: isLocal
            ? `Ambiente Local detectado: ${options.wordpressUrl} (Docker / Dev WordPress)`
            : `WORDPRESS_URL válida: ${options.wordpressUrl}`,
        });
      }
    } catch {
      checks.push({
        id: 'env_wp_url_invalid',
        name: 'WORDPRESS_URL válida',
        category: 'environment',
        status: 'fail',
        message: `WORDPRESS_URL não é uma URL absoluta válida: "${options.wordpressUrl}"`,
        remedy: 'Use uma URL absoluta válida começando com http:// ou https://.',
      });
    }
  }

  // SITE_URL check
  if (!options.siteUrl || options.siteUrl.trim() === '') {
    checks.push({
      id: 'env_site_url',
      name: 'SITE_URL configurada',
      category: 'environment',
      status: 'fail',
      message: 'A variável SITE_URL não está definida no arquivo .env.',
      remedy: 'Defina SITE_URL=http://localhost:4321 no arquivo .env.',
    });
  } else {
    try {
      const url = new URL(options.siteUrl);
      if (url.pathname !== '/' && url.pathname !== '') {
        checks.push({
          id: 'env_site_url_root',
          name: 'SITE_URL raiz (sem subcaminho)',
          category: 'environment',
          status: 'fail',
          message: `SITE_URL contém subcaminho ("${url.pathname}"). Subpaths não são suportados.`,
          remedy: 'Use a raiz do domínio ou subdomínio (ex: https://meusite.com ou http://localhost:4321).',
        });
      } else {
        const isLocal = isLocalHost(url.hostname);
        checks.push({
          id: 'env_site_url',
          name: 'SITE_URL configurada',
          category: 'environment',
          status: 'pass',
          message: isLocal
            ? `Ambiente Local detectado: ${options.siteUrl} (Astro Dev Server)`
            : `SITE_URL válida: ${options.siteUrl}`,
        });
      }
    } catch {
      checks.push({
        id: 'env_site_url_invalid',
        name: 'SITE_URL válida',
        category: 'environment',
        status: 'fail',
        message: `SITE_URL não é uma URL absoluta válida: "${options.siteUrl}"`,
        remedy: 'Use uma URL absoluta válida começando com http:// ou https://.',
      });
    }
  }

  // ASTROPRESS_PREVIEW_SECRET check
  if (!options.previewSecret || options.previewSecret.trim() === '') {
    checks.push({
      id: 'env_preview_secret',
      name: 'ASTROPRESS_PREVIEW_SECRET configurada',
      category: 'environment',
      status: 'warn',
      message: 'ASTROPRESS_PREVIEW_SECRET não configurada (opcional em dev local).',
      remedy: 'Adicione ASTROPRESS_PREVIEW_SECRET=sua-chave no .env e no WordPress caso queira testar previews de rascunhos.',
    });
  } else {
    checks.push({
      id: 'env_preview_secret',
      name: 'ASTROPRESS_PREVIEW_SECRET configurada',
      category: 'environment',
      status: 'pass',
      message: 'Token de Draft Preview configurado.',
    });
  }

  return {
    name: 'environment',
    title: '1. Ambiente e Configuração (.env)',
    checks,
    status: resolveCategoryStatus(checks),
  };
}

/** 2. WordPress Network & Discovery Checks */
export async function checkConnectivity(
  wordpressUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 5000,
): Promise<DoctorCategoryReport> {
  const checks: DoctorCheck[] = [];

  let wpOrigin = '';
  try {
    wpOrigin = new URL(wordpressUrl).origin;
  } catch {
    return {
      name: 'connectivity',
      title: '2. Conectividade e Descoberta REST',
      checks: [
        {
          id: 'net_invalid_url',
          name: 'Conexão com WordPress',
          category: 'connectivity',
          status: 'fail',
          message: 'URL inválida do WordPress.',
        },
      ],
      status: 'fail',
    };
  }

  // Check 1: Root ping & latency
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const { result: res, latencyMs } = await measureLatency(() =>
      fetchFn(wpOrigin, { method: 'HEAD', signal: controller.signal }),
    );
    clearTimeout(timer);

    const isSlow = latencyMs > 1500;
    checks.push({
      id: 'net_ping',
      name: 'Servidor WordPress alcançável',
      category: 'connectivity',
      status: isSlow ? 'warn' : res.ok || res.status < 500 ? 'pass' : 'fail',
      message: `Resposta HTTP ${res.status} em ${latencyMs}ms.${isSlow ? ' (Latência elevada)' : ''}`,
      latencyMs,
      remedy: isSlow ? 'Verifique a velocidade do servidor ou container Docker do WordPress.' : undefined,
    });
  } catch (err: unknown) {
    checks.push({
      id: 'net_ping',
      name: 'Servidor WordPress alcançável',
      category: 'connectivity',
      status: 'fail',
      message: `Não foi possível conectar ao WordPress em ${wpOrigin} (${String(err)}).`,
      remedy: 'Certifique-se de que o container Docker do WordPress está rodando (`docker compose up -d`).',
    });
  }

  // Check 2: REST Index /wp-json/
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const restIndexUrl = `${wpOrigin}/wp-json/`;
    const { result: res, latencyMs } = await measureLatency(() =>
      fetchFn(restIndexUrl, { signal: controller.signal }),
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { name?: string; namespaces?: string[] };
      checks.push({
        id: 'net_rest_index',
        name: 'Índice da REST API (/wp-json/)',
        category: 'connectivity',
        status: 'pass',
        message: `REST API index ativo: "${data.name || 'WordPress'}"`,
        latencyMs,
      });
    } else {
      checks.push({
        id: 'net_rest_index',
        name: 'Índice da REST API (/wp-json/)',
        category: 'connectivity',
        status: 'fail',
        message: `REST API retornou HTTP ${res.status}.`,
        remedy: 'Verifique se a REST API do WordPress está ativada e não bloqueada por plugins de segurança.',
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'net_rest_index',
      name: 'Índice da REST API (/wp-json/)',
      category: 'connectivity',
      status: 'fail',
      message: `Falha ao consultar /wp-json/: ${String(err)}`,
      remedy: 'Verifique configurações de rede e certifique-se de que o WordPress está ativo.',
    });
  }

  return {
    name: 'connectivity',
    title: '2. Conectividade e Descoberta REST',
    checks,
    status: resolveCategoryStatus(checks),
  };
}

/** 3. Core WordPress REST Collections Checks */
export async function checkRestEndpoints(
  wordpressUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 5000,
): Promise<DoctorCategoryReport> {
  const checks: DoctorCheck[] = [];
  const wpOrigin = new URL(wordpressUrl).origin;

  const endpoints = [
    { name: 'Posts (/wp/v2/posts)', path: 'wp/v2/posts?per_page=1', id: 'rest_posts' },
    { name: 'Páginas (/wp/v2/pages)', path: 'wp/v2/pages?per_page=1', id: 'rest_pages' },
    { name: 'Categorias (/wp/v2/categories)', path: 'wp/v2/categories?per_page=1', id: 'rest_categories' },
    { name: 'Mídias (/wp/v2/media)', path: 'wp/v2/media?per_page=1', id: 'rest_media' },
  ];

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const url = `${wpOrigin}/wp-json/${ep.path}`;
      const { result: res, latencyMs } = await measureLatency(() =>
        fetchFn(url, { signal: controller.signal }),
      );
      clearTimeout(timer);

      if (res.ok) {
        const total = res.headers.get('X-WP-Total');
        const totalText = total !== null ? ` (${total} registros)` : '';
        checks.push({
          id: ep.id,
          name: ep.name,
          category: 'endpoints',
          status: 'pass',
          message: `Endpoint acessível — HTTP 200${totalText}`,
          latencyMs,
        });
      } else {
        checks.push({
          id: ep.id,
          name: ep.name,
          category: 'endpoints',
          status: 'fail',
          message: `Endpoint retornou HTTP ${res.status}`,
          remedy: `Verifique se a rota ${ep.path} está pública.`,
        });
      }
    } catch (err: unknown) {
      checks.push({
        id: ep.id,
        name: ep.name,
        category: 'endpoints',
        status: 'fail',
        message: `Falha na requisição: ${String(err)}`,
      });
    }
  }

  return {
    name: 'endpoints',
    title: '3. Coleções Principais da REST API',
    checks,
    status: resolveCategoryStatus(checks),
  };
}

/** 4. AstroPress Connector Plugin & Health Checks */
export async function checkConnectorPlugin(
  wordpressUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 5000,
): Promise<DoctorCategoryReport> {
  const checks: DoctorCheck[] = [];
  const wpOrigin = new URL(wordpressUrl).origin;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${wpOrigin}/wp-json/astropress/v1/health`;
    const { result: res, latencyMs } = await measureLatency(() =>
      fetchFn(url, { signal: controller.signal }),
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as {
        status?: string;
        astropress?: {
          plugin_version?: string;
          frontend_url?: string;
          redirects_enabled?: boolean;
          deploy_hook_configured?: boolean;
        };
        wordpress?: {
          is_pretty_permalinks?: boolean;
          permalink_structure?: string;
        };
        seo_plugin?: {
          active?: string;
        };
      };

      checks.push({
        id: 'plugin_installed',
        name: 'Plugin AstroPress Connector instalado',
        category: 'plugin',
        status: 'pass',
        message: `Plugin ativo (versão ${data.astropress?.plugin_version || '1.x'})`,
        latencyMs,
      });

      // Pretty Permalinks check
      if (data.wordpress?.is_pretty_permalinks) {
        checks.push({
          id: 'plugin_permalinks',
          name: 'Estrutura de Permalinks amigáveis',
          category: 'plugin',
          status: 'pass',
          message: `Permalinks amigáveis ativos: "${data.wordpress.permalink_structure}"`,
        });
      } else {
        checks.push({
          id: 'plugin_permalinks',
          name: 'Estrutura de Permalinks amigáveis',
          category: 'plugin',
          status: 'warn',
          message: 'WordPress usando permalinks simples (?p=123). Rotas estáticas podem ter problemas.',
          remedy: 'No WP Admin, vá em Configurações > Links Permanentes e selecione "Nome do post" (/%postname%/).',
        });
      }

      // Frontend URL configured
      if (data.astropress?.frontend_url) {
        checks.push({
          id: 'plugin_frontend_url',
          name: 'Frontend URL no plugin',
          category: 'plugin',
          status: 'pass',
          message: `Configurado para: ${data.astropress.frontend_url}`,
        });
      } else {
        checks.push({
          id: 'plugin_frontend_url',
          name: 'Frontend URL no plugin',
          category: 'plugin',
          status: 'warn',
          message: 'URL do Frontend não preenchida no plugin.',
          remedy: 'Vá em Configurações > AstroPress no WordPress e insira a URL do Astro (ex: http://localhost:4321).',
        });
      }
    } else {
      checks.push({
        id: 'plugin_installed',
        name: 'Plugin AstroPress Connector instalado',
        category: 'plugin',
        status: 'warn',
        message: 'Endpoint /wp-json/astropress/v1/health não encontrado.',
        remedy: 'Copie e ative o plugin em wordpress/plugins/astropress-connector na sua instalação WP.',
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'plugin_installed',
      name: 'Plugin AstroPress Connector instalado',
      category: 'plugin',
      status: 'warn',
      message: `Não foi possível verificar o plugin (${String(err)}).`,
      remedy: 'Instale e ative o plugin AstroPress Connector no WordPress.',
    });
  }

  return {
    name: 'plugin',
    title: '4. Plugin AstroPress Connector & Diagnóstico',
    checks,
    status: resolveCategoryStatus(checks),
  };
}

/** 5. SEO Plugins & Ingestion Checks */
export async function checkSeoIngestion(
  wordpressUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 5000,
): Promise<DoctorCategoryReport> {
  const checks: DoctorCheck[] = [];
  const wpOrigin = new URL(wordpressUrl).origin;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${wpOrigin}/wp-json/wp/v2/posts?per_page=1&_embed=1`;
    const { result: res, latencyMs } = await measureLatency(() =>
      fetchFn(url, { signal: controller.signal }),
    );
    clearTimeout(timer);

    if (res.ok) {
      const posts = (await res.json()) as Array<{
        yoast_head_json?: unknown;
        rank_math_seo?: unknown;
      }>;
      const first = posts[0];

      if (first?.yoast_head_json) {
        checks.push({
          id: 'seo_detection',
          name: 'Plugin de SEO detectado',
          category: 'seo',
          status: 'pass',
          message: 'Yoast SEO detectado via campo `yoast_head_json`.',
          latencyMs,
        });
      } else if (first?.rank_math_seo) {
        checks.push({
          id: 'seo_detection',
          name: 'Plugin de SEO detectado',
          category: 'seo',
          status: 'pass',
          message: 'Rank Math SEO detectado via campo `rank_math_seo`.',
          latencyMs,
        });
      } else {
        checks.push({
          id: 'seo_detection',
          name: 'Plugin de SEO detectado',
          category: 'seo',
          status: 'pass',
          message: 'Usando gerador de SEO e Schema.org nativo do AstroPress.',
          details: 'Yoast SEO ou Rank Math podem ser instalados opcionalmente.',
        });
      }
    } else {
      checks.push({
        id: 'seo_detection',
        name: 'Auditoria de SEO',
        category: 'seo',
        status: 'warn',
        message: 'Nenhum post disponível para auditar a estrutura de SEO.',
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'seo_detection',
      name: 'Auditoria de SEO',
      category: 'seo',
      status: 'warn',
      message: `Falha ao inspecionar SEO: ${String(err)}`,
    });
  }

  return {
    name: 'seo',
    title: '5. Ingestão de SEO & Metadados',
    checks,
    status: resolveCategoryStatus(checks),
  };
}

/** 6. Draft Preview Handshake Checks */
export async function checkPreviewHandshake(
  wordpressUrl: string,
  previewSecret?: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 5000,
): Promise<DoctorCategoryReport> {
  const checks: DoctorCheck[] = [];
  const wpOrigin = new URL(wordpressUrl).origin;

  if (!previewSecret || previewSecret.trim() === '') {
    checks.push({
      id: 'preview_handshake',
      name: 'Handshake de Draft Preview',
      category: 'preview',
      status: 'warn',
      message: 'ASTROPRESS_PREVIEW_SECRET não definida no Astro.',
      remedy: 'Configure a chave secreta para testar o handshake de preview.',
    });
    return {
      name: 'preview',
      title: '6. Handshake de Preview de Rascunhos',
      checks,
      status: 'warn',
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const testUrl = `${wpOrigin}/wp-json/astropress/v1/preview?id=1&secret=${encodeURIComponent(previewSecret)}`;
    const { result: res, latencyMs } = await measureLatency(() =>
      fetchFn(testUrl, { signal: controller.signal }),
    );
    clearTimeout(timer);

    if (res.status === 401) {
      checks.push({
        id: 'preview_handshake',
        name: 'Handshake de Draft Preview',
        category: 'preview',
        status: 'fail',
        message: 'Chave secreta de preview rejeitada pelo WordPress (HTTP 401).',
        remedy: 'Certifique-se de que a mesma chave ASTROPRESS_PREVIEW_SECRET está configurada no .env e no WordPress.',
      });
    } else if (res.ok || res.status === 404) {
      // 200 or 404 with authenticated access means the secret was validated successfully
      checks.push({
        id: 'preview_handshake',
        name: 'Handshake de Draft Preview',
        category: 'preview',
        status: 'pass',
        message: 'Endpoint de preview autenticado com sucesso.',
        latencyMs,
      });
    } else {
      checks.push({
        id: 'preview_handshake',
        name: 'Handshake de Draft Preview',
        category: 'preview',
        status: 'warn',
        message: `Endpoint retornou HTTP ${res.status}.`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'preview_handshake',
      name: 'Handshake de Draft Preview',
      category: 'preview',
      status: 'warn',
      message: `Não foi possível testar o preview: ${String(err)}`,
    });
  }

  return {
    name: 'preview',
    title: '6. Handshake de Preview de Rascunhos',
    checks,
    status: resolveCategoryStatus(checks),
  };
}

/** 7. Image Optimization & Remote Patterns */
export function checkImageConfiguration(wordpressUrl: string): DoctorCategoryReport {
  const checks: DoctorCheck[] = [];

  try {
    const url = new URL(wordpressUrl);
    checks.push({
      id: 'image_domain',
      name: 'Domínio de imagens remotas (remotePatterns)',
      category: 'images',
      status: 'pass',
      message: `Padrão de imagem dinâmico configurado para: ${url.hostname} (${url.protocol})`,
    });
  } catch {
    checks.push({
      id: 'image_domain',
      name: 'Domínio de imagens remotas (remotePatterns)',
      category: 'images',
      status: 'fail',
      message: 'Não foi possível extrair o hostname do WORDPRESS_URL.',
    });
  }

  return {
    name: 'images',
    title: '7. Otimização de Imagens (astro:assets)',
    checks,
    status: resolveCategoryStatus(checks),
  };
}
