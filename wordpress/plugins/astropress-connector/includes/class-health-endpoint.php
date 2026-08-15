<?php
/**
 * REST API Health check endpoint for AstroPress Connector.
 *
 * Route: GET /wp-json/astropress/v1/health
 */

if (!defined('ABSPATH')) {
    exit;
}

class AstroPress_Health_Endpoint {

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        register_rest_route('astropress/v1', '/health', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_health_status'],
            'permission_callback' => '__return_true',
        ]);
    }

    /**
     * Responds with full system diagnostic status for headless integration.
     *
     * @param WP_REST_Request $request REST request object.
     * @return WP_REST_Response
     */
    public function get_health_status($request) {
        $permalink_structure = get_option('permalink_structure', '');

        // Detect active SEO plugin
        $seo_plugin = 'none';
        $seo_version = null;

        if (defined('WPSEO_VERSION')) {
            $seo_plugin = 'yoast';
            $seo_version = WPSEO_VERSION;
        } elseif (defined('RANK_MATH_VERSION')) {
            $seo_plugin = 'rank-math';
            $seo_version = RANK_MATH_VERSION;
        }

        $frontend_url = astropress_get_option('astropress_frontend_url', '');
        $deploy_hook  = astropress_get_option('astropress_deploy_hook_url', '');

        $data = [
            'status' => 'ok',
            'timestamp' => gmdate('c'),
            'wordpress' => [
                'version'              => get_bloginfo('version'),
                'php_version'          => phpversion(),
                'permalink_structure'  => $permalink_structure,
                'is_pretty_permalinks' => !empty($permalink_structure),
                'site_url'             => get_site_url(),
                'home_url'             => get_home_url(),
            ],
            'astropress' => [
                'plugin_version'          => ASTROPRESS_CONNECTOR_VERSION,
                'frontend_url'            => $frontend_url,
                'redirects_enabled'       => (bool) astropress_get_option('astropress_enable_redirect', true),
                'deploy_hook_configured'  => !empty($deploy_hook),
                'deploy_debounce_seconds' => (int) astropress_get_option('astropress_deploy_debounce', 30),
            ],
            'seo_plugin' => [
                'active'  => $seo_plugin,
                'version' => $seo_version,
            ],
            'endpoints' => [
                'posts'      => true,
                'pages'      => true,
                'categories' => true,
                'media'      => true,
            ],
        ];

        return rest_ensure_response($data);
    }
}
