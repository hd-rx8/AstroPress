<?php
/**
 * WordPress Seeder: Injects 6 comprehensive, technical AstroPress starter posts,
 * architectural guides, and manifestos into the WordPress database.
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

// 3. Clear old sample posts
$existing_posts = get_posts(array('post_type' => 'post', 'numberposts' => -1, 'post_status' => 'any'));
foreach ($existing_posts as $ep) {
    wp_delete_post($ep->ID, true);
}
echo "✓ Posts antigos limpos.\n";

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
          <p>Funções puras transformam os payloads brutos nas interfaces de domínio <code>Post</code>, <code>Page</code>, <code>Category</code> e <code>Media</code>. O normalizador aplica:</p>
          <pre><code>export function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, entity) =&gt; {
    // Decodifica entidades nomeadas, hexadecimais e decimais
    return NAMED_ENTITIES[entity] ?? match;
  });
}</code></pre>
          <p>Dessa forma, os componentes <code>.astro</code> recebem dados 100% limpos e fortemente tipados, sem necessidade de sanitizações manuais no template.</p>
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

          <h2>4. Deploy e Automação de CI</h2>
          <p>Para validar a integridade do build estático antes do envio para produção, execute o smoke test de CI:</p>
          <pre><code>npm run build:ci</code></pre>
          <p>O comando compila o projeto contra um servidor fixture em memória e executa automaticamente a auditoria de orçamentos de performance (CSS &le; 25 KB, Zero-JS em páginas editoriais e CLS = 0).</p>
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
          <p>O fluxo de preview opera com as seguintes etapas:</p>
          <ol>
            <li>O editor clica no botão "Visualizar" no Gutenberg ou Classic Editor no WordPress.</li>
            <li>O plugin <strong>astropress-connector</strong> gera uma URL assinada: <code>https://seusite.com/preview?id=123&amp;type=post&amp;secret=token-secreto</code>.</li>
            <li>O Astro consulta o endpoint seguro <code>/wp-json/astropress/v1/preview</code> no WordPress.</li>
            <li>O plugin valida o segredo com comparação de hash resistente a timing attacks (<code>hash_equals</code>) e retorna a revisão/autosave mais recente.</li>
          </ol>

          <h2>3. Barra de Ferramentas e Proteção SEO</h2>
          <p>Ao renderizar um rascunho, o Astro insere o componente <code>&lt;PreviewBanner /&gt;</code> fixado no topo, exibindo:</p>
          <ul>
            <li>Badge visual de "Rascunho Não Publicado".</li>
            <li>Identificador numérico do post e status da revisão.</li>
            <li>Link de 1 clique para retornar ao editor no <code>wp-admin</code>.</li>
          </ul>
          <p>Adicionalmente, a tag <code>&lt;meta name="robots" content="noindex,nofollow" /&gt;</code> é injetada obrigatoriamente para impedir que motores de busca indexem conteúdo confidencial em elaboração.</p>
        ',
    ),
    array(
        'title' => 'Engenharia de SEO & Otimização de Imagens: Cascata de Metadados e WebP/AVIF',
        'slug' => 'seo-avancado-e-otimizacao-de-imagens',
        'categories' => array(array('SEO', 'seo'), array('Performance', 'performance')),
        'excerpt' => 'Cascata inteligente de SEO de 4 níveis (Yoast / RankMath / Nativo / Defaults), Schema.org JSON-LD estruturado e pipeline de imagens com astro:assets.',
        'content' => '
          <h2>1. A Cascata de SEO em 4 Níveis</h2>
          <p>O módulo <code>src/lib/wordpress/seo.ts</code> resolve automaticamente os metadados de cada página seguindo uma hierarquia de precedência estrita:</p>
          <ol>
            <li><strong>Yoast SEO (<code>yoast_head_json</code>):</strong> Ingestão de títulos customizados, meta descriptions, canonical URLs, diretivas de robots, Open Graph e Twitter Cards.</li>
            <li><strong>Rank Math SEO (<code>rank_math_seo</code>):</strong> Suporte transparente às tags geradas pelo plugin Rank Math.</li>
            <li><strong>Campos Nativos do WordPress:</strong> Extração automática de títulos, resumos textuais limpos e imagens de destaque anexadas.</li>
            <li><strong>Defaults do Site (<code>src/config/site.ts</code>):</strong> Metadados de contingência para páginas sem configuração explícita.</li>
          </ol>

          <h2>2. Grafos Estruturados Schema.org JSON-LD</h2>
          <p>Para garantir que o Google e outros motores de busca exibam Rich Snippets e sitelinks ricos, o sistema gera blocos JSON-LD semanticamente válidos:</p>
          <ul>
            <li><code>BlogPosting</code> em páginas de artigo, com dados de autor, data de publicação e imagem de capa.</li>
            <li><code>BreadcrumbList</code> em todas as páginas internas para navegação hierárquica clara.</li>
            <li><code>WebSite</code> na página inicial com declaração do nome e descrição canônica do projeto.</li>
          </ul>

          <h2>3. Pipeline de Imagens com astro:assets e Zero CLS</h2>
          <p>O starter utiliza o componente oficial <code>&lt;Image /&gt;</code> do Astro, baixando e convertendo as imagens remotas do WordPress durante o build:</p>
          <pre><code>&lt;Image
  src={post.featuredImage.url}
  alt={post.featuredImage.alt}
  width={post.featuredImage.width}
  height={post.featuredImage.height}
  widths={[360, 540, 720, 1080]}
  sizes="(max-width: 768px) 100vw, 33vw"
  loading="lazy"
  decoding="async"
/&gt;</code></pre>
          <p>Com a declaração explícita de largura e altura, o navegador reserva as dimensões da imagem no DOM antes mesmo do download dos bytes, travando o <strong>Cumulative Layout Shift (CLS) em zero absoluto</strong>.</p>
        ',
    ),
    array(
        'title' => 'Observabilidade e Auditoria Automática: Headless Doctor e Performance Budgets',
        'slug' => 'observabilidade-doctor-e-performance-budgets',
        'categories' => array(array('Diagnóstico', 'diagnostico'), array('DevOps', 'devops')),
        'excerpt' => 'Como o comando npm run doctor e o motor de orçamentos de performance em budget.json garantem a estabilidade e velocidade do seu projeto em produção.',
        'content' => '
          <h2>1. Diagnóstico Automatizado com o Headless Doctor</h2>
          <p>Sistemas desacoplados podem falhar silenciosamente se a API do CMS sofrer alterações ou se as credenciais de autenticação ficarem dessincronizadas. Para prevenir isso, o AstroPress inclui o motor <strong>Headless Doctor</strong> (<code>src/lib/doctor/</code>).</p>
          <p>O utilitário pode ser executado via terminal ou acessado pelo navegador em <code>/doctor</code>, validando 7 baterias de testes em milissegundos:</p>
          <ul>
            <li><strong>Ambiente e Configuração:</strong> Validação de sintaxe de URLs no <code>.env</code> e presença de segredos.</li>
            <li><strong>Conectividade e Latência:</strong> Ping HTTP e verificação do índice raiz <code>/wp-json/</code>.</li>
            <li><strong>Endpoints REST Primários:</strong> Teste de resposta e paginação de <code>/posts</code>, <code>/pages</code> e <code>/categories</code>.</li>
            <li><strong>Plugin AstroPress Connector:</strong> Verificação de versão, status dos redirects e webhooks de rebuild.</li>
            <li><strong>Permalinks:</strong> Alerta se o WordPress estiver com a estrutura padrão <code>?p=123</code> em vez de <code>/%postname%/</code>.</li>
            <li><strong>Plugins de SEO:</strong> Detecção automática de Yoast SEO e Rank Math.</li>
            <li><strong>Draft Preview &amp; Imagens:</strong> Teste de handshake do segredo de preview e autorização de <code>remotePatterns</code>.</li>
          </ul>

          <h2>2. Orçamentos Estritos de Performance (<code>budget.json</code>)</h2>
          <p>O arquivo declarativo <code>budget.json</code> estabelece as regras de ouro de velocidade do projeto:</p>
          <pre><code>{
  "budgets": {
    "editorialJsMaxBytes": 0,
    "interactiveJsMaxBytes": 20480,
    "cssGlobalMaxBytes": 25600,
    "htmlPageMaxBytes": 51200
  },
  "rules": {
    "requireZeroEditorialJs": true,
    "requireImageDimensions": true,
    "requireImageAlt": true
  }
}</code></pre>
          <p>O comando <code>npm run audit:perf</code> inspeciona todos os arquivos gerados no diretório <code>dist/</code> e bloqueia deploys que introduzam scripts não autorizados ou excedam os limites de tamanho estabelecidos.</p>
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

echo "🎉 Seeding concluído com sucesso! 6 artigos técnicos detalhados publicados no WordPress.\n";
