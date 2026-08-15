<?php
/**
 * Plugin Name: AstroPress Admin Credits
 * Description: Customizes the WP-Admin footer with author credits for hdrx.
 * Author: hdrx (https://github.com/hd-rx8)
 */
add_filter('admin_footer_text', function($footer_text) {
    return 'Criado com <span style="color: #ef4444;">&hearts;</span> por <a href="https://github.com/hd-rx8" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: #2563eb;">hdrx</a> &bull; Powered by <a href="https://github.com/hd-rx8/AstroPress-Headless-Starter" target="_blank" rel="noopener noreferrer" style="font-weight: 600; text-decoration: none;">AstroPress Headless Starter</a>';
});

add_filter('update_footer', function($version_text) {
    return 'AstroPress v1.1.0 (Astro 5 + WP Headless)';
}, 11);