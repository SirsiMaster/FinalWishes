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
    
    /**
     * Set the theme
     * @param {string} theme - 'dark' or 'light'
     */
    function setTheme(theme) {
        if (theme !== DARK && theme !== LIGHT) {
            console.warn('Invalid theme:', theme);
            return;
        }
        
        // Update HTML attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Store preference
        localStorage.setItem(STORAGE_KEY, theme);
        
        // Update any toggle buttons
        updateToggleButtons(theme);
        
        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('theme-change', { 
            detail: { theme } 
        }));
        
        console.log('🎨 Theme set to:', theme);
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
     * Initialize theme on page load
     */
    function init() {
        // Set initial theme
        const theme = getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                updateToggleButtons(theme);
                setupToggleButtons();
            });
        } else {
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
