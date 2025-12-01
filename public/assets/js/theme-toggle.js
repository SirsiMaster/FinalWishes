/**
 * Legacy Theme Toggle - Simplified & Bulletproof
 */
(function() {
    'use strict';
    
    var STORAGE_KEY = 'legacy-theme';
    
    var themes = {
        dark: {
            bodyBg: '#0f172a',
            bodyBgImage: 'radial-gradient(circle at 50% 0%, #2563eb 0%, #1e3a8a 40%, #0f172a 80%)',
            bodyColor: '#FFFFFF',
            navBg: 'rgba(0, 0, 0, 0.2)',
            navLink: 'rgba(255, 255, 255, 0.7)',
            logo: '#FFFFFF'
        },
        light: {
            bodyBg: '#FFFFFF',
            bodyBgImage: 'none',
            bodyColor: '#0f172a',
            navBg: 'rgba(255, 255, 255, 0.95)',
            navLink: '#4B5563',
            logo: '#0f172a'
        }
    };
    
    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    }
    
    function applyTheme(theme) {
        var t = themes[theme];
        if (!t) { console.error('Invalid theme:', theme); return; }
        
        console.log('Applying theme:', theme);
        
        // Set data attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Apply to body
        if (document.body) {
            document.body.style.backgroundColor = t.bodyBg;
            document.body.style.backgroundImage = t.bodyBgImage;
            document.body.style.color = t.bodyColor;
            console.log('Body styles applied');
        }
        
        // Apply to nav
        var nav = document.getElementById('main-nav');
        if (nav) {
            nav.style.background = t.navBg;
        }
        
        // Apply to nav links
        var links = document.querySelectorAll('.nav-link');
        for (var i = 0; i < links.length; i++) {
            links[i].style.color = t.navLink;
        }
        
        // Apply to logo
        var logos = document.querySelectorAll('.logo-text');
        for (var j = 0; j < logos.length; j++) {
            logos[j].style.color = t.logo;
        }
        
        // Update toggle icons
        var toggles = document.querySelectorAll('.theme-toggle');
        for (var k = 0; k < toggles.length; k++) {
            var sun = toggles[k].querySelector('.icon-sun');
            var moon = toggles[k].querySelector('.icon-moon');
            if (sun) sun.style.display = (theme === 'dark') ? 'block' : 'none';
            if (moon) moon.style.display = (theme === 'light') ? 'block' : 'none';
        }
        
        // ALWAYS keep photo sections with white text (they have dark image backgrounds)
        var photoSections = document.querySelectorAll('.photo-section');
        for (var p = 0; p < photoSections.length; p++) {
            var section = photoSections[p];
            section.style.color = '#FFFFFF';
            
            // Force white on all text elements inside
            var textEls = section.querySelectorAll('h1, h2, h3, p, span');
            for (var q = 0; q < textEls.length; q++) {
                var el = textEls[q];
                // Skip gold accent text
                if (el.classList.contains('hero-text-gold') || 
                    el.className.indexOf('color-gold') > -1) {
                    continue;
                }
                el.style.color = '#FFFFFF';
            }
            
            // Force white on outline buttons in photo sections
            var outlineBtns = section.querySelectorAll('.btn-outline');
            for (var r = 0; r < outlineBtns.length; r++) {
                outlineBtns[r].style.color = '#FFFFFF';
                outlineBtns[r].style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }
        }
        
        // Save
        localStorage.setItem(STORAGE_KEY, theme);
        console.log('Theme applied successfully:', theme);
    }
    
    function toggleTheme() {
        var current = getTheme();
        var next = (current === 'dark') ? 'light' : 'dark';
        applyTheme(next);
        return next;
    }
    
    // Initialize on DOM ready
    function init() {
        var theme = getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                applyTheme(theme);
            });
        } else {
            applyTheme(theme);
        }
    }
    
    init();
    
    // Expose globally
    window.toggleTheme = toggleTheme;
    window.LegacyTheme = { toggle: toggleTheme, apply: applyTheme, get: getTheme };
})();
