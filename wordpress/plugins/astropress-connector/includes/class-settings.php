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
            <h2><?php esc_html_e('Diagnóstico e Health Check', 'astropress-connector'); ?></h2>
            <p>
                <?php esc_html_e('Endpoint de saúde da REST API:', 'astropress-connector'); ?>
                <code><a href="<?php echo esc_url(rest_url('astropress/v1/health')); ?>" target="_blank"><?php echo esc_html(rest_url('astropress/v1/health')); ?></a></code>
            </p>
        </div>
        <?php
    }
}
