import { Og } from '@components/frontStore/Og.js';
import React from 'react';
export default function HeadTags({ pageInfo: { title, description, keywords, canonicalUrl, ogInfo, favicon }, themeConfig: { headTags: { metas, links, scripts, base } } }) {
    React.useEffect(()=>{
        const head = document.querySelector('head');
        scripts.forEach((script)=>{
            const scriptElement = document.createElement('script');
            Object.keys(script).forEach((key)=>{
                if (script[key]) {
                    scriptElement[key] = script[key];
                }
            });
            head?.appendChild(scriptElement);
        });
    }, []);
    const nodes = [
        /*#__PURE__*/ React.createElement("title", {
            key: "title"
        }, title),
        /*#__PURE__*/ React.createElement("meta", {
            key: "description",
            name: "description",
            content: description
        }),
        /*#__PURE__*/ React.createElement("meta", {
            key: "viewport",
            name: "viewport",
            content: "width=device-width, initial-scale=1.0"
        })
    ];
    metas.forEach((meta, index)=>{
        nodes.push(/*#__PURE__*/ React.createElement("meta", {
            key: `meta-${index}`,
            ...meta
        }));
    });
    links.forEach((link, index)=>{
        nodes.push(/*#__PURE__*/ React.createElement("link", {
            key: `link-${index}`,
            ...link
        }));
    });
    scripts.forEach((script, index)=>{
        nodes.push(/*#__PURE__*/ React.createElement("script", {
            key: `script-${index}`,
            ...script
        }));
    });
    if (favicon) nodes.push(/*#__PURE__*/ React.createElement("link", {
        key: "favicon",
        rel: "icon",
        href: favicon
    }));
    if (keywords?.length) {
        nodes.push(/*#__PURE__*/ React.createElement("meta", {
            key: "keywords",
            name: "keywords",
            content: keywords.join(', ')
        }));
    }
    if (canonicalUrl) {
        nodes.push(/*#__PURE__*/ React.createElement("link", {
            key: "canonical",
            rel: "canonical",
            href: canonicalUrl
        }));
    }
    if (base) nodes.push(/*#__PURE__*/ React.createElement("base", {
        key: "base",
        ...base
    }));
    nodes.push(/*#__PURE__*/ React.createElement(Og, {
        key: "og",
        type: ogInfo.type,
        title: title,
        description: description,
        url: ogInfo.url,
        siteName: ogInfo.siteName,
        image: ogInfo.image,
        locale: ogInfo.locale,
        twitterCard: ogInfo.twitterCard,
        twitterSite: ogInfo.twitterSite,
        twitterCreator: ogInfo.twitterCreator,
        twitterImage: ogInfo.twitterImage
    }));
    return /*#__PURE__*/ React.createElement(React.Fragment, null, nodes);
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
