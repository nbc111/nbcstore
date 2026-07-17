import React from 'react';
export const ProductListLoadingSkeleton = ({ count = 4, gridColumns = 4, layout = 'grid' })=>{
    if (layout === 'list') {
        return /*#__PURE__*/ React.createElement("div", {
            className: "product-list flex flex-col gap-5"
        }, Array.from({
            length: count
        }).map((_, i)=>/*#__PURE__*/ React.createElement("div", {
                key: i,
                className: "flex gap-4 p-4 rounded-lg border border-border"
            }, /*#__PURE__*/ React.createElement("div", {
                className: "web3-skeleton shrink-0 w-[120px] h-[120px] rounded-lg"
            }), /*#__PURE__*/ React.createElement("div", {
                className: "flex-1 space-y-3"
            }, /*#__PURE__*/ React.createElement("div", {
                className: "web3-skeleton h-5 w-3/5"
            }), /*#__PURE__*/ React.createElement("div", {
                className: "web3-skeleton h-4 w-1/4"
            }), /*#__PURE__*/ React.createElement("div", {
                className: "web3-skeleton h-5 w-1/5"
            }), /*#__PURE__*/ React.createElement("div", {
                className: "web3-skeleton h-4 w-1/6"
            })))));
    }
    const className = (()=>{
        switch(gridColumns){
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-1 md:grid-cols-2';
            case 3:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
            case 4:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
            case 5:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5';
            case 6:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6';
            default:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
        }
    })();
    return /*#__PURE__*/ React.createElement("div", {
        className: `product__list grid gap-6 ${className}`
    }, Array.from({
        length: count
    }).map((_, i)=>/*#__PURE__*/ React.createElement("div", {
            key: i,
            className: "space-y-3"
        }, /*#__PURE__*/ React.createElement("div", {
            className: "web3-skeleton aspect-square rounded-lg"
        }), /*#__PURE__*/ React.createElement("div", {
            className: "web3-skeleton h-5 w-4/5"
        }), /*#__PURE__*/ React.createElement("div", {
            className: "web3-skeleton h-4 w-2/5"
        }))));
};
