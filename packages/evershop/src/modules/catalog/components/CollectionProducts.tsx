import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';

interface CollectionProductsProps {
  collection: {
    collectionId: number;
    name: string;
    description?: Row[];
    products: {
      items: Array<React.ComponentProps<typeof ProductList>['products'][0]>;
    };
  } | null;
  collectionProductsWidget?: {
    countPerRow?: number;
  };
}
export default function CollectionProducts({
  collection,
  collectionProductsWidget: { countPerRow } = {}
}: CollectionProductsProps) {
  if (!collection) {
    return null;
  }
  return (
    <div className="collection__products__widget web3-fade-in-up">
      <div className="page-width relative z-10">
        <div className="text-center mb-8">
          <p className="web3-section-title">{collection?.name}</p>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mt-4">
            <span className="web3-gradient-text">{collection?.name}</span>
          </h3>
        </div>
        {collection?.description && (
          <div className="flex justify-center mb-8 max-w-2xl mx-auto text-muted-foreground">
            <Editor rows={collection?.description} />
          </div>
        )}
        <div>
          <ProductList
            products={collection?.products?.items}
            gridColumns={countPerRow}
          />
        </div>
      </div>
    </div>
  );
}

export const query = `
  query Query($collection: String, $count: Int, $countPerRow: Int) {
    collection (code: $collection) {
      collectionId
      name
      description
      products (filters: [{key: "limit", operation: eq, value: $count}]) {
        items {
          ...Product
        }
      }
    }
    collectionProductsWidget(collection: $collection, count: $count, countPerRow: $countPerRow) {
      countPerRow
    }
  }
`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection"),
  count: getWidgetSetting("count"),
  countPerRow: getWidgetSetting("countPerRow", 4)
}`;
