<?php
/**
 * Plugin Name:       AstroPress Connector
 * Plugin URI:        https://github.com/hd-rx8/AstroPress-Headless-Starter
 * Description:       Bridges WordPress with your static Astro frontend: automated redirects, preview links, deploy webhooks, and health checks.
 * Version:           1.1.0
 * Author:            AstroPress Team
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
