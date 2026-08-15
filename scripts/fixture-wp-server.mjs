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
    slug: 'manifesto-wordpress-headless-astro',
    date: '2026-08-14T10:00:00',
    title: { rendered: 'Manifesto &amp; Tese: Por que WordPress Headless + Astro 5 é a Arquitetura Definitiva' },
    content: {
      rendered: `
        <h2>1. O Dilema do Monólito WordPress Tradicional</h2>
        <p>O WordPress alimenta mais de 40% da internet e conquistou essa hegemonia por méritos indiscutíveis: um ecossistema editorial amigável, o poder do editor em blocos Gutenberg, flexibilidade de taxonomias e gerenciamento de mídia centralizado.</p>
        <p>No entanto, a arquitetura tradicional em PHP acopla todas as camadas do sistema em uma única máquina:</p>
        <ul>
          <li><strong>Gargalo de Concorrência:</strong> Cada requisição HTTP pública aciona o runtime PHP-FPM, executa dezenas de queries SQL no MySQL e compila templates no servidor em tempo real.</li>
          <li><strong>Vulnerabilidade e Superfície de Ataque:</strong> A presença de dezenas de plugins de terceiros expõe brechas diretamente na porta 80/443 pública.</li>
          <li><strong>Sobrecarga no Frontend:</strong> Temas clássicos e page-builders frequentemente injetam dezenas de arquivos CSS/JS não otimizados, penalizando drasticamente os índices do Core Web Vitals (LCP, FID/INP e CLS).</li>
        </ul>

        <h2>2. A Ilusão do JavaScript Excessivo nas SPAs</h2>
        <p>Muitas equipes tentaram resolver esse problema migrando para Single Page Applications ou frameworks como Next.js e Remix. Embora a separação de backend/frontend traga benefícios, ela introduziu uma nova armadilha: <em>o custo massivo da hidratação client-side</em>.</p>
        <p>Para ler um artigo de blog — que é essencialmente texto e imagem estáticos —, navegadores móveis são forçados a baixar centenas de kilobytes de JavaScript, fazer o parse da AST e reconstruir o DOM virtual, consumindo bateria e travando a thread principal.</p>

        <h2>3. A Tese do AstroPress: O Equilíbrio Perfeito</h2>
        <p>O <strong>AstroPress</strong> estabelece uma fronteira limpa e intransigente entre editorial e renderização:</p>
        <ol>
          <li><strong>WordPress como Headless CMS:</strong> Mantido onde é imbatível — redação, fluxos de publicação, categorização e gestão de ativos. O banco de dados e o PHP ficam isolados, acessíveis apenas pela equipe editorial e pelo runner de build.</li>
          <li><strong>Astro 5 como Gerador Estático (SSG):</strong> Durante o build, o Astro consome a REST API do WordPress e compila todo o site em puro HTML e CSS semântico.</li>
          <li><strong>0 KB de JavaScript Cliente por Padrão:</strong> Páginas de conteúdo não possuem runtime JS no navegador, garantindo carregamento instantâneo e pontuações perfeitas de 100/100 no Lighthouse.</li>
        </ol>
      `,
    },
    excerpt: {
      rendered:
        '<p>Uma análise aprofundada sobre os limites do monólito tradicional, os trade-offs de SPAs monolíticas em Next.js e como o AstroPress combina o melhor ecossistema editorial com zero runtime overhead.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 1, name: 'Manifesto', slug: 'manifesto', taxonomy: 'category' },
          { id: 2, name: 'Arquitetura', slug: 'arquitetura', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 2,
    slug: 'arquitetura-do-core-e-normalizacao',
    date: '2026-08-13T10:00:00',
    title: { rendered: 'Deep Dive no Core: Normalização de Dados, Resiliência e Isolamento de Payloads' },
    content: {
      rendered: `
        <h2>1. A Anatomia e Armadilhas da REST API do WordPress</h2>
        <p>A API REST nativa do WordPress (<code>/wp-json/wp/v2/</code>) é rica, porém possui peculiaridades que não devem vazar para os componentes de interface:</p>
        <ul>
          <li>Campos envelopados em objetos <code>rendered</code> (ex: <code>title.rendered</code>, <code>content.rendered</code>).</li>
          <li>Entidades HTML escapadas (ex: <code>&#8217;</code> para apóstrofos, <code>&amp;</code> para e-comercial).</li>
          <li>Stubs de erro no parâmetro <code>_embed</code>: quando uma mídia ou autor está inacessível ou sem permissão, o WordPress retorna um array contendo um objeto de erro <code>[{ code: "rest_forbidden" }]</code> ao invés de um array vazio.</li>
        </ul>

        <h2>2. Camada de Transporte Resiliente (<code>client.ts</code>)</h2>
        <p>O cliente HTTP centralizado em <code>src/lib/wordpress/client.ts</code> é a única interface que invoca <code>fetch()</code> contra o WordPress. Ele implementa timeouts com <code>AbortController</code>, parsing resiliente e extração autoritativa dos headers <code>X-WP-Total</code> e <code>X-WP-TotalPages</code>.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Como o módulo src/lib/wordpress/ isola o frontend dos detalhes da REST API, decodifica entidades HTML e trata stubs de erro com TypeScript estrito.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 3, name: 'Engenharia', slug: 'engenharia', taxonomy: 'category' },
          { id: 4, name: 'TypeScript', slug: 'typescript', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 3,
    slug: 'guia-definitivo-de-setup-e-deploy',
    date: '2026-08-12T10:00:00',
    title: { rendered: 'Guia Definitivo de Setup: Do Docker Local à Produção em Alta Escala' },
    content: {
      rendered: `
        <h2>1. Configuração de Variáveis de Ambiente</h2>
        <p>O arquivo <code>.env</code> na raiz do projeto controla a integração entre o CMS e o frontend:</p>
        <pre><code>WORDPRESS_URL=http://localhost:8080\nSITE_URL=http://localhost:4321\nASTROPRESS_PREVIEW_SECRET=seu-segredo-aqui</code></pre>
        
        <h2>2. Ambiente Local Rápido com Docker</h2>
        <p>O starter inclui um <code>docker-compose.yml</code> pronto para uso com WordPress 7.0 e MySQL 8.4 isolados.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Configuração passo a passo de variáveis de ambiente, Docker Compose, regras de permalinks e deploy estático automatizado em CDNs.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 5, name: 'Guia', slug: 'guia', taxonomy: 'category' },
          { id: 6, name: 'DevOps', slug: 'devops', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 4,
    slug: 'draft-preview-e-fluxo-editorial',
    date: '2026-08-11T10:00:00',
    title: { rendered: 'Draft Preview em Tempo Real: Como Visualizar Rascunhos sem Rebuild' },
    content: {
      rendered: `
        <h2>1. O Desafio Editorial em Arquiteturas SSG</h2>
        <p>Em geradores de sites estáticos puros, redatores e editores costumam enfrentar uma grande barreira: como visualizar uma postagem não publicada ou uma revisão antes de disparar o build público?</p>
        <p>O AstroPress soluciona essa dor através de uma rota de renderização sob demanda dedicada (<code>export const prerender = false</code>) em <code>src/pages/preview.astro</code>.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>O handshake seguro tokenizado entre o plugin AstroPress Connector e a rota sob demanda /preview para visualização instantânea de rascunhos.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 7, name: 'Workflow', slug: 'workflow', taxonomy: 'category' },
          { id: 8, name: 'Segurança', slug: 'seguranca', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 5,
    slug: 'seo-avancado-e-otimizacao-de-imagens',
    date: '2026-08-10T10:00:00',
    title: { rendered: 'Engenharia de SEO &amp; Otimização de Imagens: Cascata de Metadados e WebP/AVIF' },
    content: {
      rendered: `
        <h2>1. A Cascata de SEO em 4 Níveis</h2>
        <p>O módulo <code>src/lib/wordpress/seo.ts</code> resolve automaticamente os metadados de cada página seguindo uma hierarquia de precedência estrita: Yoast SEO > Rank Math > Campos Nativos > Defaults do Site.</p>
        
        <h2>2. Pipeline de Imagens com astro:assets e Zero CLS</h2>
        <p>O starter utiliza o componente oficial <code>&lt;Image /&gt;</code> do Astro, baixando e convertendo as imagens remotas do WordPress durante o build com zero CLS.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Cascata inteligente de SEO de 4 níveis (Yoast / RankMath / Nativo / Defaults), Schema.org JSON-LD estruturado e pipeline de imagens com astro:assets.</p>',
    },
    _embedded: {
      'wp:featuredmedia': [MOCK_ROCKET_IMAGE],
      author: [MOCK_AUTHOR],
      'wp:term': [
        [
          { id: 9, name: 'SEO', slug: 'seo', taxonomy: 'category' },
          { id: 10, name: 'Performance', slug: 'performance', taxonomy: 'category' },
        ],
      ],
    },
  },
  {
    id: 6,
    slug: 'observabilidade-doctor-e-performance-budgets',
    date: '2026-08-09T10:00:00',
    title: { rendered: 'Observabilidade e Auditoria Automática: Headless Doctor e Performance Budgets' },
    content: {
      rendered: `
        <h2>1. Diagnóstico Automatizado com o Headless Doctor</h2>
        <p>Sistemas desacoplados podem falhar silenciosamente se a API do CMS sofrer alterações ou se as credenciais ficarem dessincronizadas. O <strong>Headless Doctor</strong> (<code>npm run doctor</code> ou <code>/doctor</code>) valida 7 categorias de testes em milissegundos.</p>
        
        <h2>2. Orçamentos Estritos de Performance</h2>
        <p>O arquivo <code>budget.json</code> e o script <code>npm run audit:perf</code> bloqueiam builds que ultrapassem limites de peso ou introduzam scripts em páginas editoriais.</p>
      `,
    },
    excerpt: {
      rendered:
        '<p>Como o comando npm run doctor e o motor de orçamentos de performance em budget.json garantem a estabilidade e velocidade do seu projeto em produção.</p>',
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
