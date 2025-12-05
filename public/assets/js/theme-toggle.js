/**
 * MyShepherd Theme Toggle - Fixed for photo sections
 */
(function() {
    'use strict';
    
    var STORAGE_KEY = 'myshepherd-theme';
    
    var themes = {
        dark: {
            bodyBg: '#0f172a',
            bodyBgImage: 'radial-gradient(circle at 50% 0%, #2563eb 0%, #1e3a8a 40%, #0f172a 80%)',
            navBg: 'rgba(0, 0, 0, 0.2)',
            navLink: 'rgba(255, 255, 255, 0.7)',
            logo: '#FFFFFF'
        },
        light: {
            bodyBg: '#FFFFFF',
            bodyBgImage: 'none',
            navBg: 'rgba(255, 255, 255, 0.95)',
            navLink: '#4B5563',
            logo: '#0f172a'
        }
    };
    
    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    }
    
    function isInPhotoSection(el) {
        while (el) {
            if (el.classList && el.classList.contains('photo-section')) {
                return true;
            }
            el = el.parentElement;
        }
        return false;
    }
    
    function applyTheme(theme) {
        var t = themes[theme];
        if (!t) { console.error('Invalid theme:', theme); return; }
        
        console.log('Applying theme:', theme);
        
        // Set data attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Apply to body - background only, NOT color (let CSS handle text)
        if (document.body) {
            document.body.style.backgroundColor = t.bodyBg;
            document.body.style.backgroundImage = t.bodyBgImage;
            // DO NOT set body color - it cascades incorrectly to photo sections
        }
        
        // Apply to nav
        var nav = document.getElementById('main-nav');
        if (nav) {
            nav.style.background = t.navBg;
        }
        
        // Apply to nav links (not in photo sections)
        var links = document.querySelectorAll('.nav-link');
        for (var i = 0; i < links.length; i++) {
            links[i].style.color = t.navLink;
        }
        
        // Apply to logo
        var logos = document.querySelectorAll('.logo-text');
        for (var j = 0; j < logos.length; j++) {
            logos[j].style.color = t.logo;
        }
        
        // Apply text color ONLY to non-photo-section content
        var sections = document.querySelectorAll('section:not(.photo-section), #problem, #protocol, #security, #stories, #pricing, footer');
        for (var s = 0; s < sections.length; s++) {
            var sec = sections[s];
            // Skip if this is or is inside a photo section
            if (sec.classList.contains('photo-section') || isInPhotoSection(sec)) continue;
            
            // Apply theme color to text elements
            var textColor = (theme === 'light') ? '#0f172a' : '#FFFFFF';
            var textEls = sec.querySelectorAll('h1, h2, h3, h4, p');
            for (var te = 0; te < textEls.length; te++) {
                // Skip elements with explicit color classes
                if (textEls[te].className.indexOf('text-white') > -1 ||
                    textEls[te].className.indexOf('color-gold') > -1 ||
                    textEls[te].className.indexOf('color-emerald') > -1) {
                    continue;
                }
                textEls[te].style.color = textColor;
            }
        }
        
        // Update toggle icons
        var toggles = document.querySelectorAll('.theme-toggle');
        for (var k = 0; k < toggles.length; k++) {
            var sun = toggles[k].querySelector('.icon-sun');
            var moon = toggles[k].querySelector('.icon-moon');
            if (sun) sun.style.display = (theme === 'dark') ? 'block' : 'none';
            if (moon) moon.style.display = (theme === 'light') ? 'block' : 'none';
        }
        
        // Save
        localStorage.setItem(STORAGE_KEY, theme);
        console.log('Theme applied:', theme);
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
    window.MyShepherdTheme = { toggle: toggleTheme, apply: applyTheme, get: getTheme };
})();
