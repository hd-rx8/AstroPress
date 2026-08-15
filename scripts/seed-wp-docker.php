<?php
/**
 * WordPress Seeder: Injects 6 AstroPress starter posts, categories, permalinks,
 * and the rocket featured image into the WordPress database.
 */

define('WP_USE_THEMES', false);
require_once '/var/www/html/wp-load.php';
require_once '/var/www/html/wp-admin/includes/image.php';
require_once '/var/www/html/wp-admin/includes/file.php';
require_once '/var/www/html/wp-admin/includes/media.php';

echo "🚀 Iniciando o Seeder do AstroPress no WordPress...\n";

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

// 4. Define 6 Starter Posts
$posts_data = array(
    array(
        'title' => 'O que é o AstroPress e por que usar WordPress Headless com Astro 5',
        'slug' => 'o-que-e-astropress-headless',
        'categories' => array(array('Arquitetura', 'arquitetura'), array('Conceitos', 'conceitos')),
        'excerpt' => 'Entenda as vantagens da arquitetura desacoplada: máxima performance, zero dependência de PHP em runtime, custos reduzidos e a facilidade editorial que sua equipe já conhece no WordPress.',
        'content' => '<h2>A Revolução do WordPress Headless</h2><p>O WordPress alimenta mais de 40% de toda a web devido à sua interface editorial intuitiva, robustez e ecossistema incomparável. No entanto, os temas tradicionais em PHP podem sofrer com lentidão, sobrecarga de plugins, vulnerabilidades de segurança e custos elevados de servidor sob alto tráfego.</p><p>É aqui que entra a arquitetura <strong>Headless (desacoplada)</strong>: o WordPress atua exclusivamente como o CMS de gerenciamento de conteúdo no backend, enquanto o <strong>Astro 5</strong> assume o controle total da interface pública com geração de sites 100% estáticos (SSG).</p><h2>Por que escolher o AstroPress?</h2><ul><li><strong>0 KB de JavaScript em páginas de conteúdo:</strong> Carregamento instantâneo com HTML e CSS puros.</li><li><strong>Pontuação 100 no Core Web Vitals:</strong> Otimização extrema de LCP, FID/INP e CLS.</li><li><strong>Segurança Absoluta:</strong> Seu banco de dados MySQL e painel administrativo nunca são expostos diretamente aos visitantes públicos.</li><li><strong>Economia de Infraestrutura:</strong> Hospede seu frontend gratuitamente em CDNs globais como Cloudflare Pages, Vercel ou Netlify.</li></ul>',
    ),
    array(
        'title' => 'Como Funciona a Renderização Estática (SSG) com 0 KB de JavaScript',
        'slug' => 'renderizacao-estatica-zero-js',
        'categories' => array(array('Performance', 'performance'), array('Astro 5', 'astro-5')),
        'excerpt' => 'Descubra como o Astro compila o conteúdo do WordPress diretamente em HTML puro no build time, garantindo pontuações perfeitas de 100 no Core Web Vitals e carregamento instantâneo.',
        'content' => '<h2>O Ciclo de Vida do Build Estático</h2><p>No modelo tradicional, cada visitante que acessa uma página faz o servidor executar dezenas de consultas SQL no banco de dados e processar múltiplos arquivos PHP. No AstroPress, esse processo acontece apenas <strong>uma vez, durante o build</strong>.</p><h2>Vantagens da Abordagem Zero-JS</h2><p>Muitos frameworks modernos injetam centenas de kilobytes de JavaScript para hidratar componentes que são puro texto. O Astro adota a arquitetura de ilhas (Islands Architecture), emitindo apenas HTML semântico e CSS enxuto nas rotas editoriais.</p>',
    ),
    array(
        'title' => 'Guia de Configuração e Conexão: Variáveis de Ambiente e Permalinks',
        'slug' => 'guia-de-configuracao-e-conexao',
        'categories' => array(array('Guia', 'guia'), array('Setup', 'setup')),
        'excerpt' => 'Passo a passo para conectar o Astro ao seu WordPress local (Docker) ou de produção, configurando WORDPRESS_URL, SITE_URL e links permanentes amigáveis.',
        'content' => '<h2>Configuração Rápida em 3 Passos</h2><p>Para conectar o Astro ao seu WordPress existente ou local (Docker), você só precisa configurar o arquivo <code>.env</code> na raiz do projeto:</p><pre><code>WORDPRESS_URL=http://localhost:8080\nSITE_URL=http://localhost:4321\nASTROPRESS_PREVIEW_SECRET=sua-chave-secreta</code></pre><h2>Estrutura de Permalinks Recomendada</h2><p>No painel do WordPress, navegue até <em>Configurações > Links Permanentes</em> e selecione a opção <strong>"Nome do post" (/%postname%/)</strong>. Isso garante slugs limpos e consistentes para todas as rotas do blog.</p>',
    ),
    array(
        'title' => 'Draft Preview em Tempo Real: Como Visualizar Rascunhos no Astro',
        'slug' => 'draft-preview-em-tempo-real',
        'categories' => array(array('Workflow', 'workflow'), array('Preview', 'preview')),
        'excerpt' => 'Conheça o fluxo de publicação e preview seguro. Visualize alterações não publicadas do Gutenberg e Classic Editor sem precisar reexecutar o build estático.',
        'content' => '<h2>O Desafio dos Rascunhos em Sites Estáticos</h2><p>Um dos maiores receios de equipes editoriais ao migrar para Jamstack ou SSG é a perda do botão "Visualizar" em tempo real. No AstroPress, isso foi completamente resolvido com o endpoint de preview seguro.</p><h2>Fluxo de Preview Tokenizado</h2><p>Ao clicar em "Visualizar" no Gutenberg ou Classic Editor, o WordPress redireciona o editor para <code>/preview?id=123&type=post&secret=...</code> no Astro. O Astro valida o token com a REST API e carrega o rascunho instantaneamente com a barra de ferramentas flutuante <code>PreviewBanner</code>.</p>',
    ),
    array(
        'title' => 'Cascata de SEO Dinâmica e Otimização de Imagens com astro:assets',
        'slug' => 'seo-e-otimizacao-de-imagens',
        'categories' => array(array('SEO', 'seo'), array('Imagens', 'imagens')),
        'excerpt' => 'Integração automática com Yoast SEO e Rank Math, Schema.org JSON-LD para motores de busca e geração de imagens responsivas em WebP/AVIF sem layout shift.',
        'content' => '<h2>Cascata de SEO em 4 Níveis</h2><p>O AstroPress extrai metadados através de uma hierarquia inteligente:</p><ol><li><strong>Yoast SEO:</strong> Ingestão dos campos <code>yoast_head_json</code>.</li><li><strong>Rank Math SEO:</strong> Ingestão dos campos <code>rank_math_seo</code>.</li><li><strong>Campos Nativos do WordPress:</strong> Títulos, resumos e mídias padrão.</li><li><strong>Defaults do Site:</strong> Metadados de fallback configurados em <code>src/config/site.ts</code>.</li></ol><h2>Otimização Automática de Imagens</h2><p>Todas as imagens de destaque são processadas via <code>astro:assets</code>, gerando formatos modernos WebP e AVIF com <code>srcset</code> responsivo e zero Cumulative Layout Shift (CLS = 0).</p>',
    ),
    array(
        'title' => 'Headless Doctor e Performance Budgets: Auditoria e Saúde do Sistema',
        'slug' => 'headless-doctor-e-performance-budgets',
        'categories' => array(array('Diagnóstico', 'diagnostico'), array('DevOps', 'devops')),
        'excerpt' => 'Como auditar a saúde da sua REST API com o comando npm run doctor e garantir que seus limites de performance nunca sejam violados em produção.',
        'content' => '<h2>Diagnóstico Automatizado com o Headless Doctor</h2><p>Com o comando <code>npm run doctor</code> ou na rota <code>/doctor</code>, o sistema realiza uma auditoria em 7 categorias: Conectividade, Endpoints REST, Plugin AstroPress Connector, Permalinks, SEO, Preview Secret e Padrões de Imagem.</p><h2>Orçamentos Estritos de Performance</h2><p>O arquivo <code>budget.json</code> define limites rígidos (CSS &le; 25 KB, HTML &le; 50 KB, 0 KB JS editorial). Qualquer build que ultrapasse esses limites é barrado automaticamente pelo <code>npm run build:ci</code>.</p>',
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
        'post_content' => $p['content'],
        'post_excerpt' => $p['excerpt'],
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

echo "🎉 Seeding concluído com sucesso! 6 posts publicados no WordPress.\n";
