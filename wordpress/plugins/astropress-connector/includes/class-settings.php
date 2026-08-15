<?php
/**
 * Settings page and options handler for AstroPress Connector.
 */

if (!defined('ABSPATH')) {
    exit;
}

class AstroPress_Settings {

    public function __construct() {
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    public function add_settings_page() {
        add_options_page(
            __('AstroPress Connector', 'astropress-connector'),
            __('AstroPress', 'astropress-connector'),
            'manage_options',
            'astropress-connector',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting('astropress_settings_group', 'astropress_frontend_url', [
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => '',
        ]);

        register_setting('astropress_settings_group', 'astropress_preview_secret', [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ]);

        register_setting('astropress_settings_group', 'astropress_deploy_hook_url', [
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => '',
        ]);

        register_setting('astropress_settings_group', 'astropress_enable_redirect', [
            'type'              => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default'           => true,
        ]);

        register_setting('astropress_settings_group', 'astropress_deploy_debounce', [
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 30,
        ]);

        add_settings_section(
            'astropress_main_section',
            __('Configurações do Frontend Astro', 'astropress-connector'),
            [$this, 'render_section_description'],
            'astropress-connector'
        );

        add_settings_field(
            'astropress_frontend_url',
            __('URL do Frontend Astro', 'astropress-connector'),
            [$this, 'render_frontend_url_field'],
            'astropress-connector',
            'astropress_main_section'
        );

        add_settings_field(
            'astropress_preview_secret',
            __('Segredo de Preview (Draft Secret)', 'astropress-connector'),
            [$this, 'render_preview_secret_field'],
            'astropress-connector',
            'astropress_main_section'
        );

        add_settings_field(
            'astropress_enable_redirect',
            __('Redirecionar Frontend', 'astropress-connector'),
            [$this, 'render_enable_redirect_field'],
            'astropress-connector',
            'astropress_main_section'
        );

        add_settings_field(
            'astropress_deploy_hook_url',
            __('Webhook de Deploy / Rebuild', 'astropress-connector'),
            [$this, 'render_deploy_hook_url_field'],
            'astropress-connector',
            'astropress_main_section'
        );

        add_settings_field(
            'astropress_deploy_debounce',
            __('Debounce de Deploy (segundos)', 'astropress-connector'),
            [$this, 'render_deploy_debounce_field'],
            'astropress-connector',
            'astropress_main_section'
        );
    }

    public function render_section_description() {
        echo '<p>' . esc_html__('Configure a integração entre o WordPress CMS e o seu frontend estático Astro.', 'astropress-connector') . '</p>';
    }

    public function render_frontend_url_field() {
        $constant_set = defined('ASTROPRESS_FRONTEND_URL');
        $value = astropress_get_option('astropress_frontend_url', '');
        ?>
        <input type="url" name="astropress_frontend_url" value="<?php echo esc_attr($value); ?>" class="regular-text" <?php disabled($constant_set); ?> placeholder="http://localhost:4321 ou https://meusite.com" />
        <p class="description">
            <?php esc_html_e('Endereço público do seu site Astro. Usado para reescrever links de posts e redirecionar visitantes.', 'astropress-connector'); ?>
            <?php if ($constant_set): ?>
                <strong style="color: #2563eb;"><?php esc_html_e('(Definido via constante ASTROPRESS_FRONTEND_URL no wp-config.php)', 'astropress-connector'); ?></strong>
            <?php endif; ?>
        </p>
        <?php
    }

    public function render_preview_secret_field() {
        $constant_set = defined('ASTROPRESS_PREVIEW_SECRET');
        $value = astropress_get_option('astropress_preview_secret', '');
        ?>
        <input type="password" name="astropress_preview_secret" value="<?php echo esc_attr($value); ?>" class="regular-text" id="astropress_preview_secret_input" <?php disabled($constant_set); ?> placeholder="ex: chave-secreta-super-segura" />
        <button type="button" class="button button-secondary" onclick="var el = document.getElementById('astropress_preview_secret_input'); el.type = el.type === 'password' ? 'text' : 'password';">
            👁️ <?php esc_html_e('Mostrar/Ocultar', 'astropress-connector'); ?>
        </button>
        <p class="description">
            <?php esc_html_e('Token secreto compartilhado com a variável ASTROPRESS_PREVIEW_SECRET no Astro para autenticar a visualização de rascunhos.', 'astropress-connector'); ?>
            <?php if ($constant_set): ?>
                <strong style="color: #2563eb;"><?php esc_html_e('(Definido via constante ASTROPRESS_PREVIEW_SECRET no wp-config.php)', 'astropress-connector'); ?></strong>
            <?php endif; ?>
        </p>
        <?php
    }

    public function render_enable_redirect_field() {
        $constant_set = defined('ASTROPRESS_ENABLE_REDIRECT');
        $value = (bool) astropress_get_option('astropress_enable_redirect', true);
        ?>
        <label>
            <input type="checkbox" name="astropress_enable_redirect" value="1" <?php checked($value); ?> <?php disabled($constant_set); ?> />
            <?php esc_html_e('Redirecionar automaticamente todas as visitas públicas do WordPress para o Astro (mantém /wp-admin e REST API acessíveis).', 'astropress-connector'); ?>
        </label>
        <?php
    }

    public function render_deploy_hook_url_field() {
        $constant_set = defined('ASTROPRESS_DEPLOY_HOOK_URL');
        $value = astropress_get_option('astropress_deploy_hook_url', '');
        ?>
        <input type="url" name="astropress_deploy_hook_url" value="<?php echo esc_attr($value); ?>" class="large-text" <?php disabled($constant_set); ?> placeholder="https://api.vercel.com/v1/integrations/deploy/..." />
        <p class="description">
            <?php esc_html_e('URL do webhook para disparar o rebuild estático na Vercel, Netlify ou GitHub Actions ao publicar novos conteúdos.', 'astropress-connector'); ?>
            <?php if ($constant_set): ?>
                <strong style="color: #2563eb;"><?php esc_html_e('(Definido via constante ASTROPRESS_DEPLOY_HOOK_URL no wp-config.php)', 'astropress-connector'); ?></strong>
            <?php endif; ?>
        </p>
        <?php
    }

    public function render_deploy_debounce_field() {
        $constant_set = defined('ASTROPRESS_DEPLOY_DEBOUNCE');
        $value = (int) astropress_get_option('astropress_deploy_debounce', 30);
        ?>
        <input type="number" name="astropress_deploy_debounce" value="<?php echo esc_attr($value); ?>" class="small-text" min="0" max="600" <?php disabled($constant_set); ?> />
        <p class="description">
            <?php esc_html_e('Tempo mínimo de espera em segundos entre deploys consecutivos para evitar múltiplos builds acidentais.', 'astropress-connector'); ?>
        </p>
        <?php
    }

    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $deploy_history = get_option('astropress_deploy_history', array());
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('astropress_settings_group');
                do_settings_sections('astropress-connector');
                submit_button(__('Salvar Configurações', 'astropress-connector'));
                ?>
            </form>
            <hr />
            <h2><?php esc_html_e('Histórico de Deploys Recentes', 'astropress-connector'); ?></h2>
            <?php if (empty($deploy_history)): ?>
                <p><em><?php esc_html_e('Nenhum webhook disparado ainda.', 'astropress-connector'); ?></em></p>
            <?php else: ?>
                <table class="widefat striped" style="max-width: 800px; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Data / Hora', 'astropress-connector'); ?></th>
                            <th><?php esc_html_e('Motivo', 'astropress-connector'); ?></th>
                            <th><?php esc_html_e('Post ID', 'astropress-connector'); ?></th>
                            <th><?php esc_html_e('Status HTTP', 'astropress-connector'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach (array_reverse((array)$deploy_history) as $entry): ?>
                            <tr>
                                <td><?php echo esc_html(isset($entry['time']) ? $entry['time'] : 'N/A'); ?></td>
                                <td><code><?php echo esc_html(isset($entry['reason']) ? $entry['reason'] : 'N/A'); ?></code></td>
                                <td><?php echo esc_html(isset($entry['post_id']) && $entry['post_id'] ? '#' . $entry['post_id'] : '—'); ?></td>
                                <td>
                                    <?php
                                    $code = isset($entry['http_code']) ? intval($entry['http_code']) : 0;
                                    if ($code >= 200 && $code < 300) {
                                        echo '<span style="color: #16a34a; font-weight: 600;">✓ ' . esc_html($code) . ' OK</span>';
                                    } elseif ($code > 0) {
                                        echo '<span style="color: #dc2626; font-weight: 600;">✕ ' . esc_html($code) . ' Erro</span>';
                                    } else {
                                        echo '<span style="color: #6b7280;">N/A</span>';
                                    }
                                    ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
            <hr />
            <h2><?php esc_html_e('Diagnóstico e Endpoints REST', 'astropress-connector'); ?></h2>
            <p>
                <strong><?php esc_html_e('Endpoint de Saúde:', 'astropress-connector'); ?></strong>
                <code><a href="<?php echo esc_url(rest_url('astropress/v1/health')); ?>" target="_blank"><?php echo esc_html(rest_url('astropress/v1/health')); ?></a></code>
            </p>
            <p>
                <strong><?php esc_html_e('Endpoint de Preview de Rascunhos:', 'astropress-connector'); ?></strong>
                <code><?php echo esc_html(rest_url('astropress/v1/preview?id={id}&secret={secret}')); ?></code>
            </p>
        </div>
        <?php
    }
}
