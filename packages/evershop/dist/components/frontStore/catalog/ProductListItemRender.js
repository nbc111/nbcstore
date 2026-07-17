import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { Button } from '@components/common/ui/Button.js';
import { AddToCart } from '@components/frontStore/cart/AddToCart.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Eye, ShoppingCart } from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';
export const ProductListItemRender = ({ product, imageWidth, imageHeight, layout = 'grid', showAddToCart = false, customAddToCartRenderer })=>{
    if (layout === 'list') {
        return /*#__PURE__*/ React.createElement("div", {
            className: "product__list__item__inner web3-glow-border web3-tap group relative overflow-hidden flex gap-4 p-4"
        }, /*#__PURE__*/ React.createElement("div", {
            className: "product__list__image flex-shrink-0"
        }, /*#__PURE__*/ React.createElement("a", {
            href: product.url
        }, product.image && /*#__PURE__*/ React.createElement(Image, {
            src: product.image.url,
            alt: product.image.alt || product.name,
            width: imageWidth || 120,
            height: imageHeight || 120,
            loading: "lazy",
            sizes: "(max-width: 768px) 100vw, 33vw",
            className: "transition-transform duration-300 ease-in-out group-hover:scale-105 rounded-lg"
        }), !product.image && /*#__PURE__*/ React.createElement(ProductNoThumbnail, {
            width: imageWidth,
            height: imageHeight
        }))), /*#__PURE__*/ React.createElement("div", {
            className: "product__list__info flex-1 flex flex-col justify-between"
        }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("h3", {
            className: "product__list__name h5 mb-2"
        }, /*#__PURE__*/ React.createElement("a", {
            href: product.url,
            className: "hover:text-primary transition-colors"
        }, product.name)), /*#__PURE__*/ React.createElement("div", {
            className: "product__list__sku text-sm text-muted-foreground mb-2 web3-mono"
        }, _('SKU ${sku}', {
            sku: product.sku
        })), /*#__PURE__*/ React.createElement("div", {
            className: "product__list__price mb-2"
        }, product.price.special && product.price.regular < product.price.special ? /*#__PURE__*/ React.createElement("div", {
            className: "flex items-center gap-2"
        }, /*#__PURE__*/ React.createElement("span", {
            className: "regular-price text-sm line-through text-muted-foreground"
        }, product.price.regular.text), /*#__PURE__*/ React.createElement("span", {
            className: "special-price text-lg font-bold"
        }, product.price.special.text)) : /*#__PURE__*/ React.createElement("span", {
            className: "regular-price text-lg font-bold"
        }, product.price.regular.text)), /*#__PURE__*/ React.createElement("div", {
            className: "product__list__stock mb-3"
        }, product.inventory.isInStock ? /*#__PURE__*/ React.createElement("span", {
            className: "inline-flex items-center gap-1.5 text-primary text-sm font-medium"
        }, /*#__PURE__*/ React.createElement("span", {
            className: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
        }), _('In Stock')) : /*#__PURE__*/ React.createElement("span", {
            className: "text-destructive text-sm font-medium"
        }, _('Out of Stock')))), showAddToCart && /*#__PURE__*/ React.createElement("div", {
            className: "product__list__actions"
        }, customAddToCartRenderer ? customAddToCartRenderer(product) : /*#__PURE__*/ React.createElement(AddToCart, {
            product: {
                sku: product.sku,
                isInStock: product.inventory.isInStock
            },
            qty: 1,
            onError: (error)=>toast.error(error)
        }, (state, actions)=>/*#__PURE__*/ React.createElement(Button, {
                className: "web3-btn-glow web3-tap",
                disabled: !state.canAddToCart || state.isLoading,
                onClick: (e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    actions.addToCart();
                }
            }, state.isLoading ? _('Adding...') : _('Add to Cart'))))));
    }
    return /*#__PURE__*/ React.createElement("div", {
        className: "product__list__item__inner web3-glow-border web3-tap group overflow-hidden relative"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "product__list__image overflow-hidden flex w-full justify-center aspect-square relative"
    }, /*#__PURE__*/ React.createElement("a", {
        href: product.url,
        className: "block w-full h-full"
    }, product.image && /*#__PURE__*/ React.createElement(Image, {
        src: product.image.url,
        alt: product.image.alt || product.name,
        width: imageWidth || 120,
        height: imageHeight || 120,
        sizes: "(max-width: 768px) 100vw, 33vw",
        className: "transition-transform duration-500 ease-in-out group-hover:scale-110 object-cover w-full h-full"
    }), !product.image && /*#__PURE__*/ React.createElement(ProductNoThumbnail, {
        width: imageWidth,
        height: imageHeight
    })), /*#__PURE__*/ React.createElement("div", {
        className: "product__card__overlay"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "product__card__quick-actions"
    }, /*#__PURE__*/ React.createElement("a", {
        href: product.url,
        className: "flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md border border-border web3-glass web3-tap hover:bg-primary/10 transition-colors"
    }, /*#__PURE__*/ React.createElement(Eye, {
        className: "w-4 h-4"
    }), _('View')), showAddToCart && product.inventory.isInStock && (customAddToCartRenderer ? /*#__PURE__*/ React.createElement("div", {
        className: "flex-1"
    }, customAddToCartRenderer(product)) : /*#__PURE__*/ React.createElement(AddToCart, {
        product: {
            sku: product.sku,
            isInStock: product.inventory.isInStock
        },
        qty: 1,
        onError: (error)=>toast.error(error)
    }, (state, actions)=>/*#__PURE__*/ React.createElement(Button, {
            className: "flex-1 web3-btn-glow web3-tap",
            size: "sm",
            disabled: !state.canAddToCart || state.isLoading,
            onClick: (e)=>{
                e.preventDefault();
                e.stopPropagation();
                actions.addToCart();
            }
        }, /*#__PURE__*/ React.createElement(ShoppingCart, {
            className: "w-4 h-4"
        }), state.isLoading ? '...' : _('Add'))))))), /*#__PURE__*/ React.createElement("div", {
        className: "product__list__info mt-3 px-1"
    }, /*#__PURE__*/ React.createElement("h3", {
        className: "product__list__name h5 font-medium line-clamp-2"
    }, /*#__PURE__*/ React.createElement("a", {
        href: product.url,
        className: "hover:text-primary transition-colors"
    }, product.name)), /*#__PURE__*/ React.createElement("div", {
        className: "product__list__price mt-1.5 flex items-center gap-2"
    }, product.price.special && product.price.regular < product.price.special ? /*#__PURE__*/ React.createElement(React.Fragment, null, /*#__PURE__*/ React.createElement("span", {
        className: "regular-price text-sm line-through text-muted-foreground"
    }, product.price.regular.text), /*#__PURE__*/ React.createElement("span", {
        className: "special-price"
    }, product.price.special.text)) : /*#__PURE__*/ React.createElement("span", {
        className: "regular-price"
    }, product.price.regular.text)), product.inventory.isInStock && /*#__PURE__*/ React.createElement("span", {
        className: "inline-flex items-center gap-1 mt-2 text-xs text-primary/80"
    }, /*#__PURE__*/ React.createElement("span", {
        className: "w-1 h-1 rounded-full bg-primary"
    }), _('Available'))));
};
