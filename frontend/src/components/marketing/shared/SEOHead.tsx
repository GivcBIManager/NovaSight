/**
 * SEOHead Component
 * 
 * Manages document head meta tags for SEO optimization.
 * Sets title, description, Open Graph, Twitter cards, and structured data.
 */

import { useEffect } from 'react';

export interface SEOHeadProps {
  /** Page title */
  title: string;
  /** Meta description */
  description: string;
  /** SEO keywords */
  keywords?: string[];
  /** Canonical URL */
  canonical?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Open Graph content type */
  ogType?: 'website' | 'article' | 'product';
  /** Twitter card type */
  twitterCard?: 'summary' | 'summary_large_image';
  /** JSON-LD structured data */
  structuredData?: object;
  /** Prevent indexing */
  noindex?: boolean;
}

const SITE_NAME = 'NovaSight';
const DEFAULT_OG_IMAGE = '/og/default.png';
const BASE_URL = 'https://novasight.io';

/**
 * Helper to set or update a meta tag
 */
function setMetaTag(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', content);
}

/**
 * Helper to set or update a link tag
 */
function setLinkTag(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', href);
}

/**
 * Helper to set or update structured data script
 */
function setStructuredData(data: object) {
  const id = 'structured-data';
  let script = document.getElementById(id) as HTMLScriptElement | null;
  
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(data);
}

export function SEOHead({
  title,
  description,
  keywords = [],
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  structuredData,
  noindex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Basic meta tags
    setMetaTag('description', description);
    
    if (keywords.length > 0) {
      setMetaTag('keywords', keywords.join(', '));
    }

    // Robots meta tag
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Open Graph meta tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:site_name', SITE_NAME, true);
    
    if (canonical) {
      setMetaTag('og:url', canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`, true);
    }

    // Twitter Card meta tags
    setMetaTag('twitter:card', twitterCard);
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`);

    // Canonical link
    if (canonical) {
      setLinkTag('canonical', canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`);
    }

    // Structured data (JSON-LD)
    if (structuredData) {
      setStructuredData(structuredData);
    }

    // Cleanup function
    return () => {
      // We don't remove meta tags on unmount as they should persist
      // or be overwritten by the next page's SEOHead
    };
  }, [title, description, keywords, canonical, ogImage, ogType, twitterCard, structuredData, noindex]);

  // This component doesn't render anything
  return null;
}

export default SEOHead;
