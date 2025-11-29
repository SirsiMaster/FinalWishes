/**
 * Universal Header Component
 * Legacy Estate OS - Reusable page header
 * 
 * Usage:
 *   <header id="universal-header-root" 
 *           data-title="Page Title" 
 *           data-subtitle="Page description"
 *           data-search-placeholder="Search..."></header>
 *   <script src="/components/universal-header.js"></script>
 * 
 * @version 2.0.0
 */

(function() {
    'use strict';
    
    /**
     * Render the header
     */
    function renderHeader() {
        const root = document.getElementById('universal-header-root');
        if (!root) return;
        
        // Get configuration from data attributes
        const title = root.dataset.title || 'Dashboard';
        const subtitle = root.dataset.subtitle || '';
        const searchPlaceholder = root.dataset.searchPlaceholder || 'Search...';
        const showSearch = root.dataset.showSearch !== 'false';
        const showNotifications = root.dataset.showNotifications !== 'false';
        
        root.className = 'admin-header';
        root.innerHTML = `
            <div class="header-left">
                <h1>${title}</h1>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
            <div class="header-right">
                ${showSearch ? `
                    <div class="search-bar" role="search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" 
                               id="header-search" 
                               placeholder="${searchPlaceholder}"
                               aria-label="${searchPlaceholder}">
                    </div>
                ` : ''}
                
                ${showNotifications ? `
                    <button class="header-btn" id="notifications-btn" aria-label="View notifications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span class="notification-badge" id="notification-count" style="display: none;">0</span>
                    </button>
                ` : ''}
                
                <div class="user-menu" id="user-menu">
                    <div class="user-avatar" id="user-avatar-btn" tabindex="0" role="button" aria-haspopup="true">
                        AD
                    </div>
                <div class="user-dropdown" id="user-dropdown" role="menu" style="display: none;">
                        <a href="/account/" class="dropdown-item" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Account Settings
                        </a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item text-danger" id="logout-btn" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        addHeaderStyles();
        
        // Setup interactions
        setupSearch();
        setupUserMenu();
        setupNotifications();
    }
    
    /**
     * Add header-specific styles
     */
    function addHeaderStyles() {
        if (document.getElementById('header-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'header-styles';
        style.textContent = `
            .header-btn {
                position: relative;
                width: 40px;
                height: 40px;
                border-radius: var(--radius);
                background: var(--color-gray-100);
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all var(--transition-fast);
            }
            
            .header-btn:hover {
                background: var(--color-gray-200);
                color: var(--text-primary);
            }
            
            .notification-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 18px;
                height: 18px;
                padding: 0 4px;
                background: var(--color-danger);
                color: white;
                font-size: 10px;
                font-weight: 700;
                border-radius: var(--radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .user-menu {
                position: relative;
            }
            
            .user-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 200px;
                background: var(--color-white);
                border: 1px solid var(--color-gray-200);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                z-index: var(--z-dropdown);
                overflow: hidden;
            }
            
            .dropdown-item {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                padding: var(--space-sm) var(--space-md);
                color: var(--text-primary);
                text-decoration: none;
                font-size: 14px;
                transition: background var(--transition-fast);
                border: none;
                background: none;
                width: 100%;
                text-align: left;
                cursor: pointer;
            }
            
            .dropdown-item:hover {
                background: var(--color-gray-50);
            }
            
            .dropdown-item.text-danger {
                color: var(--color-danger);
            }
            
            .dropdown-divider {
                height: 1px;
                background: var(--color-gray-200);
                margin: var(--space-xs) 0;
            }
            
            /* Search focus state */
            .search-bar:focus-within {
                box-shadow: 0 0 0 2px var(--color-gold);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Setup search functionality
     */
    function setupSearch() {
        const searchInput = document.getElementById('header-search');
        if (!searchInput) return;
        
        let debounceTimer;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    // Dispatch custom search event
                    window.dispatchEvent(new CustomEvent('header-search', {
                        detail: { query }
                    }));
                }
            }, 300);
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K to focus search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
            
            // Escape to blur search
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.blur();
            }
        });
    }
    
    /**
     * Setup user menu dropdown
     */
    function setupUserMenu() {
        const avatarBtn = document.getElementById('user-avatar-btn');
        const dropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (!avatarBtn || !dropdown) return;
        
        // Toggle dropdown
        avatarBtn.addEventListener('click', () => {
            const isOpen = dropdown.style.display !== 'none';
            dropdown.style.display = isOpen ? 'none' : 'block';
            avatarBtn.setAttribute('aria-expanded', !isOpen);
        });
        
        // Keyboard support
        avatarBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                avatarBtn.click();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!avatarBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                avatarBtn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Logout handler
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    if (window.Firebase?.AuthService) {
                        await window.Firebase.AuthService.signOut();
                    }
                    window.location.href = '/auth/login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                }
            });
        }
        
        // Update user info when Firebase is ready
        window.addEventListener('firebase-ready', updateUserInfo);
        if (window.Firebase?.auth?.currentUser) {
            updateUserInfo();
        }
    }
    
    /**
     * Update user info in header
     */
    async function updateUserInfo() {
        const avatarBtn = document.getElementById('user-avatar-btn');
        if (!avatarBtn) return;
        
        const user = window.Firebase?.auth?.currentUser;
        if (user) {
            // Get initials from display name or email
            const name = user.displayName || user.email || 'User';
            const initials = name.split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            
            avatarBtn.textContent = initials;
            avatarBtn.title = name;
        }
    }
    
    /**
     * Setup notifications
     */
    function setupNotifications() {
        const notifBtn = document.getElementById('notifications-btn');
        const notifCount = document.getElementById('notification-count');
        
        if (!notifBtn || !notifCount) return;
        
        // Update notification count
        function updateCount(count) {
            if (count > 0) {
                notifCount.textContent = count > 99 ? '99+' : count;
                notifCount.style.display = 'flex';
            } else {
                notifCount.style.display = 'none';
            }
        }
        
        // Click handler
        notifBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('open-notifications'));
        });
        
        // Listen for notification updates
        window.addEventListener('notification-count-update', (e) => {
            updateCount(e.detail.count);
        });
        
        // Expose update function
        window.LegacyHeader = window.LegacyHeader || {};
        window.LegacyHeader.updateNotificationCount = updateCount;
    }
    
    /**
     * Update header title dynamically
     */
    function setTitle(title, subtitle = null) {
        const h1 = document.querySelector('.admin-header h1');
        const p = document.querySelector('.admin-header .header-left p');
        
        if (h1) h1.textContent = title;
        if (p && subtitle !== null) p.textContent = subtitle;
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderHeader);
    } else {
        renderHeader();
    }
    
    // Expose API
    window.LegacyHeader = window.LegacyHeader || {};
    window.LegacyHeader.render = renderHeader;
    window.LegacyHeader.setTitle = setTitle;
})();
