import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { Button } from '@components/common/ui/Button.js';
import { AddToCart } from '@components/frontStore/cart/AddToCart.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Eye, ShoppingCart } from 'lucide-react';
import React, { ReactNode } from 'react';
import { toast } from 'react-toastify';

export const ProductListItemRender = ({
  product,
  imageWidth,
  imageHeight,
  layout = 'grid',
  showAddToCart = false,
  customAddToCartRenderer
}: {
  product: ProductData;
  imageWidth?: number;
  imageHeight?: number;
  layout?: 'grid' | 'list';
  showAddToCart?: boolean;
  customAddToCartRenderer?: (product: ProductData) => ReactNode;
}) => {
  if (layout === 'list') {
    return (
      <div className="product__list__item__inner web3-glow-border web3-tap group relative overflow-hidden flex gap-4 p-4">
        <div className="product__list__image flex-shrink-0">
          <a href={product.url}>
            {product.image && (
              <Image
                src={product.image.url}
                alt={product.image.alt || product.name}
                width={imageWidth || 120}
                height={imageHeight || 120}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="transition-transform duration-300 ease-in-out group-hover:scale-105 rounded-lg"
              />
            )}
            {!product.image && (
              <ProductNoThumbnail width={imageWidth} height={imageHeight} />
            )}
          </a>
        </div>

        <div className="product__list__info flex-1 flex flex-col justify-between">
          <div>
            <h3 className="product__list__name h5 mb-2">
              <a
                href={product.url}
                className="hover:text-primary transition-colors"
              >
                {product.name}
              </a>
            </h3>

            <div className="product__list__sku text-sm text-muted-foreground mb-2 web3-mono">
              {_('SKU ${sku}', { sku: product.sku })}
            </div>

            <div className="product__list__price mb-2">
              {product.price.special &&
              product.price.regular < product.price.special ? (
                <div className="flex items-center gap-2">
                  <span className="regular-price text-sm line-through text-muted-foreground">
                    {product.price.regular.text}
                  </span>
                  <span className="special-price text-lg font-bold">
                    {product.price.special.text}
                  </span>
                </div>
              ) : (
                <span className="regular-price text-lg font-bold">
                  {product.price.regular.text}
                </span>
              )}
            </div>

            <div className="product__list__stock mb-3">
              {product.inventory.isInStock ? (
                <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {_('In Stock')}
                </span>
              ) : (
                <span className="text-destructive text-sm font-medium">
                  {_('Out of Stock')}
                </span>
              )}
            </div>
          </div>

          {showAddToCart && (
            <div className="product__list__actions">
              {customAddToCartRenderer ? (
                customAddToCartRenderer(product)
              ) : (
                <AddToCart
                  product={{
                    sku: product.sku,
                    isInStock: product.inventory.isInStock
                  }}
                  qty={1}
                  onError={(error) => toast.error(error)}
                >
                  {(state, actions) => (
                    <Button
                      className="web3-btn-glow web3-tap"
                      disabled={!state.canAddToCart || state.isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        actions.addToCart();
                      }}
                    >
                      {state.isLoading ? _('Adding...') : _('Add to Cart')}
                    </Button>
                  )}
                </AddToCart>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="product__list__item__inner web3-glow-border web3-tap group overflow-hidden relative">
      <div className="product__list__image overflow-hidden flex w-full justify-center aspect-square relative">
        <a href={product.url} className="block w-full h-full">
          {product.image && (
            <Image
              src={product.image.url}
              alt={product.image.alt || product.name}
              width={imageWidth || 120}
              height={imageHeight || 120}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="transition-transform duration-500 ease-in-out group-hover:scale-110 object-cover w-full h-full"
            />
          )}
          {!product.image && (
            <ProductNoThumbnail width={imageWidth} height={imageHeight} />
          )}
        </a>
        <div className="product__card__overlay">
          <div className="product__card__quick-actions">
            <a
              href={product.url}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md border border-border web3-glass web3-tap hover:bg-primary/10 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {_('View')}
            </a>
            {showAddToCart && product.inventory.isInStock && (
              customAddToCartRenderer ? (
                <div className="flex-1">{customAddToCartRenderer(product)}</div>
              ) : (
                <AddToCart
                  product={{
                    sku: product.sku,
                    isInStock: product.inventory.isInStock
                  }}
                  qty={1}
                  onError={(error) => toast.error(error)}
                >
                  {(state, actions) => (
                    <Button
                      className="flex-1 web3-btn-glow web3-tap"
                      size="sm"
                      disabled={!state.canAddToCart || state.isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        actions.addToCart();
                      }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {state.isLoading ? '...' : _('Add')}
                    </Button>
                  )}
                </AddToCart>
              )
            )}
          </div>
        </div>
      </div>
      <div className="product__list__info mt-3 px-1">
        <h3 className="product__list__name h5 font-medium line-clamp-2">
          <a href={product.url} className="hover:text-primary transition-colors">
            {product.name}
          </a>
        </h3>
        <div className="product__list__price mt-1.5 flex items-center gap-2">
          {product.price.special &&
          product.price.regular < product.price.special ? (
            <>
              <span className="regular-price text-sm line-through text-muted-foreground">
                {product.price.regular.text}
              </span>
              <span className="special-price">{product.price.special.text}</span>
            </>
          ) : (
            <span className="regular-price">{product.price.regular.text}</span>
          )}
        </div>
        {product.inventory.isInStock && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary/80">
            <span className="w-1 h-1 rounded-full bg-primary" />
            {_('Available')}
          </span>
        )}
      </div>
    </div>
  );
};
