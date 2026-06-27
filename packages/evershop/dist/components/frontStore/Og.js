import { Meta } from '@components/common/Meta.js';
import React from 'react';
export function Og({ type = 'website', title, description, image, url, siteName, publishedTime, authors, locale, alternateLocales, twitterCard = 'summary', twitterSite, twitterCreator, twitterImage, includeTwitterTags = true }) {
    const nodes = [
        /*#__PURE__*/ React.createElement(Meta, {
            key: "og:type",
            property: "og:type",
            content: type
        })
    ];
    if (title) nodes.push(/*#__PURE__*/ React.createElement(Meta, {
        key: "og:title",
        property: "og:title",
        content: title
    }));
    if (description) {
        nodes.push(/*#__PURE__*/ React.createElement(Meta, {
            key: "og:description",
            property: "og:description",
            content: description
        }));
    }
    if (image) nodes.push(/*#__PURE__*/ React.createElement(Meta, {
        key: "og:image",
        property: "og:image",
        content: image
    }));
    if (url) nodes.push(/*#__PURE__*/ React.createElement(Meta, {
        key: "og:url",
        property: "og:url",
        content: url
    }));
    if (siteName) nodes.push(/*#__PURE__*/ React.createElement(Meta, {
        key: "og:site_name",
        property: "og:site_name",
        content: siteName
    }));
    if (type === 'article' && publishedTime) {
        nodes.push(/*#__PURE__*/ React.createElement(Meta, {
            key: "article:published_time",
            property: "article:published_time",
            content: publishedTime
        }));
    }
    if (type === 'article' && authors?.length) {
        authors.forEach((author, index)=>{
            nodes.push(/*#__PURE__*/ React.createElement(Meta, {
                key: `author-${index}`,
                property: "article:author",
                content: author
            }));
        });
    }
    if (locale) nodes.push(/*#__PURE__*/ React.createElement(Meta, {
        key: "og:locale",
        property: "og:locale",
        content: locale
    }));
    if (alternateLocales?.length) {
        alternateLocales.forEach((alternateLocale, index)=>{
            nodes.push(/*#__PURE__*/ React.createElement(Meta, {
                key: `locale-${index}`,
                property: "og:locale:alternate",
                content: alternateLocale
            }));
        });
    }
    if (includeTwitterTags) {
        nodes.push(/*#__PURE__*/ React.createElement(Meta, {
            key: "twitter:card",
            name: "twitter:card",
            content: twitterCard
        }));
        if (title) nodes.push(/*#__PURE__*/ React.createElement(Meta, {
            key: "twitter:title",
            name: "twitter:title",
            content: title
        }));
        if (description) {
            nodes.push(/*#__PURE__*/ React.createElement(Meta, {
                key: "twitter:description",
                name: "twitter:description",
                content: description
            }));
        }
        if (twitterSite) {
            nodes.push(/*#__PURE__*/ React.createElement(Meta, {
                key: "twitter:site",
                name: "twitter:site",
                content: twitterSite
            }));
        }
        if (twitterCreator) {
            nodes.push(/*#__PURE__*/ React.createElement(Meta, {
                key: "twitter:creator",
                name: "twitter:creator",
                content: twitterCreator
            }));
        }
        if (twitterImage) {
            nodes.push(/*#__PURE__*/ React.createElement(Meta, {
                key: "twitter:image",
                name: "twitter:image",
                content: twitterImage
            }));
        }
    }
    return /*#__PURE__*/ React.createElement(React.Fragment, null, nodes);
}
