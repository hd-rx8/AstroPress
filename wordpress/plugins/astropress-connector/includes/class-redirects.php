<?php
/**
 * Frontend template redirect and admin link rewriting for AstroPress Connector.
 */

if (!defined('ABSPATH')) {
    exit;
}

class AstroPress_Redirects {

    public function __construct() {
        add_action('template_redirect', [$this, 'handle_template_redirect']);
        add_filter('post_link', [$this, 'filter_post_link'], 10, 2);
        add_filter('page_link', [$this, 'filter_page_link'], 10, 2);
        add_filter('preview_post_link', [$this, 'filter_preview_post_link'], 10, 2);
        add_action('admin_bar_menu', [$this, 'filter_admin_bar_site_link'], 999);
    }

    /**
     * Checks if the current request should be exempt from frontend redirection.
     *
     * @return bool
     */
    protected function is_exempt_request() {
        if (is_admin() || wp_doing_cron() || wp_doing_ajax()) {
            return true;
        }

        if (defined('REST_REQUEST') && REST_REQUEST) {
            return true;
        }

        $uri = isset($_SERVER['REQUEST_URI']) ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI'])) : '';
        if (
            strpos($uri, '/wp-json') !== false ||
            strpos($uri, '/wp-login.php') !== false ||
            strpos($uri, '/wp-cron.php') !== false ||
            strpos($uri, '/xmlrpc.php') !== false ||
            strpos($uri, '/wp-content/uploads/') !== false
        ) {
            return true;
        }

        return false;
    }

    /**
     * Redirects public WordPress frontend requests to the corresponding Astro URL.
     */
    public function handle_template_redirect() {
        if ($this->is_exempt_request()) {
            return;
        }

        $enable_redirect = (bool) astropress_get_option('astropress_enable_redirect', true);
        $frontend_url    = esc_url_raw(astropress_get_option('astropress_frontend_url', ''));

        if (!$enable_redirect || empty($frontend_url)) {
            return;
        }

        $base = rtrim($frontend_url, '/');
        $target = $base . '/';

        if (is_front_page() || is_home()) {
            $target = $base . '/';
        } elseif (is_singular('post')) {
            $slug = get_post_field('post_name', get_the_ID());
            $target = $base . '/blog/' . $slug . '/';
        } elseif (is_page()) {
            $slug = get_post_field('post_name', get_the_ID());
            $target = $base . '/' . $slug . '/';
        } elseif (is_archive()) {
            $target = $base . '/blog/';
        }

        wp_redirect($target, 302);
        exit;
    }

    /**
     * Rewrites single post permalinks to point to the Astro frontend.
     *
     * @param string  $permalink Original WordPress permalink.
     * @param WP_Post $post      Post object.
     * @return string
     */
    public function filter_post_link($permalink, $post) {
        $frontend_url = esc_url_raw(astropress_get_option('astropress_frontend_url', ''));
        if (empty($frontend_url) || !is_object($post) || $post->post_type !== 'post') {
            return $permalink;
        }
        return rtrim($frontend_url, '/') . '/blog/' . $post->post_name . '/';
    }

    /**
     * Rewrites page permalinks to point to the Astro frontend.
     *
     * @param string  $permalink Original WordPress permalink.
     * @param int|WP_Post $post  Post ID or object.
     * @return string
     */
    public function filter_page_link($permalink, $post) {
        $frontend_url = esc_url_raw(astropress_get_option('astropress_frontend_url', ''));
        if (empty($frontend_url)) {
            return $permalink;
        }
        $post_obj = get_post($post);
        if (!$post_obj) {
            return $permalink;
        }
        return rtrim($frontend_url, '/') . '/' . $post_obj->post_name . '/';
    }

    /**
     * Rewrites preview post links.
     *
     * @param string  $preview_link Default preview link.
     * @param WP_Post $post         Post object.
     * @return string
     */
    public function filter_preview_post_link($preview_link, $post) {
        $frontend_url = esc_url_raw(astropress_get_option('astropress_frontend_url', ''));
        if (empty($frontend_url) || !is_object($post)) {
            return $preview_link;
        }

        $base = rtrim($frontend_url, '/');
        if ($post->post_type === 'post') {
            return $base . '/blog/' . $post->post_name . '/';
        }
        return $base . '/' . $post->post_name . '/';
    }

    /**
     * Modifies the "Visit Site" link in the top WordPress Admin Bar.
     *
     * @param WP_Admin_Bar $wp_admin_bar Admin bar object.
     */
    public function filter_admin_bar_site_link($wp_admin_bar) {
        $frontend_url = esc_url_raw(astropress_get_option('astropress_frontend_url', ''));
        if (empty($frontend_url)) {
            return;
        }

        $node = $wp_admin_bar->get_node('site-name');
        if ($node) {
            $node->href = esc_url($frontend_url);
            $node->meta['target'] = '_blank';
            $wp_admin_bar->add_node($node);
        }

        $view_site = $wp_admin_bar->get_node('view-site');
        if ($view_site) {
            $view_site->href = esc_url($frontend_url);
            $view_site->meta['target'] = '_blank';
            $wp_admin_bar->add_node($view_site);
        }
    }
}
