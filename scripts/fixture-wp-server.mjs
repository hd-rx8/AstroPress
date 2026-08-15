// @ts-check
/**
 * Minimal, in-memory, WordPress-shaped REST API server used only by
 * `verify-build.mjs` and tests to give `astro build` real data to fetch
 * without depending on a public WordPress instance.
 */
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { URL } from 'node:url';

const MOCK_ROCKET_IMAGE = {
  source_url: 'https://starter.test/images/rocket-cover.jpg',
  alt_text: 'Ilustração moderna de foguete em lançamento no espaço',
  media_details: {
    width: 1200,
    height: 675,
  },
};

const MOCK_AUTHOR = {
  name: 'Equipe AstroPress',
  slug: 'equipe-astropress',
};

const POSTS = [
  {
    id: 1,
    slug: 'o-que-e-astropress-headless',
    date: '2026-08-14T10:00:00',
    title: { rendered: 'O que é o AstroPress e por que usar WordPress Headless com Astro 5' },
    content: {
      rendered: `
        <h2>A Revolução do WordPress Headless</h2>
        <p>O WordPress alimenta mais de 40% de toda a web devido à sua interface editorial intuitiva, robustez e ecossistema incomparável. No entanto, os temas tradicionais em PHP podem sofrer com lentidão, sobrecarga de plugins, vulnerabilidades de segurança e custos elevados de servidor sob alto tráfego.</p>
        <p>É aqui que entra a arquitetura <strong>Headless (desacoplada)</strong>: o WordPress atua exclusivamente como o CMS de gerenciamento de conteúdo no backend, enquanto o <strong>Astro 5</strong> assume o controle total da interface pública com geração de sites 100% estáticos (SSG).</p>
        
        <h2>Por que escolher o AstroPress?</h2>
        <ul>
          <li><strong>0 KB de JavaScript em páginas de conteúdo:</strong> Carregamento instantâneo com HTML e CSS puros.</li>
          <li><strong>Pontuação 100 no Core Web Vitals:</strong> Otimização extrema de LCP, FID/INP e CLS.</li>
          <li><strong>Segurança Absoluta:</strong> Seu banco de dados MySQL e painel administrativo nunca são expostos diretamente aos visitantes públicos.</li>
          <li><strong>Economia de Infraestrutura:</strong> Hospede seu frontend gratuitamente em CDNs globais como Cloudflare Pages, Vercel ou Netlify.</li>
        </ul>
      `,
    },
    excerpt: {
      rendered:
        '<p>Entenda as vantagens da arquitetura desacoplada: máxima performance, zero dependência de PHP em runtime, custos reduzidos e a facilidade editorial que sua equipe já conhece no WordPress.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 1, name: 'Arquitetura', slug: 'arquitetura', taxonomy: 'category' },
          { id: 2, name: 'Conceitos', slug: 'conceitos', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 2,
    slug: 'renderizacao-estatica-zero-js',
    date: '2026-08-13T10:00:00',
    title: { rendered: 'Como Funciona a Renderização Estática (SSG) com 0 KB de JavaScript' },
    content: {
      rendered: `
        <h2>O Ciclo de Vida do Build Estático</h2>
        <p>No modelo tradicional, cada visitante que acessa uma página faz o servidor executar dezenas de consultas SQL no banco de dados e processar múltiplos arquivos PHP. No AstroPress, esse processo acontece apenas <strong>uma vez, durante o build</strong>.</p>
        
        <h2>Vantagens da Abordagem Zero-JS</h2>
        <p>Muitos frameworks modernos injetam centenas de kilobytes de JavaScript para hidratar componentes que são puro texto. O Astro adota a arquitetura de ilhas (Islands Architecture), emitindo apenas HTML semântico e CSS enxuto nas rotas editoriais.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Descubra como o Astro compila o conteúdo do WordPress diretamente em HTML puro no build time, garantindo pontuações perfeitas de 100 no Core Web Vitals e carregamento instantâneo.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 3, name: 'Performance', slug: 'performance', taxonomy: 'category' },
          { id: 4, name: 'Astro 5', slug: 'astro-5', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 3,
    slug: 'guia-de-configuracao-e-conexao',
    date: '2026-08-12T10:00:00',
    title: { rendered: 'Guia de Configuração e Conexão: Variáveis de Ambiente e Permalinks' },
    content: {
      rendered: `
        <h2>Configuração Rápida em 3 Passos</h2>
        <p>Para conectar o Astro ao seu WordPress existente ou local (Docker), você só precisa configurar o arquivo <code>.env</code> na raiz do projeto:</p>
        <pre><code>WORDPRESS_URL=https://cms.seusite.com\nSITE_URL=https://www.seusite.com\nASTROPRESS_PREVIEW_SECRET=sua-chave-secreta</code></pre>
        
        <h2>Estrutura de Permalinks Recomendada</h2>
        <p>No painel do WordPress, navegue até <em>Configurações > Links Permanentes</em> e selecione a opção <strong>"Nome do post" (/%postname%/)</strong>. Isso garante slugs limpos e consistentes para todas as rotas do blog.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Passo a passo para conectar o Astro ao seu WordPress local (Docker) ou de produção, configurando WORDPRESS_URL, SITE_URL e links permanentes amigáveis.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 5, name: 'Guia', slug: 'guia', taxonomy: 'category' },
          { id: 6, name: 'Setup', slug: 'setup', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 4,
    slug: 'draft-preview-em-tempo-real',
    date: '2026-08-11T10:00:00',
    title: { rendered: 'Draft Preview em Tempo Real: Como Visualizar Rascunhos no Astro' },
    content: {
      rendered: `
        <h2>O Desafio dos Rascunhos em Sites Estáticos</h2>
        <p>Um dos maiores receios de equipes editoriais ao migrar para Jamstack ou SSG é a perda do botão "Visualizar" em tempo real. No AstroPress, isso foi completamente resolvido com o endpoint de preview seguro.</p>
        
        <h2>Fluxo de Preview Tokenizado</h2>
        <p>Ao clicar em "Visualizar" no Gutenberg ou Classic Editor, o WordPress redireciona o editor para <code>/preview?id=123&type=post&secret=...</code> no Astro. O Astro valida o token com a REST API e carrega o rascunho instantaneamente com a barra de ferramentas flutuante <code>PreviewBanner</code>.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Conheça o fluxo de publicação e preview seguro. Visualize alterações não publicadas do Gutenberg e Classic Editor sem precisar reexecutar o build estático.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 7, name: 'Workflow', slug: 'workflow', taxonomy: 'category' },
          { id: 8, name: 'Preview', slug: 'preview', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 5,
    slug: 'seo-e-otimizacao-de-imagens',
    date: '2026-08-10T10:00:00',
    title: { rendered: 'Cascata de SEO Dinâmica e Otimização de Imagens com astro:assets' },
    content: {
      rendered: `
        <h2>Cascata de SEO em 4 Níveis</h2>
        <p>O AstroPress extrai metadados através de uma hierarquia inteligente:</p>
        <ol>
          <li><strong>Yoast SEO:</strong> Ingestão dos campos <code>yoast_head_json</code>.</li>
          <li><strong>Rank Math SEO:</strong> Ingestão dos campos <code>rank_math_seo</code>.</li>
          <li><strong>Campos Nativos do WordPress:</strong> Títulos, resumos e mídias padrão.</li>
          <li><strong>Defaults do Site:</strong> Metadados de fallback configurados em <code>src/config/site.ts</code>.</li>
        </ol>
        
        <h2>Otimização Automática de Imagens</h2>
        <p>Todas as imagens de destaque são processadas via <code>astro:assets</code>, gerando formatos modernos WebP e AVIF com <code>srcset</code> responsivo e zero Cumulative Layout Shift (CLS = 0).</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Integração automática com Yoast SEO e Rank Math, Schema.org JSON-LD para motores de busca e geração de imagens responsivas em WebP/AVIF sem layout shift.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 9, name: 'SEO', slug: 'seo', taxonomy: 'category' },
          { id: 10, name: 'Imagens', slug: 'imagens', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 6,
    slug: 'headless-doctor-e-performance-budgets',
    date: '2026-08-09T10:00:00',
    title: { rendered: 'Headless Doctor e Performance Budgets: Auditoria e Saúde do Sistema' },
    content: {
      rendered: `
        <h2>Diagnóstico Automatizado com o Headless Doctor</h2>
        <p>Com o comando <code>npm run doctor</code> ou na rota <code>/doctor</code>, o sistema realiza uma auditoria em 7 categorias: Conectividade, Endpoints REST, Plugin AstroPress Connector, Permalinks, SEO, Preview Secret e Padrões de Imagem.</p>
        
        <h2>Orçamentos Estritos de Performance</h2>
        <p>O arquivo <code>budget.json</code> define limites rígidos (CSS &le; 25 KB, HTML &le; 50 KB, 0 KB JS editorial). Qualquer build que ultrapasse esses limites é barrado automaticamente pelo <code>npm run build:ci</code>.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Como auditar a saúde da sua REST API com o comando npm run doctor e garantir que seus limites de performance nunca sejam violados em produção.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 11, name: 'Diagnóstico', slug: 'diagnostico', taxonomy: 'category' },
          { id: 12, name: 'DevOps', slug: 'devops', taxonomy: 'category' },
        ],
      ],
    },
  },
];

const PAGES = [
  {
    id: 100,
    slug: 'about',
    date: '2026-01-01T09:00:00',
    title: { rendered: 'Sobre o AstroPress' },
    content: {
      rendered:
        '<p>O AstroPress é um starter de alta performance que une a flexibilidade editorial do WordPress à velocidade incomparável do Astro 5.</p>',
    },
    excerpt: {
      rendered: '<p>Sobre o projeto AstroPress Headless Starter.</p>',
    },
  },
];

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [headers]
 */
function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

/**
 * Starts the fixture server on a random local port.
 *
 * @returns {Promise<{ url: URL, close: () => Promise<void> }>}
 */
export function startFixtureWordPressServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (url.pathname === '/wp-json/wp/v2/posts') {
        sendJson(res, 200, POSTS, {
          'X-WP-Total': String(POSTS.length),
          'X-WP-TotalPages': '1',
        });
        return;
      }

      if (url.pathname === '/wp-json/wp/v2/pages') {
        sendJson(res, 200, PAGES, {
          'X-WP-Total': String(PAGES.length),
          'X-WP-TotalPages': '1',
        });
        return;
      }

      if (url.pathname === '/wp-json/astropress/v1/health') {
        sendJson(res, 200, {
          status: 'ok',
          astropress: {
            plugin_version: '1.1.0',
            frontend_url: 'https://starter.test',
            redirects_enabled: true,
            deploy_hook_configured: false,
          },
          wordpress: {
            is_pretty_permalinks: true,
            permalink_structure: '/%postname%/',
          },
          seo_plugin: {
            active: 'native',
          },
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'rest_no_route', message: 'Not found.' }));
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Fixture WordPress server failed to bind to a port.'));
        return;
      }

      const url = new URL(`http://127.0.0.1:${address.port}/`);
      resolve({
        url,
        close: () =>
          new Promise((resolveClose, rejectClose) => {
            server.close((err) => (err ? rejectClose(err) : resolveClose()));
          }),
      });
    });
  });
}
