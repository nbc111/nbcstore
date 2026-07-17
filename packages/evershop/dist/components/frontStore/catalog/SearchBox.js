import { Image } from '@components/common/Image.js';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Search, X } from 'lucide-react';
import React, { useRef, useState, useCallback } from 'react';
import { useClient } from 'urql';
const SEARCH_PRODUCTS_QUERY = `
  query Query($filters: [FilterInput]) {
    products(filters: $filters) {
      items {
        ...Product
      }
    }
  }
`;
const PRODUCT_FRAGMENT = `
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
    image {
      url
      alt
    }
    url
    inventory {
      isInStock
    }
  }
`;
export function SearchBox({ searchPageUrl, enableAutocomplete = false, autocompleteDelay = 300, minSearchLength = 2, maxResults = 10, onSearch, renderSearchInput, renderSearchResults, renderSearchIcon, renderCloseIcon }) {
    const InputRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const client = useClient();
    const [keyword, setKeyword] = useState('');
    const [showing, setShowing] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    React.useEffect(()=>{
        if (showing) {
            const timer = setTimeout(()=>InputRef.current?.focus(), 100);
            document.body.style.overflow = 'hidden';
            return ()=>{
                clearTimeout(timer);
                document.body.style.overflow = '';
            };
        }
    }, [
        showing
    ]);
    const defaultSearchFunction = useCallback(async (query)=>{
        try {
            const result = await client.query(`
            ${PRODUCT_FRAGMENT}
            ${SEARCH_PRODUCTS_QUERY}
          `, {
                filters: [
                    {
                        key: 'keyword',
                        operation: 'eq',
                        value: query
                    },
                    {
                        key: 'limit',
                        operation: 'eq',
                        value: `${maxResults}`
                    }
                ]
            }).toPromise();
            if (result.error) {
                return [];
            }
            if (!result.data?.products?.items) {
                return [];
            }
            return result.data.products.items.map((product)=>({
                    id: product.productId,
                    title: product.name,
                    url: product.url,
                    image: product.image?.url,
                    price: product.price?.special?.text || product.price?.regular?.text,
                    type: 'product',
                    sku: product.sku,
                    isInStock: product.inventory?.isInStock
                }));
        } catch (error) {
            return [];
        }
    }, [
        client
    ]);
    const searchFunction = onSearch || defaultSearchFunction;
    React.useEffect(()=>{
        const url = new URL(window.location.href);
        const key = url.searchParams.get('keyword');
        setKeyword(key || '');
    }, []);
    React.useEffect(()=>{
        if (showing) {
            InputRef.current?.focus();
        }
    }, [
        showing
    ]);
    const performSearch = useCallback(async (query)=>{
        if (!enableAutocomplete || query.length < minSearchLength) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchFunction(query);
            setSearchResults(results.slice(0, maxResults));
            setShowResults(true);
        } catch (error) {
            setSearchResults([]);
        } finally{
            setIsSearching(false);
        }
    }, [
        enableAutocomplete,
        searchFunction,
        minSearchLength,
        maxResults
    ]);
    const handleInputChange = useCallback((value)=>{
        setKeyword(value);
        if (enableAutocomplete) {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            searchTimeoutRef.current = setTimeout(()=>{
                performSearch(value);
            }, autocompleteDelay);
        }
    }, [
        enableAutocomplete,
        autocompleteDelay,
        performSearch
    ]);
    const handleResultSelect = useCallback((result)=>{
        if (result.url) {
            window.location.href = result.url;
        } else {
            const url = new URL(searchPageUrl, window.location.origin);
            url.searchParams.set('keyword', result.title);
            window.location.href = url.toString();
        }
        setShowing(false);
        setShowResults(false);
    }, [
        searchPageUrl
    ]);
    const handleKeyDown = useCallback((event)=>{
        if (event.key === 'Enter') {
            setShowResults(false);
            const url = new URL(searchPageUrl, window.location.origin);
            url.searchParams.set('keyword', keyword);
            window.location.href = url.toString();
        } else if (event.key === 'Escape') {
            setShowResults(false);
            setShowing(false);
        }
    }, [
        searchPageUrl,
        keyword
    ]);
    const handleFocus = useCallback(()=>{
        if (enableAutocomplete && keyword.length >= minSearchLength && searchResults.length > 0) {
            setShowResults(true);
        }
    }, [
        enableAutocomplete,
        keyword,
        minSearchLength,
        searchResults.length
    ]);
    const handleBlur = useCallback(()=>{
        setTimeout(()=>{
            setShowResults(false);
        }, 150);
    }, []);
    const defaultSearchIcon = ()=>/*#__PURE__*/ React.createElement(Search, {
            className: "w-5 h-5 text-foreground hover:text-primary"
        });
    const defaultCloseIcon = ()=>/*#__PURE__*/ React.createElement(X, {
            className: "w-5 h-5 text-foreground hover:text-primary"
        });
    return /*#__PURE__*/ React.createElement("div", {
        className: "search__box"
    }, /*#__PURE__*/ React.createElement("button", {
        type: "button",
        className: "web3-icon-btn search__icon",
        "data-active": showing,
        onClick: ()=>setShowing(!showing),
        "aria-label": _('Search'),
        "aria-expanded": showing
    }, renderSearchIcon ? renderSearchIcon() : defaultSearchIcon()), showing && /*#__PURE__*/ React.createElement("div", {
        className: "search__input__container web3-search-overlay fixed top-0 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl shadow-2xl z-50 p-6 md:p-10",
        onClick: (e)=>{
            if (e.target === e.currentTarget) {
                setShowing(false);
                setShowResults(false);
            }
        }
    }, /*#__PURE__*/ React.createElement("div", {
        className: "web3-search-panel"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "search__input relative flex flex-col gap-4"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "flex items-center gap-3"
    }, renderSearchInput ? renderSearchInput({
        value: keyword || '',
        onChange: handleInputChange,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        placeholder: _('Search products...'),
        ref: InputRef
    }) : defaultSearchInput({
        value: keyword || '',
        onChange: handleInputChange,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        placeholder: _('Search products...'),
        ref: InputRef
    }), /*#__PURE__*/ React.createElement("button", {
        type: "button",
        className: "web3-icon-btn shrink-0",
        onClick: ()=>{
            setShowing(false);
            setShowResults(false);
        },
        "aria-label": _('Close search')
    }, renderCloseIcon ? renderCloseIcon() : defaultCloseIcon())), /*#__PURE__*/ React.createElement("p", {
        className: "text-xs text-muted-foreground text-center"
    }, _('Press Enter to search · Esc to close')), enableAutocomplete && showResults && (renderSearchResults ? renderSearchResults({
        results: searchResults,
        query: keyword || '',
        onSelect: handleResultSelect,
        isLoading: isSearching
    }) : defaultSearchResults({
        results: searchResults,
        query: keyword || '',
        onSelect: handleResultSelect,
        isLoading: isSearching
    }))))));
}
const defaultSearchInput = (props)=>/*#__PURE__*/ React.createElement("div", {
        className: "form__field flex items-center justify-center relative grow"
    }, /*#__PURE__*/ React.createElement(InputGroup, {
        className: "h-12"
    }, /*#__PURE__*/ React.createElement(InputGroupAddon, null, /*#__PURE__*/ React.createElement(Search, {
        className: "text-muted-foreground"
    })), /*#__PURE__*/ React.createElement(InputGroupInput, {
        ref: props.ref,
        placeholder: props.placeholder,
        value: props.value,
        onChange: (e)=>props.onChange(e.target.value),
        onKeyDown: props.onKeyDown,
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        enterKeyHint: "search",
        className: "w-full text-lg h-12 focus:outline-none"
    })));
const defaultSearchResults = (props)=>{
    return /*#__PURE__*/ React.createElement("div", {
        className: "search__results web3-glass border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto mt-2"
    }, props.isLoading && /*#__PURE__*/ React.createElement("div", {
        className: "p-4 text-center text-muted-foreground"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "inline-flex items-center gap-2"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"
    }), /*#__PURE__*/ React.createElement("span", null, _('Searching...')))), !props.isLoading && props.results.length === 0 && /*#__PURE__*/ React.createElement("div", {
        className: "p-4 text-center text-muted-foreground"
    }, /*#__PURE__*/ React.createElement("span", null, _('No results found for "${query}"', {
        query: props.query
    }))), !props.isLoading && props.results.map((result, index)=>/*#__PURE__*/ React.createElement("div", {
            key: result.id,
            className: "flex items-center p-3 hover:bg-primary/8 cursor-pointer border-b border-border last:border-b-0 transition-all web3-fade-in-up web3-tap",
            style: {
                animationDelay: `${index * 40}ms`
            },
            onClick: (e)=>{
                e.preventDefault();
                props.onSelect(result);
            },
            onKeyDown: (e)=>{
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    props.onSelect(result);
                }
            },
            role: "button",
            tabIndex: 0
        }, result.image && /*#__PURE__*/ React.createElement(Image, {
            src: result.image,
            alt: result.title,
            width: 100,
            height: 100,
            className: "w-10 h-10 object-cover rounded mr-3 shrink-0"
        }), /*#__PURE__*/ React.createElement("div", {
            className: "flex-1 min-w-0"
        }, /*#__PURE__*/ React.createElement("div", {
            className: "font-medium truncate"
        }, result.title), result.price && /*#__PURE__*/ React.createElement("div", {
            className: "text-sm"
        }, result.price), result.type && /*#__PURE__*/ React.createElement("div", {
            className: "text-xs text-muted-foreground capitalize"
        }, result.type)))));
};
