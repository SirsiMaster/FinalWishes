/**
 * Legacy Theme Toggle
 * Handles switching between dark (blue/gold) and light (white/gold) themes
 */

(function() {
    'use strict';
    
    const STORAGE_KEY = 'legacy-theme';
    const DARK = 'dark';
    const LIGHT = 'light';
    
    /**
     * Get the current theme
     * @returns {string} 'dark' or 'light'
     */
    function getTheme() {
        // Check localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === DARK || stored === LIGHT) {
            return stored;
        }
        
        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return LIGHT;
        }
        
        // Default to dark (the original theme)
        return DARK;
    }
    
    // Theme color definitions
    const THEMES = {
        dark: {
            bodyBg: '#0f172a',
            bodyBgImage: 'radial-gradient(circle at 50% 0%, #2563eb 0%, #1e3a8a 40%, #0f172a 80%)',
            textColor: '#FFFFFF',
            navBg: 'rgba(0, 0, 0, 0.2)',
            navText: 'rgba(255, 255, 255, 0.7)',
            logoText: '#FFFFFF',
            cardBg: 'rgba(30, 58, 138, 0.5)',
            cardBorder: 'rgba(255, 255, 255, 0.1)',
            sectionBgAlt: 'rgba(30, 58, 138, 0.6)',
        },
        light: {
            bodyBg: '#FFFFFF',
            bodyBgImage: 'none',
            textColor: '#0f172a',
            navBg: 'rgba(255, 255, 255, 0.95)',
            navText: '#4B5563',
            logoText: '#0f172a',
            cardBg: '#FFFFFF',
            cardBorder: '#E5E7EB',
            sectionBgAlt: '#F9FAFB',
        }
    };

    /**
     * Set the theme
     * @param {string} theme - 'dark' or 'light'
     */
    function setTheme(theme) {
        if (theme !== DARK && theme !== LIGHT) {
            console.warn('Invalid theme:', theme);
            return;
        }
        
        const colors = THEMES[theme];
        
        // Update HTML attribute AND class
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.add('theme-' + theme);
        
        // Apply body styles directly
        document.body.style.backgroundColor = colors.bodyBg;
        document.body.style.backgroundImage = colors.bodyBgImage;
        document.body.style.color = colors.textColor;
        
        // Apply nav styles directly
        const nav = document.getElementById('main-nav');
        if (nav) {
            nav.style.background = colors.navBg;
        }
        
        // Apply nav link styles
        document.querySelectorAll('.nav-link').forEach(link => {
            link.style.color = colors.navText;
        });
        
        // Apply logo text
        document.querySelectorAll('.logo-text').forEach(el => {
            el.style.color = colors.logoText;
        });
        
        // Apply section backgrounds
        document.querySelectorAll('.section-bg-alt').forEach(el => {
            el.style.background = colors.sectionBgAlt;
        });
        
        // Store preference
        localStorage.setItem(STORAGE_KEY, theme);
        
        // Update any toggle buttons
        updateToggleButtons(theme);
        
        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('theme-change', { 
            detail: { theme } 
        }));
        
        console.log('🎨 Theme set to:', theme, '- Applied direct styles');
    }
    
    /**
     * Toggle between dark and light themes
     * @returns {string} The new theme
     */
    function toggleTheme() {
        const current = getTheme();
        const newTheme = current === DARK ? LIGHT : DARK;
        setTheme(newTheme);
        return newTheme;
    }
    
    /**
     * Update toggle button icons
     * @param {string} theme - Current theme
     */
    function updateToggleButtons(theme) {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const sunIcon = btn.querySelector('.icon-sun');
            const moonIcon = btn.querySelector('.icon-moon');
            
            if (sunIcon && moonIcon) {
                if (theme === DARK) {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                } else {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                }
            }
            
            // Update aria-label
            btn.setAttribute('aria-label', 
                theme === DARK ? 'Switch to light theme' : 'Switch to dark theme'
            );
        });
    }
    
    /**
     * Apply theme styles (for initial load before setTheme is called)
     * @param {string} theme - 'dark' or 'light'
     */
    function applyThemeStyles(theme) {
        const colors = THEMES[theme];
        if (!colors || !document.body) return;
        
        // Apply body styles directly
        document.body.style.backgroundColor = colors.bodyBg;
        document.body.style.backgroundImage = colors.bodyBgImage;
        document.body.style.color = colors.textColor;
        
        // Apply nav styles directly
        const nav = document.getElementById('main-nav');
        if (nav) {
            nav.style.background = colors.navBg;
        }
        
        // Apply nav link styles
        document.querySelectorAll('.nav-link').forEach(link => {
            link.style.color = colors.navText;
        });
        
        // Apply logo text
        document.querySelectorAll('.logo-text').forEach(el => {
            el.style.color = colors.logoText;
        });
        
        // Apply section backgrounds
        document.querySelectorAll('.section-bg-alt').forEach(el => {
            el.style.background = colors.sectionBgAlt;
        });
    }

    /**
     * Initialize theme on page load
     */
    function init() {
        // Set initial theme attribute immediately
        const theme = getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.add('theme-' + theme);
        
        // Wait for DOM to be ready to apply styles
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                applyThemeStyles(theme);
                updateToggleButtons(theme);
                setupToggleButtons();
            });
        } else {
            applyThemeStyles(theme);
            updateToggleButtons(theme);
            setupToggleButtons();
        }
        
        // Listen for system preference changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem(STORAGE_KEY)) {
                    setTheme(e.matches ? LIGHT : DARK);
                }
            });
        }
    }
    
    /**
     * Setup click handlers for toggle buttons
     */
    function setupToggleButtons() {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleTheme();
            });
        });
    }
    
    // Initialize immediately
    init();
    
    // Expose API globally
    window.LegacyTheme = {
        get: getTheme,
        set: setTheme,
        toggle: toggleTheme
    };
    
    // Also expose toggleTheme directly for onclick handlers
    window.toggleTheme = toggleTheme;
})();
