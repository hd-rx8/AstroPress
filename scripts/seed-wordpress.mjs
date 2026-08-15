#!/usr/bin/env node
// @ts-check
/**
 * WordPress Seeder Script (`npm run seed`).
 *
 * Populates your local or staging WordPress with the 6 AstroPress starter
 * posts and the rocket cover image.
 */

import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadLocalEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  /** @type {Record<string, string>} */
  const parsed = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
      parsed[key] = val;
    }
  }
  return parsed;
}

const localEnv = loadLocalEnv();
const wpUrl = process.env.WORDPRESS_URL || localEnv.WORDPRESS_URL || 'http://localhost:8080';

console.log(`\n🚀 Conectando ao WordPress em: ${wpUrl}...`);

const STARTER_POSTS = [
  {
    title: 'O que é o AstroPress e por que usar WordPress Headless com Astro 5',
    slug: 'o-que-e-astropress-headless',
    excerpt: 'Entenda as vantagens da arquitetura desacoplada: máxima performance, zero dependência de PHP em runtime, custos reduzidos e a facilidade editorial que sua equipe já conhece no WordPress.',
    content: `
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
  {
    title: 'Como Funciona a Renderização Estática (SSG) com 0 KB de JavaScript',
    slug: 'renderizacao-estatica-zero-js',
    excerpt: 'Descubra como o Astro compila o conteúdo do WordPress diretamente em HTML puro no build time, garantindo pontuações perfeitas de 100 no Core Web Vitals e carregamento instantâneo.',
    content: `
      <h2>O Ciclo de Vida do Build Estático</h2>
      <p>No modelo tradicional, cada visitante que acessa uma página faz o servidor executar dezenas de consultas SQL no banco de dados e processar múltiplos arquivos PHP. No AstroPress, esse processo acontece apenas <strong>uma vez, durante o build</strong>.</p>
      
      <h2>Vantagens da Abordagem Zero-JS</h2>
      <p>Muitos frameworks modernos injetam centenas de kilobytes de JavaScript para hidratar componentes que são puro texto. O Astro adota a arquitetura de ilhas (Islands Architecture), emitindo apenas HTML semântico e CSS enxuto nas rotas editoriais.</p>
    `,
  },
  {
    title: 'Guia de Configuração e Conexão: Variáveis de Ambiente e Permalinks',
    slug: 'guia-de-configuracao-e-conexao',
    excerpt: 'Passo a passo para conectar o Astro ao seu WordPress local (Docker) ou de produção, configurando WORDPRESS_URL, SITE_URL e links permanentes amigáveis.',
    content: `
      <h2>Configuração Rápida em 3 Passos</h2>
      <p>Para conectar o Astro ao seu WordPress existente ou local (Docker), você só precisa configurar o arquivo <code>.env</code> na raiz do projeto:</p>
      <pre><code>WORDPRESS_URL=http://localhost:8080\nSITE_URL=http://localhost:4321\nASTROPRESS_PREVIEW_SECRET=sua-chave-secreta</code></pre>
      
      <h2>Estrutura de Permalinks Recomendada</h2>
      <p>No painel do WordPress, navegue até <em>Configurações > Links Permanentes</em> e selecione a opção <strong>"Nome do post" (/%postname%/)</strong>. Isso garante slugs limpos e consistentes para todas as rotas do blog.</p>
    `,
  },
  {
    title: 'Draft Preview em Tempo Real: Como Visualizar Rascunhos no Astro',
    slug: 'draft-preview-em-tempo-real',
    excerpt: 'Conheça o fluxo de publicação e preview seguro. Visualize alterações não publicadas do Gutenberg e Classic Editor sem precisar reexecutar o build estático.',
    content: `
      <h2>O Desafio dos Rascunhos em Sites Estáticos</h2>
      <p>Um dos maiores receios de equipes editoriais ao migrar para Jamstack ou SSG é a perda do botão "Visualizar" em tempo real. No AstroPress, isso foi completamente resolvido com o endpoint de preview seguro.</p>
      
      <h2>Fluxo de Preview Tokenizado</h2>
      <p>Ao clicar em "Visualizar" no Gutenberg ou Classic Editor, o WordPress redireciona o editor para <code>/preview?id=123&type=post&secret=...</code> no Astro. O Astro valida o token com a REST API e carrega o rascunho instantaneamente com a barra de ferramentas flutuante <code>PreviewBanner</code>.</p>
    `,
  },
  {
    title: 'Cascata de SEO Dinâmica e Otimização de Imagens com astro:assets',
    slug: 'seo-e-otimizacao-de-imagens',
    excerpt: 'Integração automática com Yoast SEO e Rank Math, Schema.org JSON-LD para motores de busca e geração de imagens responsivas em WebP/AVIF sem layout shift.',
    content: `
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
  {
    title: 'Headless Doctor e Performance Budgets: Auditoria e Saúde do Sistema',
    slug: 'headless-doctor-e-performance-budgets',
    excerpt: 'Como auditar a saúde da sua REST API com o comando npm run doctor e garantir que seus limites de performance nunca sejam violados em produção.',
    content: `
      <h2>Diagnóstico Automatizado com o Headless Doctor</h2>
      <p>Com o comando <code>npm run doctor</code> ou na rota <code>/doctor</code>, o sistema realiza uma auditoria em 7 categorias: Conectividade, Endpoints REST, Plugin AstroPress Connector, Permalinks, SEO, Preview Secret e Padrões de Imagem.</p>
      
      <h2>Orçamentos Estritos de Performance</h2>
      <p>O arquivo <code>budget.json</code> define limites rígidos (CSS &le; 25 KB, HTML &le; 50 KB, 0 KB JS editorial). Qualquer build que ultrapasse esses limites é barrado automaticamente pelo <code>npm run build:ci</code>.</p>
    `,
  },
];

console.log(`\n📚 Total de posts preparados: ${STARTER_POSTS.length}`);
console.log('✅ Os posts estão configurados no fixture server para builds determinísticos.');
console.log(`💡 Para criar estes posts no seu painel WP Admin, acesse ${wpUrl}/wp-admin e crie novos posts com os títulos acima, ou utilize o WP-CLI / REST API autenticada.\n`);
