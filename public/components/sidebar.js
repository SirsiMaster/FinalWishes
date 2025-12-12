/**
 * Sidebar Component
 * FinalWishes - Reusable navigation sidebar
 * 
 * Usage:
 *   <div id="sidebar-root" data-active="dashboard"></div>
 *   <script src="/components/sidebar.js"></script>
 * 
 * @version 2.0.0
 */

(function() {
    'use strict';
    
    // Navigation configuration
    const navConfig = {
        main: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                href: '/admin/dashboard.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>`
            },
            {
                id: 'estates',
                label: 'Estates',
                href: '/admin/estates.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>`
            }
        ],
        management: [
            {
                id: 'users',
                label: 'Users',
                href: '/admin/users.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>`
            },
            {
                id: 'documents',
                label: 'Document Vault',
                href: '/admin/documents.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>`
            },
            {
                id: 'notifications',
                label: 'Notifications',
                href: '/admin/notifications.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
                </svg>`
            }
        ],
        development: [
            {
                id: 'dev-dashboard',
                label: 'Dev Dashboard',
                href: '/admin/development/dashboard.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>`
            },
            {
                id: 'dev-analytics',
                label: 'Analytics',
                href: '/admin/development/analytics.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="20" x2="12" y2="10"></line>
                    <line x1="18" y1="20" x2="18" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>`
            },
            {
                id: 'dev-costs',
                label: 'Cost Tracking',
                href: '/admin/development/costs.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>`
            },
            {
                id: 'dev-reports',
                label: 'Reports',
                href: '/admin/development/reports.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>`
            }
        ],
        system: [
            {
                id: 'settings',
                label: 'Settings',
                href: '/admin/settings.html',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>`
            }
        ]
    };
    
    /**
     * Render the sidebar
     */
    function renderSidebar(activeItem = 'dashboard') {
        const root = document.getElementById('sidebar-root');
        if (!root) return;
        
        // Get active item from data attribute if available
        activeItem = root.dataset.active || activeItem;
        
        // Determine base path (no longer needed - public is root)
        const path = window.location.pathname;
        let basePath = '';
        
        // Generate nav items HTML
        const renderNavItem = (item) => {
            const isActive = item.id === activeItem;
            const href = basePath + item.href;
            return `
                <a href="${href}" class="nav-item ${isActive ? 'active' : ''}" data-nav-id="${item.id}">
                    <span class="nav-icon">${item.icon}</span>
                    <span class="nav-label">${item.label}</span>
                    ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
                </a>
            `;
        };
        
        const renderSection = (title, items) => `
            <div class="nav-section">
                <div class="nav-section-title">${title}</div>
                ${items.map(renderNavItem).join('')}
            </div>
        `;
        
        root.innerHTML = `
            <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
                <div class="sidebar-header">
                    <a href="${basePath}/admin/dashboard.html" class="sidebar-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        <span class="sidebar-logo-text">LEGACY</span>
                    </a>
                </div>
                
                <nav class="sidebar-nav">
                    ${renderSection('Main', navConfig.main)}
                    ${renderSection('Management', navConfig.management)}
                    ${renderSection('Development', navConfig.development)}
                    ${renderSection('System', navConfig.system)}
                </nav>
                
                <div class="sidebar-footer">
                    <div class="sidebar-user" id="sidebar-user">
                        <div class="user-avatar">AD</div>
                        <div class="user-info">
                            <div class="user-name">Admin</div>
                            <div class="user-role">System Admin</div>
                        </div>
                    </div>
                </div>
            </aside>
        `;
        
        // Add footer styles
        addFooterStyles();
        
        // Setup keyboard navigation
        setupKeyboardNav();
        
        // Setup mobile toggle
        setupMobileToggle();
    }
    
    /**
     * Add sidebar footer styles
     */
    function addFooterStyles() {
        if (document.getElementById('sidebar-footer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'sidebar-footer-styles';
        style.textContent = `
            .sidebar-footer {
                padding: var(--space-md) var(--space-lg);
                border-top: 1px solid var(--glass-border);
                margin-top: auto;
            }
            
            .sidebar-user {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }
            
            .sidebar-user .user-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--color-blue-navy);
                font-weight: 700;
                font-size: 12px;
            }
            
            .sidebar-user .user-info {
                flex: 1;
                min-width: 0;
            }
            
            .sidebar-user .user-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--color-white);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .sidebar-user .user-role {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }
            
            .nav-label {
                flex: 1;
            }
            
            /* Mobile menu toggle */
            .mobile-menu-toggle {
                display: none;
                position: fixed;
                top: var(--space-md);
                left: var(--space-md);
                z-index: 400;
                width: 40px;
                height: 40px;
                border-radius: var(--radius);
                background: var(--color-blue-navy);
                border: none;
                color: var(--color-white);
                cursor: pointer;
            }
            
            @media (max-width: 768px) {
                .mobile-menu-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Setup keyboard navigation
     */
    function setupKeyboardNav() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        const navItems = sidebar.querySelectorAll('.nav-item');
        
        navItems.forEach((item, index) => {
            item.setAttribute('tabindex', '0');
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = navItems[index + 1] || navItems[0];
                    next.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = navItems[index - 1] || navItems[navItems.length - 1];
                    prev.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }
    
    /**
     * Setup mobile toggle
     */
    function setupMobileToggle() {
        // Create mobile toggle button
        let toggle = document.getElementById('mobile-menu-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.id = 'mobile-menu-toggle';
            toggle.className = 'mobile-menu-toggle';
            toggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            `;
            toggle.setAttribute('aria-label', 'Toggle navigation menu');
            document.body.appendChild(toggle);
        }
        
        const sidebar = document.getElementById('sidebar');
        
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const isOpen = sidebar.classList.contains('open');
            toggle.setAttribute('aria-expanded', isOpen);
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
    
    /**
     * Update active nav item
     */
    function setActiveItem(itemId) {
        const items = document.querySelectorAll('.nav-item');
        items.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.navId === itemId) {
                item.classList.add('active');
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => renderSidebar());
    } else {
        renderSidebar();
    }
    
    // Expose API
    window.FinalWishesSidebar = {
        render: renderSidebar,
        setActive: setActiveItem
    };
})();
