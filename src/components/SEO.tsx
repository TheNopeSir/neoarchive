
import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'profile';
}

const SEO: React.FC<SEOProps> = ({ 
  title = "NeoArchive: Ваша цифровая полка", 
  description = "Удобный сервис для создания виртуальных коллекций: гаджеты, игры, книги, винил и любые предметы вашего хобби.", 
  image = "https://ui-avatars.com/api/?name=NA&background=4ade80&color=000&size=1200&font-size=0.5&bold=true", 
  path = "", 
  type = "website"
}) => {
  const siteUrl = "https://neoarchive.ru";
  const url = `${siteUrl}${path.startsWith('/') ? path : '/' + path}`;
  // Clean description for meta tags (remove newlines, limit length)
  const metaDescription = description.replace(/\s+/g, ' ').trim().substring(0, 160) + (description.length > 160 ? '...' : '');

  useEffect(() => {
    // Update Title
    document.title = title;

    // Helper to update or create meta tags
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
        let element = document.querySelector(`meta[${attr}="${name}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attr, name);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    // Helper to set Link tags
    const setLink = (rel: string, href: string) => {
        let element = document.querySelector(`link[rel="${rel}"]`);
        if (!element) {
            element = document.createElement('link');
            element.setAttribute('rel', rel);
            document.head.appendChild(element);
        }
        element.setAttribute('href', href);
    }

    setMeta('description', metaDescription);
    setLink('canonical', url);

    // Open Graph
    setMeta('og:type', type, 'property');
    setMeta('og:url', url, 'property');
    setMeta('og:title', title, 'property');
    setMeta('og:description', metaDescription, 'property');
    setMeta('og:image', image, 'property');

    // Twitter
    setMeta('twitter:url', url);
    setMeta('twitter:title', title);
    setMeta('twitter:description', metaDescription);
    setMeta('twitter:image', image);

  }, [title, metaDescription, image, url, type]);

  return null;
};

export default SEO;
    