/* NovaSight Documentation Custom JavaScript */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Add copy button feedback
  initCopyFeedback();
  
  // Initialize keyboard shortcut hints
  initKeyboardHints();
  
  // Add smooth scroll for anchor links
  initSmoothScroll();
  
  // Initialize search enhancements
  initSearchEnhancements();
});

/**
 * Add visual feedback when code is copied
 */
function initCopyFeedback() {
  document.querySelectorAll('.md-clipboard').forEach(function(button) {
    button.addEventListener('click', function() {
      var originalText = button.getAttribute('data-clipboard-text');
      button.setAttribute('data-md-tooltip', 'Copied!');
      
      setTimeout(function() {
        button.setAttribute('data-md-tooltip', 'Copy to clipboard');
      }, 2000);
    });
  });
}

/**
 * Show keyboard shortcut hints
 */
function initKeyboardHints() {
  // Add keyboard shortcut for search
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var searchInput = document.querySelector('.md-search__input');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // Escape to close search
    if (e.key === 'Escape') {
      var searchInput = document.querySelector('.md-search__input');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
      }
    }
  });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href').substring(1);
      var target = document.getElementById(targetId);
      
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Update URL without triggering scroll
        history.pushState(null, null, '#' + targetId);
      }
    });
  });
}

/**
 * Search enhancements
 */
function initSearchEnhancements() {
  var searchInput = document.querySelector('.md-search__input');
  
  if (searchInput) {
    // Add placeholder with keyboard hint
    searchInput.setAttribute('placeholder', 'Search (Ctrl+K)');
    
    // Track search queries for analytics (if enabled)
    searchInput.addEventListener('input', debounce(function() {
      if (this.value.length > 2 && typeof gtag !== 'undefined') {
        gtag('event', 'search', {
          'search_term': this.value
        });
      }
    }, 1000));
  }
}

/**
 * Debounce utility function
 */
function debounce(func, wait) {
  var timeout;
  return function() {
    var context = this;
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Track page views and time on page
 */
(function() {
  var startTime = new Date();
  
  window.addEventListener('beforeunload', function() {
    var timeOnPage = Math.round((new Date() - startTime) / 1000);
    
    if (typeof gtag !== 'undefined' && timeOnPage > 5) {
      gtag('event', 'time_on_page', {
        'value': timeOnPage,
        'page_path': window.location.pathname
      });
    }
  });
})();

/**
 * Add "last updated" indicator
 */
function showLastUpdated() {
  var lastUpdatedElement = document.querySelector('.md-source-file__fact--updated');
  if (lastUpdatedElement) {
    var date = new Date(lastUpdatedElement.textContent.trim());
    var now = new Date();
    var diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      lastUpdatedElement.classList.add('recently-updated');
    }
  }
}

// Initialize last updated indicator
document.addEventListener('DOMContentLoaded', showLastUpdated);
