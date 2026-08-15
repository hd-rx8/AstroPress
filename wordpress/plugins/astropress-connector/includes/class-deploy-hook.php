<?php
/**
 * Deploy hook dispatcher with debounce and manual admin bar trigger for AstroPress Connector.
 */

if (!defined('ABSPATH')) {
    exit;
}

class AstroPress_Deploy_Hook {

    public function __construct() {
        add_action('transition_post_status', [$this, 'on_post_status_transition'], 10, 3);
        add_action('wp_trash_post', [$this, 'on_trash_or_delete']);
        add_action('before_delete_post', [$this, 'on_trash_or_delete']);
        add_action('admin_bar_menu', [$this, 'add_admin_bar_rebuild_button'], 100);
        add_action('wp_ajax_astropress_manual_rebuild', [$this, 'handle_manual_rebuild_ajax']);
        add_action('admin_footer', [$this, 'render_admin_rebuild_script']);
    }

    /**
     * Triggers deploy webhook when post status changes to/from published.
     *
     * @param string  $new_status New post status.
     * @param string  $old_status Previous post status.
     * @param WP_Post $post       Post object.
     */
    public function on_post_status_transition($new_status, $old_status, $post) {
        if (wp_is_post_revision($post) || wp_is_post_autosave($post)) {
            return;
        }

        if (!in_array($post->post_type, ['post', 'page'], true)) {
            return;
        }

        if ($new_status === 'publish' || $old_status === 'publish') {
            $reason = sprintf('Post #%d "%s" transitioned from %s to %s', $post->ID, $post->post_title, $old_status, $new_status);
            $post_data = [
                'id'              => $post->ID,
                'type'            => $post->post_type,
                'slug'            => $post->post_name,
                'status'          => $new_status,
                'previous_status' => $old_status,
            ];
            $this->dispatch_deploy_webhook($reason, false, $post_data);
        }
    }

    /**
     * Triggers deploy webhook when a post or page is trashed or permanently deleted.
     *
     * @param int $post_id Post ID.
     */
    public function on_trash_or_delete($post_id) {
        $post = get_post($post_id);
        if (!$post || wp_is_post_revision($post) || !in_array($post->post_type, ['post', 'page'], true)) {
            return;
        }

        if ($post->post_status === 'publish') {
            $reason = sprintf('Post #%d "%s" was trashed or deleted', $post->ID, $post->post_title);
            $post_data = [
                'id'              => $post->ID,
                'type'            => $post->post_type,
                'slug'            => $post->post_name,
                'status'          => 'trash',
                'previous_status' => 'publish',
            ];
            $this->dispatch_deploy_webhook($reason, false, $post_data);
        }
    }

    /**
     * Dispatches the HTTP POST request to the configured deploy hook with debounce protection.
     *
     * @param string $reason Context description of why deploy was triggered.
     * @param bool   $force  Whether to bypass debounce (used by manual rebuild button).
     * @param array|null $post_data Optional post context data.
     * @return bool
     */
    public function dispatch_deploy_webhook($reason = 'Content update', $force = false, $post_data = null) {
        $hook_url = esc_url_raw(astropress_get_option('astropress_deploy_hook_url', ''));
        if (empty($hook_url)) {
            return false;
        }

        $debounce_seconds = (int) astropress_get_option('astropress_deploy_debounce', 30);

        if (!$force && $debounce_seconds > 0) {
            $is_locked = get_transient('astropress_deploy_lock');
            if ($is_locked) {
                return false;
            }
            set_transient('astropress_deploy_lock', time(), $debounce_seconds);
        }

        $payload = [
            'source'          => 'AstroPress Connector',
            'reason'          => $reason,
            'timestamp'       => time(),
            'site'            => get_bloginfo('name'),
            'event'           => $post_data ? 'post_transition' : 'manual_rebuild',
            'post_id'         => $post_data && isset($post_data['id']) ? $post_data['id'] : null,
            'post_type'       => $post_data && isset($post_data['type']) ? $post_data['type'] : null,
            'slug'            => $post_data && isset($post_data['slug']) ? $post_data['slug'] : null,
            'status'          => $post_data && isset($post_data['status']) ? $post_data['status'] : null,
            'previous_status' => $post_data && isset($post_data['previous_status']) ? $post_data['previous_status'] : null,
        ];

        // Non-blocking POST so the user's admin save response is instant
        $response = wp_remote_post($hook_url, [
            'method'    => 'POST',
            'timeout'   => 5,
            'blocking'  => false,
            'headers'   => [
                'Content-Type' => 'application/json; charset=utf-8',
                'User-Agent'   => 'AstroPress-Connector/' . ASTROPRESS_CONNECTOR_VERSION,
            ],
            'body'      => wp_json_encode($payload),
        ]);

        // Record deployment in local history
        $history = get_option('astropress_deploy_history', []);
        if (!is_array($history)) {
            $history = [];
        }
        $history[] = [
            'time'      => current_time('mysql'),
            'reason'    => $reason,
            'post_id'   => $post_data && isset($post_data['id']) ? $post_data['id'] : null,
            'http_code' => is_wp_error($response) ? 500 : 200,
        ];
        if (count($history) > 5) {
            $history = array_slice($history, -5);
        }
        update_option('astropress_deploy_history', $history, false);

        return true;
    }

    /**
     * Adds the "🚀 Rebuild Site" button to the WordPress Admin Top Bar.
     *
     * @param WP_Admin_Bar $wp_admin_bar Admin bar instance.
     */
    public function add_admin_bar_rebuild_button($wp_admin_bar) {
        if (!current_user_can('edit_posts')) {
            return;
        }

        $hook_url = astropress_get_option('astropress_deploy_hook_url', '');
        if (empty($hook_url)) {
            return;
        }

        $wp_admin_bar->add_node([
            'id'    => 'astropress-rebuild',
            'title' => '<span class="ab-icon">🚀</span> ' . __('Rebuild Site (Astro)', 'astropress-connector'),
            'href'  => '#',
            'meta'  => [
                'title'   => __('Disparar rebuild estático do site no Astro / Vercel', 'astropress-connector'),
                'onclick' => 'astropressTriggerRebuild(event);',
            ],
        ]);
    }

    /**
     * Handles manual rebuild AJAX action.
     */
    public function handle_manual_rebuild_ajax() {
        check_ajax_referer('astropress_rebuild_nonce', 'nonce');

        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => __('Permissão negada.', 'astropress-connector')], 403);
        }

        $success = $this->dispatch_deploy_webhook('Manual rebuild triggered from WP Admin Bar', true);

        if ($success) {
            wp_send_json_success(['message' => __('Deploy disparado com sucesso no Astro / Vercel!', 'astropress-connector')]);
        } else {
            wp_send_json_error(['message' => __('Webhook de deploy não configurado.', 'astropress-connector')], 400);
        }
    }

    /**
     * Renders small inline JS script in admin footer for the top bar rebuild button.
     */
    public function render_admin_rebuild_script() {
        if (!current_user_can('edit_posts')) {
            return;
        }
        $nonce = wp_create_nonce('astropress_rebuild_nonce');
        ?>
        <script>
        function astropressTriggerRebuild(event) {
            if (event) event.preventDefault();
            if (!confirm('Deseja disparar um rebuild completo do site no Astro agora?')) {
                return;
            }
            var el = document.getElementById('wp-admin-bar-astropress-rebuild');
            if (el) el.style.opacity = '0.5';

            fetch('<?php echo esc_url(admin_url('admin-ajax.php')); ?>', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=astropress_manual_rebuild&nonce=<?php echo esc_js($nonce); ?>'
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (el) el.style.opacity = '1';
                if (data.success) {
                    alert('🚀 ' + (data.data.message || 'Build disparado com sucesso!'));
                } else {
                    alert('⚠️ Erro: ' + (data.data.message || 'Falha ao disparar deploy.'));
                }
            })
            .catch(function(err) {
                if (el) el.style.opacity = '1';
                alert('Erro de conexão ao disparar deploy.');
            });
        }
        </script>
        <?php
    }
}
