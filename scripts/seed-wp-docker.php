<?php
/**
 * WordPress Seeder: Injects 6 comprehensive, technical AstroPress starter posts,
 * the 'About' README-in-site page, categories, permalinks, and rocket featured image.
 */

define('WP_USE_THEMES', false);
require_once '/var/www/html/wp-load.php';
require_once '/var/www/html/wp-admin/includes/image.php';
require_once '/var/www/html/wp-admin/includes/file.php';
require_once '/var/www/html/wp-admin/includes/media.php';

echo "🚀 Iniciando Seeder Avançado do AstroPress...\n";

// 1. Configure Pretty Permalinks
update_option('permalink_structure', '/%postname%/');
flush_rewrite_rules();
echo "✓ Permalinks configurados para /%postname%/\n";

// 2. Upload / Register Featured Image
$upload_dir = wp_upload_dir();
$filename = 'rocket-cover.jpg';
$source_file = '/var/www/html/rocket-cover.jpg';
$target_file = $upload_dir['path'] . '/' . $filename;

$attach_id = 0;
if (file_exists($source_file)) {
    copy($source_file, $target_file);
    $wp_filetype = wp_check_filetype($filename, null);
    $attachment = array(
        'post_mime_type' => $wp_filetype['type'] ?: 'image/jpeg',
        'post_title' => 'AstroPress Rocket Launch Cover',
        'post_content' => '',
        'post_status' => 'inherit'
    );
    $attach_id = wp_insert_attachment($attachment, $target_file);
    if (!is_wp_error($attach_id)) {
        $attach_data = wp_generate_attachment_metadata($attach_id, $target_file);
        wp_update_attachment_metadata($attach_id, $attach_data);
        update_post_meta($attach_id, '_wp_attachment_image_alt', 'Ilustração moderna de foguete no espaço');
        echo "✓ Imagem de destaque registrada na biblioteca de mídia (ID: {$attach_id})\n";
    }
}

// 3. Clear old sample posts & pages
$existing_posts = get_posts(array('post_type' => 'post', 'numberposts' => -1, 'post_status' => 'any'));
foreach ($existing_posts as $ep) {
    wp_delete_post($ep->ID, true);
}
$existing_pages = get_posts(array('post_type' => 'page', 'numberposts' => -1, 'post_status' => 'any'));
foreach ($existing_pages as $epg) {
    wp_delete_post($epg->ID, true);
}
echo "✓ Posts e páginas antigas limpos.\n";

// Helper for categories
function get_or_create_cat($name, $slug) {
    $term = get_term_by('slug', $slug, 'category');
    if ($term) return $term->term_id;
    $res = wp_insert_term($name, 'category', array('slug' => $slug));
    return is_array($res) ? $res['term_id'] : 1;
}

// 4. Define 6 Technical & Comprehensive Starter Articles
$posts_data = array(
    array(
        'title' => 'Manifesto & Tese: Por que WordPress Headless + Astro 5 é a Arquitetura Definitiva',
        'slug' => 'manifesto-wordpress-headless-astro',
        'categories' => array(array('Manifesto', 'manifesto'), array('Arquitetura', 'arquitetura')),
        'excerpt' => 'Uma análise aprofundada sobre os limites do monólito tradicional, os trade-offs de SPAs monolíticas em Next.js e como o AstroPress combina o melhor ecossistema editorial com zero runtime overhead.',
        'content' => '
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

          <h2>4. Comparativo de Arquiteturas</h2>
          <p>Confira como o AstroPress se posiciona frente aos modelos convencionais:</p>
          <pre><code>┌─────────────────────┬──────────────────┬─────────────────┬─────────────────┐
│ Métrica / Recurso   │ WP Monolítico    │ Next.js SSR     │ AstroPress SSG  │
├─────────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ Client JavaScript   │ 300 KB - 1.5 MB  │ 80 KB - 250 KB  │ 0 KB (Zero-JS)  │
│ TTFB Médio          │ 400ms - 1.2s     │ 150ms - 400ms   │ 15ms - 45ms     │
│ Custo de Hospedagem │ Médio/Alto (VPS) │ Médio (Node.js) │ Grátis (CDN/S3) │
│ Superfície de Risco │ Alta (PHP/SQL)   │ Média (Node SSR)│ Zero (Estático) │
└─────────────────────┴──────────────────┴─────────────────┴─────────────────┘</code></pre>
        ',
    ),
    array(
        'title' => 'Deep Dive no Core: Normalização de Dados, Resiliência e Isolamento de Payloads',
        'slug' => 'arquitetura-do-core-e-normalizacao',
        'categories' => array(array('Engenharia', 'engenharia'), array('TypeScript', 'typescript')),
        'excerpt' => 'Como o módulo src/lib/wordpress/ isola o frontend dos detalhes da REST API, decodifica entidades HTML e trata stubs de erro com TypeScript estrito.',
        'content' => '
          <h2>1. A Anatomia e Armadilhas da REST API do WordPress</h2>
          <p>A API REST nativa do WordPress (<code>/wp-json/wp/v2/</code>) é rica, porém possui peculiaridades que não devem vazar para os componentes de interface:</p>
          <ul>
            <li>Campos envelopados em objetos <code>rendered</code> (ex: <code>title.rendered</code>, <code>content.rendered</code>).</li>
            <li>Entidades HTML escapadas (ex: <code>&amp;#8217;</code> para apóstrofos, <code>&amp;amp;</code> para e-comercial).</li>
            <li>Stubs de erro no parâmetro <code>_embed</code>: quando uma mídia ou autor está inacessível ou sem permissão, o WordPress retorna um array contendo um objeto de erro <code>[{ code: "rest_forbidden" }]</code> ao invés de um array vazio.</li>
          </ul>

          <h2>2. Camada de Transporte Resiliente (<code>client.ts</code>)</h2>
          <p>O cliente HTTP centralizado em <code>src/lib/wordpress/client.ts</code> é a única interface que invoca <code>fetch()</code> contra o WordPress. Ele implementa:</p>
          <ul>
            <li><strong>Timeout com AbortController:</strong> Previne que builds fiquem travados indefinidamente caso o CMS esteja fora do ar.</li>
            <li><strong>Extração Autoritativa de Paginação:</strong> Lê os cabeçalhos <code>X-WP-Total</code> e <code>X-WP-TotalPages</code> na primeira requisição e paraleliza a busca das páginas subsequentes.</li>
            <li><strong>Tipagem de Erro Específica:</strong> Lança <code>WordPressRequestError</code> para falhas HTTP e <code>WordPressPaginationError</code> para cabeçalhos ausentes.</li>
          </ul>

          <h2>3. O Pipeline de Normalização (<code>normalizers.ts</code>)</h2>
          <p>Funções puras transformam os payloads brutos nas interfaces de domínio <code>Post</code>, <code>Page</code>, <code>Category</code> e <code>Media</code>. O normalizador aplica decodificação de entidades nomeadas, hexadecimais e numéricas, higienizando qualquer resquício de markup interno.</p>
        ',
    ),
    array(
        'title' => 'Guia Definitivo de Setup: Do Docker Local à Produção em Alta Escala',
        'slug' => 'guia-definitivo-de-setup-e-deploy',
        'categories' => array(array('Guia', 'guia'), array('DevOps', 'devops')),
        'excerpt' => 'Configuração passo a passo de variáveis de ambiente, Docker Compose, regras de permalinks e deploy estático automatizado em CDNs.',
        'content' => '
          <h2>1. Configuração de Variáveis de Ambiente</h2>
          <p>O arquivo <code>.env</code> na raiz do projeto controla a integração entre o CMS e o frontend:</p>
          <pre><code># URL base do WordPress (sem barra final e sem /wp-json)
WORDPRESS_URL=http://localhost:8080

# URL canônica do site Astro (usada em sitemaps, robots e Open Graph)
SITE_URL=http://localhost:4321

# Segredo compartilhado para autenticação de rascunhos em tempo real
ASTROPRESS_PREVIEW_SECRET=seu-segredo-de-preview-aqui</code></pre>

          <h2>2. Ambiente Local Rápido com Docker</h2>
          <p>O starter inclui um <code>docker-compose.yml</code> pronto para uso com WordPress 7.0 e MySQL 8.4 isolados:</p>
          <pre><code># Iniciar os containers em background
docker compose up -d

# Popular o banco de dados com os posts e mídias de demonstração
npm run seed</code></pre>

          <h2>3. Configuração de Permalinks Amigáveis</h2>
          <p>No painel do WordPress em <em>Configurações &gt; Links Permanentes</em>, selecione <strong>Nome do post (/%postname%/)</strong>. Essa configuração é essencial para que o servidor web processe as rotas REST sem conflitos de rewrite.</p>
        ',
    ),
    array(
        'title' => 'Draft Preview em Tempo Real: Como Visualizar Rascunhos sem Rebuild',
        'slug' => 'draft-preview-e-fluxo-editorial',
        'categories' => array(array('Workflow', 'workflow'), array('Segurança', 'seguranca')),
        'excerpt' => 'O handshake seguro tokenizado entre o plugin AstroPress Connector e a rota sob demanda /preview para visualização instantânea de rascunhos.',
        'content' => '
          <h2>1. O Desafio Editorial em Arquiteturas SSG</h2>
          <p>Em geradores de sites estáticos puros, redatores e editores costumam enfrentar uma grande barreira: como visualizar uma postagem não publicada ou uma revisão antes de disparar o build público?</p>
          <p>O AstroPress soluciona essa dor através de uma rota de renderização sob demanda dedicada (<code>export const prerender = false</code>) em <code>src/pages/preview.astro</code>.</p>

          <h2>2. O Handshake de Segurança Tokenizado</h2>
          <p>O plugin <strong>astropress-connector</strong> gera uma URL assinada ao clicar em "Visualizar": <code>https://seusite.com/preview?id=123&amp;type=post&amp;secret=token-secreto</code>. O Astro valida o token com a REST API via <code>hash_equals</code> e renderiza o rascunho com o componente <code>&lt;PreviewBanner /&gt;</code> e tag <code>noindex,nofollow</code>.</p>
        ',
    ),
    array(
        'title' => 'Engenharia de SEO & Otimização de Imagens: Cascata de Metadados e WebP/AVIF',
        'slug' => 'seo-avancado-e-otimizacao-de-imagens',
        'categories' => array(array('SEO', 'seo'), array('Performance', 'performance')),
        'excerpt' => 'Cascata inteligente de SEO de 4 níveis (Yoast / RankMath / Nativo / Defaults), Schema.org JSON-LD estruturado e pipeline de imagens com astro:assets.',
        'content' => '
          <h2>1. A Cascata de SEO em 4 Níveis</h2>
          <p>O módulo <code>src/lib/wordpress/seo.ts</code> resolve automaticamente os metadados seguindo a ordem de prioridade: Yoast SEO &gt; Rank Math &gt; Campos Nativos WP &gt; Defaults do Site.</p>
          <h2>2. Pipeline de Imagens com astro:assets e Zero CLS</h2>
          <p>O starter utiliza o componente oficial <code>&lt;Image /&gt;</code> do Astro com dimensões explícitas, gerando variantes WebP/AVIF responsivas no build e eliminando completamente o layout shift.</p>
        ',
    ),
    array(
        'title' => 'Observabilidade e Auditoria Automática: Headless Doctor e Performance Budgets',
        'slug' => 'observabilidade-doctor-e-performance-budgets',
        'categories' => array(array('Diagnóstico', 'diagnostico'), array('DevOps', 'devops')),
        'excerpt' => 'Como o comando npm run doctor e o motor de orçamentos de performance em budget.json garantem a estabilidade e velocidade do seu projeto em produção.',
        'content' => '
          <h2>1. Diagnóstico Automatizado com o Headless Doctor</h2>
          <p>O <strong>Headless Doctor</strong> (<code>npm run doctor</code> ou na rota <code>/doctor</code>) valida 7 categorias críticas: Ambiente, Conectividade, Endpoints REST, Plugin Connector, Permalinks, SEO e Preview Secret.</p>
          <h2>2. Orçamentos Estritos de Performance</h2>
          <p>O comando <code>npm run audit:perf</code> inspeciona o diretório <code>dist/</code> e garante que o build respeite os orçamentos (CSS &le; 25 KB, HTML &le; 50 KB e 0 KB JS editorial).</p>
        ',
    ),
);

// 5. Insert all posts
$admin_user = get_user_by('login', 'admin');
$author_id = $admin_user ? $admin_user->ID : 1;

foreach ($posts_data as $p) {
    $cat_ids = array();
    foreach ($p['categories'] as $c) {
        $cat_ids[] = get_or_create_cat($c[0], $c[1]);
    }

    $new_post_id = wp_insert_post(array(
        'post_title' => $p['title'],
        'post_name' => $p['slug'],
        'post_content' => trim($p['content']),
        'post_excerpt' => trim($p['excerpt']),
        'post_status' => 'publish',
        'post_type' => 'post',
        'post_author' => $author_id,
        'post_category' => $cat_ids,
    ));

    if (!is_wp_error($new_post_id)) {
        if ($attach_id > 0) {
            set_post_thumbnail($new_post_id, $attach_id);
        }
        echo "✓ Post criado: '{$p['title']}' (ID: {$new_post_id})\n";
    }
}

// 6. Insert 'About' Page (README in Site)
$about_content = '
<p class="lead">O <strong>AstroPress Headless Starter</strong> é uma base arquitetural moderna e opinativa projetada para equipes e desenvolvedores que desejam combinar o ecossistema editorial consolidado do WordPress com a velocidade, segurança e simplicidade do Astro 5.</p>

<h2>🚀 Visão Geral da Arquitetura</h2>
<p>O WordPress permanece como o <em>sistema editorial de registro</em> (CMS desacoplado), gerenciando posts, páginas, mídias, categorias e autores. Durante o processo de build, o Astro consulta a WordPress REST API e compila todo o site em puro HTML e CSS estático.</p>

<pre><code>┌─────────────────────┐
│    WordPress CMS    │  (Backend isolado: Gutenberg, mídias, taxonomias)
└──────────┬──────────┘
           │  REST API (/wp-json/wp/v2/* e /wp-json/astropress/v1/*)
           ▼
┌─────────────────────┐
│   WordPress Client  │  (src/lib/wordpress/client.ts — timeout & paginação)
└──────────┬──────────┘
           │  Raw JSON
           ▼
┌─────────────────────┐
│    Content Layer    │  (src/lib/wordpress/normalizers.ts — tipos puros)
└──────────┬──────────┘
           │  Normalized Post / Page / Category / Media
           ▼
┌─────────────────────┐
│   Astro Frontend    │  (src/pages/**, src/components/** — Astro 5 SSG)
└──────────┬──────────┘
           │  HTML + CSS Estáticos (0 KB Client JS)
           ▼
┌─────────────────────┐
│  Edge CDN / Deploy  │  (Cloudflare Pages, Vercel, Netlify, S3)
└─────────────────────┘</code></pre>

<h2>⚡ Quick Start em 3 Passos</h2>
<ol>
  <li><strong>Clone o repositório e instale as dependências:</strong>
    <pre><code>git clone https://github.com/hd-rx8/AstroPress-Headless-Starter.git
cd AstroPress-Headless-Starter
npm install</code></pre>
  </li>
  <li><strong>Inicie o WordPress localmente via Docker (opcional):</strong>
    <pre><code>docker compose up -d
npm run seed</code></pre>
  </li>
  <li><strong>Inicie o servidor de desenvolvimento do Astro:</strong>
    <pre><code>npm run dev</code></pre>
  </li>
</ol>

<h2>🛠️ Principais Comandos do Projeto</h2>
<ul>
  <li><code>npm run dev</code> — Inicia o servidor de desenvolvimento Astro em <code>http://localhost:4321</code>.</li>
  <li><code>npm run doctor</code> — Executa o utilitário Headless Doctor para validar 7 baterias de testes no WordPress.</li>
  <li><code>npm run build:ci</code> — Executa o build de smoke test contra o servidor fixture em memória e valida os orçamentos de performance.</li>
  <li><code>npm run audit:perf</code> — Inspeciona os arquivos compilados em <code>dist/</code> e emite relatório detalhado de peso e scripts por rota.</li>
  <li><code>npm run seed</code> — Popula o banco de dados do WordPress local com os artigos e mídias de demonstração.</li>
  <li><code>npm test</code> — Executa a suíte de testes unitários e de integração com Vitest.</li>
</ul>

<h2>🔒 Segurança & Performance Intransigente</h2>
<p>Em um site estático gerado com AstroPress:</p>
<ul>
  <li><strong>Zero Vulnerabilidade SQL/PHP no Frontend:</strong> Os visitantes acessam arquivos HTML estáticos hospedados na CDN, sem qualquer contato com o banco de dados ou execução de código PHP.</li>
  <li><strong>Zero Client JavaScript em Páginas de Conteúdo:</strong> Artigos e páginas institucionais não carregam frameworks JS no navegador, garantindo pontuações perfeitas de 100/100 no Google Lighthouse e Core Web Vitals impecáveis.</li>
</ul>
';

$about_page_id = wp_insert_post(array(
    'post_title' => 'Sobre o AstroPress',
    'post_name' => 'about',
    'post_content' => trim($about_content),
    'post_excerpt' => 'Conheça a arquitetura, objetivos e documentação completa do AstroPress Headless Starter.',
    'post_status' => 'publish',
    'post_type' => 'page',
    'post_author' => $author_id,
));

if (!is_wp_error($about_page_id)) {
    echo "✓ Página 'Sobre o AstroPress' criada com sucesso (ID: {$about_page_id})\n";
}

echo "🎉 Seeding completo! 6 artigos e página 'Sobre' publicados no WordPress.\n";
