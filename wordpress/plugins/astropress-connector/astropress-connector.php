<?php
/**
 * Plugin Name:       AstroPress Connector
 * Plugin URI:        https://github.com/hd-rx8/AstroPress-Headless-Starter
 * Description:       Bridges WordPress with your static Astro frontend: automated redirects, preview links, deploy webhooks, and health checks.
 * Version:           1.1.0
 * Author:            hdrx
 * Author URI:        https://github.com/hd-rx8
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       astropress-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ASTROPRESS_CONNECTOR_VERSION', '1.1.0');
define('ASTROPRESS_CONNECTOR_FILE', __FILE__);
define('ASTROPRESS_CONNECTOR_DIR', plugin_dir_path(__FILE__));
define('ASTROPRESS_CONNECTOR_URL', plugin_dir_url(__FILE__));

/**
 * Retrieves an AstroPress configuration value, prioritizing wp-config.php constants over database options.
 *
 * @param string $key Option key (e.g. 'astropress_frontend_url').
 * @param mixed  $default Default fallback value.
 * @return mixed
 */
function astropress_get_option($key, $default = '') {
    $constant_name = strtoupper($key);
    if (defined($constant_name)) {
        return constant($constant_name);
    }
    return get_option($key, $default);
}

// Load plugin components
require_once ASTROPRESS_CONNECTOR_DIR . 'includes/class-settings.php';
require_once ASTROPRESS_CONNECTOR_DIR . 'includes/class-redirects.php';
require_once ASTROPRESS_CONNECTOR_DIR . 'includes/class-deploy-hook.php';
require_once ASTROPRESS_CONNECTOR_DIR . 'includes/class-health-endpoint.php';
require_once ASTROPRESS_CONNECTOR_DIR . 'includes/class-preview-endpoint.php';

/**
 * Customizes WordPress Admin Footer credits.
 */
function astropress_admin_footer_credits($footer_text) {
    return 'Criado com <span style="color: #ef4444;">&hearts;</span> por <a href="https://github.com/hd-rx8" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: #2563eb;">hdrx</a> &bull; <a href="https://github.com/hd-rx8/AstroPress-Headless-Starter" target="_blank" rel="noopener noreferrer" style="font-weight: 600; text-decoration: none;">AstroPress Headless Starter</a>';
}
add_filter('admin_footer_text', 'astropress_admin_footer_credits');

function astropress_admin_footer_version($version_text) {
    return 'AstroPress v' . ASTROPRESS_CONNECTOR_VERSION . ' (Astro 5 + WP Headless)';
}
add_filter('update_footer', 'astropress_admin_footer_version', 11);

/**
 * Initializes all AstroPress Connector components.
 */
function astropress_connector_init() {
    new AstroPress_Settings();
    new AstroPress_Redirects();
    new AstroPress_Deploy_Hook();
    new AstroPress_Health_Endpoint();
    new AstroPress_Preview_Endpoint();
}
add_action('plugins_loaded', 'astropress_connector_init');
