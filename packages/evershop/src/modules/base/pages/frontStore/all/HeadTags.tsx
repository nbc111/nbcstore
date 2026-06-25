import { Og } from '@components/frontStore/Og.js';
import React, {
  LinkHTMLAttributes,
  MetaHTMLAttributes,
  ScriptHTMLAttributes
} from 'react';

interface HeadTagsProps {
  pageInfo: {
    title: string;
    description: string;
    keywords: string[];
    canonicalUrl: string;
    favicon: string;
    ogInfo: {
      locale: string;
      title: string;
      description: string;
      image: string;
      url: string;
      type: 'website' | 'article' | 'product' | string;
      siteName: string;
      twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
      twitterSite: string;
      twitterCreator: string;
      twitterImage: string;
    };
  };
  themeConfig: {
    headTags: {
      metas: Array<MetaHTMLAttributes<HTMLMetaElement>>;
      links: Array<LinkHTMLAttributes<HTMLLinkElement>>;
      scripts: Array<ScriptHTMLAttributes<HTMLScriptElement>>;
      base?: {
        href: string;
        target: '_blank' | '_self' | '_parent' | '_top';
      };
    };
  };
}
export default function HeadTags({
  pageInfo: { title, description, keywords, canonicalUrl, ogInfo, favicon },
  themeConfig: {
    headTags: { metas, links, scripts, base }
  }
}: HeadTagsProps) {
  React.useEffect(() => {
    const head = document.querySelector('head');
    scripts.forEach((script) => {
      const scriptElement = document.createElement('script');
      Object.keys(script).forEach((key) => {
        if (script[key]) {
          scriptElement[key] = script[key];
        }
      });
      head?.appendChild(scriptElement);
    });
  }, []);

  const nodes: React.ReactNode[] = [
    <title key="title">{title}</title>,
    <meta key="description" name="description" content={description} />,
    <meta
      key="viewport"
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
  ];
  metas.forEach((meta, index) => {
    nodes.push(<meta key={`meta-${index}`} {...meta} />);
  });
  links.forEach((link, index) => {
    nodes.push(<link key={`link-${index}`} {...link} />);
  });
  scripts.forEach((script, index) => {
    nodes.push(<script key={`script-${index}`} {...script} />);
  });
  if (favicon) nodes.push(<link key="favicon" rel="icon" href={favicon} />);
  if (keywords?.length) {
    nodes.push(<meta key="keywords" name="keywords" content={keywords.join(', ')} />);
  }
  if (canonicalUrl) {
    nodes.push(<link key="canonical" rel="canonical" href={canonicalUrl} />);
  }
  if (base) nodes.push(<base key="base" {...base} />);
  nodes.push(
    <Og
      key="og"
      type={ogInfo.type}
      title={title}
      description={description}
      url={ogInfo.url}
      siteName={ogInfo.siteName}
      image={ogInfo.image}
      locale={ogInfo.locale}
      twitterCard={ogInfo.twitterCard}
      twitterSite={ogInfo.twitterSite}
      twitterCreator={ogInfo.twitterCreator}
      twitterImage={ogInfo.twitterImage}
    />
  );
  return <>{nodes}</>;
}

export const layout = {
  areaId: 'head',
  sortOrder: 5
};

export const query = `
  query query {
    pageInfo {
      title
      description
      keywords
      canonicalUrl
      favicon
      ogInfo {
        locale
        title
        description
        image
        url
        type
        siteName
        twitterCard
        twitterSite
        twitterCreator
        twitterImage
      }
    }
    themeConfig {
      headTags {
        metas {
          name
          content
          charSet
          httpEquiv
          property
          itemProp
          itemType
          itemID
          lang
        }
        links {
          rel
          href
          sizes
          type
          hrefLang
          media
          title
          as
          crossOrigin
          integrity
          referrerPolicy
        }
        scripts {
          src
          type
          async
          defer
          crossOrigin
          integrity
          noModule
          nonce
        }
        base {
          href
          target
        }
      }
    }
  }
`;
