<?php
/**
 * AstroPress Connector - Secure Preview REST Endpoint
 *
 * @package AstroPress_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class AstroPress_Preview_Endpoint {

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        register_rest_route('astropress/v1', '/preview', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'get_preview_data'),
            'permission_callback' => array($this, 'validate_preview_secret'),
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    },
                ),
                'type' => array(
                    'required'          => false,
                    'default'           => 'post',
                    'sanitize_callback' => 'sanitize_key',
                ),
                'secret' => array(
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));
    }

    public function validate_preview_secret($request) {
        $provided_secret = $request->get_param('secret');
        $configured_secret = astropress_get_option('astropress_preview_secret', '');

        if (empty($configured_secret) || empty($provided_secret)) {
            return new WP_Error('astropress_forbidden', 'Preview secret is not configured or missing', array('status' => 401));
        }

        if (!hash_equals((string) $configured_secret, (string) $provided_secret)) {
            return new WP_Error('astropress_forbidden', 'Invalid preview secret', array('status' => 401));
        }

        return true;
    }

    public function get_preview_data($request) {
        $post_id = absint($request->get_param('id'));
        $post = get_post($post_id);

        if (!$post) {
            return new WP_Error('astropress_not_found', 'Draft post not found', array('status' => 404));
        }

        // Check if there is an autosave or recent revision
        $revisions = wp_get_post_revisions($post_id, array('posts_per_page' => 1));
        if (!empty($revisions)) {
            $latest_revision = reset($revisions);
            $title = $latest_revision->post_title;
            $content = $latest_revision->post_content;
            $excerpt = $latest_revision->post_excerpt;
            $date = $latest_revision->post_modified;
        } else {
            $title = $post->post_title;
            $content = $post->post_content;
            $excerpt = $post->post_excerpt;
            $date = $post->post_date;
        }

        // Resolve featured image
        $thumbnail_id = get_post_thumbnail_id($post_id);
        $featured_media = array();
        if ($thumbnail_id) {
            $img_src = wp_get_attachment_image_src($thumbnail_id, 'full');
            $alt_text = get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true);
            if ($img_src) {
                $featured_media[] = array(
                    'source_url'    => $img_src[0],
                    'alt_text'      => $alt_text ? $alt_text : '',
                    'media_details' => array(
                        'width'  => $img_src[1],
                        'height' => $img_src[2],
                    ),
                );
            }
        }

        // Resolve author
        $author_id = $post->post_author;
        $author_data = array(
            'id'   => $author_id,
            'name' => get_the_author_meta('display_name', $author_id),
            'slug' => get_the_author_meta('user_nicename', $author_id),
        );

        $response_data = array(
            'id'             => $post->ID,
            'slug'           => $post->post_name ? $post->post_name : 'preview-' . $post->ID,
            'status'         => $post->post_status,
            'type'           => $post->post_type,
            'date'           => mysql_to_rfc3339($date),
            'title'          => array('rendered' => $title),
            'content'        => array('rendered' => apply_filters('the_content', $content)),
            'excerpt'        => array('rendered' => $excerpt),
            '_embedded'      => array(
                'wp:featuredmedia' => $featured_media,
                'author'           => array($author_data),
            ),
        );

        return rest_ensure_response($response_data);
    }
}
