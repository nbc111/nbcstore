import { Meta } from '@components/common/Meta.js';
import React from 'react';

export interface OgProps {
  type?: 'website' | 'article' | 'product' | string;

  /**
   * The title of the page to be displayed when shared
   */
  title?: string;

  /**
   * A brief description of the page content
   */
  description?: string;

  /**
   * URL to an image that represents the page
   * Recommended size: 1200x630 pixels for best display across platforms
   */
  image?: string;

  /**
   * The canonical URL of the page
   */
  url?: string;

  /**
   * The name of the website or app
   */
  siteName?: string;

  /**
   * For article type, the published date in ISO format
   */
  publishedTime?: string;

  /**
   * For article type, author names or URLs
   */
  authors?: string[];

  /**
   * Locale code for the content (e.g., 'en_US')
   */
  locale?: string;

  /**
   * Alternative locales available for the page
   */
  alternateLocales?: string[];
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';

  twitterSite?: string;

  /**
   * Twitter @username of the content creator
   */
  twitterCreator?: string;

  twitterImage?: string;

  /**
   * Whether to include Twitter card tags
   */
  includeTwitterTags?: boolean;
}

export function Og({
  type = 'website',
  title,
  description,
  image,
  url,
  siteName,
  publishedTime,
  authors,
  locale,
  alternateLocales,
  twitterCard = 'summary',
  twitterSite,
  twitterCreator,
  twitterImage,
  includeTwitterTags = true
}: OgProps) {
  const nodes: React.ReactNode[] = [<Meta key="og:type" property="og:type" content={type} />];
  if (title) nodes.push(<Meta key="og:title" property="og:title" content={title} />);
  if (description) {
    nodes.push(<Meta key="og:description" property="og:description" content={description} />);
  }
  if (image) nodes.push(<Meta key="og:image" property="og:image" content={image} />);
  if (url) nodes.push(<Meta key="og:url" property="og:url" content={url} />);
  if (siteName) nodes.push(<Meta key="og:site_name" property="og:site_name" content={siteName} />);
  if (type === 'article' && publishedTime) {
    nodes.push(
      <Meta key="article:published_time" property="article:published_time" content={publishedTime} />
    );
  }
  if (type === 'article' && authors?.length) {
    authors.forEach((author, index) => {
      nodes.push(<Meta key={`author-${index}`} property="article:author" content={author} />);
    });
  }
  if (locale) nodes.push(<Meta key="og:locale" property="og:locale" content={locale} />);
  if (alternateLocales?.length) {
    alternateLocales.forEach((alternateLocale, index) => {
      nodes.push(
        <Meta
          key={`locale-${index}`}
          property="og:locale:alternate"
          content={alternateLocale}
        />
      );
    });
  }
  if (includeTwitterTags) {
    nodes.push(<Meta key="twitter:card" name="twitter:card" content={twitterCard} />);
    if (title) nodes.push(<Meta key="twitter:title" name="twitter:title" content={title} />);
    if (description) {
      nodes.push(
        <Meta
          key="twitter:description"
          name="twitter:description"
          content={description}
        />
      );
    }
    if (twitterSite) {
      nodes.push(<Meta key="twitter:site" name="twitter:site" content={twitterSite} />);
    }
    if (twitterCreator) {
      nodes.push(
        <Meta
          key="twitter:creator"
          name="twitter:creator"
          content={twitterCreator}
        />
      );
    }
    if (twitterImage) {
      nodes.push(<Meta key="twitter:image" name="twitter:image" content={twitterImage} />);
    }
  }
  return <>{nodes}</>;
}
