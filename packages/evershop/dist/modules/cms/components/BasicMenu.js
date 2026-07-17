import { useIsMobile } from '@components/common/ui/hooks/useIsMobile.js';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@components/common/ui/NavigationMenu.js';
import { cn } from '@evershop/evershop/lib/util/cn';
import React from 'react';
export default function BasicMenu({ basicMenuWidget: { menus, isMain, className } }) {
    const [isOpen, setIsOpen] = React.useState(!isMain);
    const isMobile = useIsMobile();
    const [currentPath, setCurrentPath] = React.useState('');
    React.useEffect(()=>{
        setCurrentPath(window.location.pathname);
    }, []);
    React.useEffect(()=>{
        if (isMain && isMobile && isOpen) {
            document.body.style.overflow = 'hidden';
            return ()=>{
                document.body.style.overflow = '';
            };
        }
    }, [
        isMain,
        isMobile,
        isOpen
    ]);
    React.useEffect(()=>{
        const handleEscape = (e)=>{
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return ()=>document.removeEventListener('keydown', handleEscape);
    }, [
        isOpen
    ]);
    const isActive = (url)=>{
        if (url === '/') {
            return currentPath === '/';
        }
        return currentPath.startsWith(url);
    };
    const toggleMenu = ()=>{
        setIsOpen(!isOpen);
    };
    const closeMenu = ()=>{
        setIsOpen(false);
    };
    return /*#__PURE__*/ React.createElement("div", {
        className: className
    }, /*#__PURE__*/ React.createElement("div", {
        className: "flex justify-start gap-4 items-center"
    }, /*#__PURE__*/ React.createElement("nav", {
        className: "p-2 relative md:flex md:justify-center w-full"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "flex justify-between items-center w-full"
    }, isMain && isMobile && /*#__PURE__*/ React.createElement("button", {
        type: "button",
        onClick: toggleMenu,
        className: "web3-icon-btn web3-hamburger",
        "data-open": isOpen,
        "aria-label": isOpen ? 'Close menu' : 'Open menu',
        "aria-expanded": isOpen
    }, /*#__PURE__*/ React.createElement("span", {
        className: "web3-hamburger-line"
    }), /*#__PURE__*/ React.createElement("span", {
        className: "web3-hamburger-line"
    }), /*#__PURE__*/ React.createElement("span", {
        className: "web3-hamburger-line"
    })), isMain && isMobile && isOpen && /*#__PURE__*/ React.createElement("div", {
        className: "web3-menu-backdrop",
        onClick: closeMenu,
        "aria-hidden": "true"
    }), /*#__PURE__*/ React.createElement("div", {
        className: cn(isMain ? 'md:flex absolute md:relative left-0 md:left-0 top-full md:top-auto mt-2 md:mt-0 w-full md:w-auto p-4 md:p-0 min-w-62.5 web3-glass web3-mobile-menu-panel md:bg-transparent md:backdrop-filter-none md:border-none rounded-xl md:rounded-none z-30' : 'flex relative left-0 md:left-0 w-full md:w-auto p-4 md:p-0 min-w-62.5 web3-glass md:bg-transparent md:backdrop-filter-none md:border-none rounded-xl md:rounded-none', isOpen ? 'block' : 'hidden', 'md:flex')
    }, /*#__PURE__*/ React.createElement(NavigationMenu, {
        className: "w-full max-w-full"
    }, /*#__PURE__*/ React.createElement(NavigationMenuList, {
        className: "flex-col md:flex-row items-start md:items-center w-full md:w-auto gap-1 md:gap-0"
    }, menus.map((item, index)=>/*#__PURE__*/ React.createElement(NavigationMenuItem, {
            key: item.uuid,
            className: "w-full md:w-auto web3-fade-in-up",
            style: {
                animationDelay: `${index * 50}ms`
            }
        }, item.children.length > 0 && !isMobile ? /*#__PURE__*/ React.createElement(React.Fragment, null, /*#__PURE__*/ React.createElement(NavigationMenuTrigger, {
            className: "web3-nav-link w-full md:w-auto justify-start md:justify-center bg-transparent hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent data-popup-open:bg-transparent data-popup-open:hover:bg-transparent"
        }, item.name), /*#__PURE__*/ React.createElement(NavigationMenuContent, null, /*#__PURE__*/ React.createElement("ul", {
            className: "flex flex-col min-w-50 p-2 web3-glass rounded-lg"
        }, item.children.map((subItem)=>/*#__PURE__*/ React.createElement("li", {
                key: subItem.uuid
            }, /*#__PURE__*/ React.createElement(NavigationMenuLink, {
                href: subItem.url,
                className: "w-full text-muted-foreground hover:text-primary transition-colors rounded-md px-2 py-1.5 hover:bg-primary/5"
            }, subItem.name)))))) : /*#__PURE__*/ React.createElement(NavigationMenuLink, {
            href: item.url,
            className: "web3-nav-link w-full md:w-auto px-4 py-3 md:py-2 data-[active=true]:bg-transparent data-[active=true]:hover:bg-transparent transition-colors hover:bg-primary/5 md:hover:bg-transparent focus:bg-transparent text-base md:text-sm rounded-lg md:rounded-none",
            "data-active": isActive(item.url),
            onClick: closeMenu
        }, item.name))))))))));
}
export const query = `
  query Query($settings: JSON) {
    basicMenuWidget(settings: $settings) {
      menus {
        id
        name
        url
        type
        uuid
        children {
          name
          url
          type
          uuid
        }
      }
      isMain
      className
    }
  }
`;
export const variables = `{
  settings: getWidgetSetting()
}`;
