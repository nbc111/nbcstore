import React from 'react';
export default function Logo({ themeConfig: { logo: { src, alt = 'NBCStore', width = 128, height = 128 } } }) {
    return /*#__PURE__*/ React.createElement("div", {
        className: "logo md:ml-0 flex justify-center items-center"
    }, src && /*#__PURE__*/ React.createElement("a", {
        href: "/",
        className: "logo-icon"
    }, /*#__PURE__*/ React.createElement("img", {
        src: src,
        alt: alt,
        width: width,
        height: height
    })), !src && /*#__PURE__*/ React.createElement("a", {
        href: "/",
        className: "logo-icon flex items-center gap-2.5 group"
    }, /*#__PURE__*/ React.createElement("svg", {
        width: "40",
        height: "40",
        viewBox: "0 0 40 40",
        fill: "none",
        className: "w-9 h-9 transition-transform duration-300 group-hover:scale-110",
        xmlns: "http://www.w3.org/2000/svg"
    }, /*#__PURE__*/ React.createElement("defs", null, /*#__PURE__*/ React.createElement("linearGradient", {
        id: "logoGrad",
        x1: "0",
        y1: "0",
        x2: "40",
        y2: "40",
        gradientUnits: "userSpaceOnUse"
    }, /*#__PURE__*/ React.createElement("stop", {
        stopColor: "#00f0ff"
    }), /*#__PURE__*/ React.createElement("stop", {
        offset: "0.5",
        stopColor: "#a855f7"
    }), /*#__PURE__*/ React.createElement("stop", {
        offset: "1",
        stopColor: "#00ff88"
    }))), /*#__PURE__*/ React.createElement("polygon", {
        points: "20,2 36,11 36,29 20,38 4,29 4,11",
        stroke: "url(#logoGrad)",
        strokeWidth: "1.5",
        fill: "rgba(0,240,255,0.06)"
    }), /*#__PURE__*/ React.createElement("polygon", {
        points: "20,8 30,14 30,26 20,32 10,26 10,14",
        stroke: "url(#logoGrad)",
        strokeWidth: "1",
        fill: "rgba(168,85,247,0.08)"
    }), /*#__PURE__*/ React.createElement("text", {
        x: "20",
        y: "23",
        textAnchor: "middle",
        fill: "url(#logoGrad)",
        fontSize: "9",
        fontWeight: "700",
        fontFamily: "JetBrains Mono, monospace"
    }, "N")), /*#__PURE__*/ React.createElement("span", {
        className: "web3-gradient-text text-lg font-bold tracking-tight hidden sm:block"
    }, "NBCStore")));
}
export const layout = {
    areaId: 'headerMiddleCenter',
    sortOrder: 10
};
export const query = `
  query query {
    themeConfig {
      logo {
        src
        alt
        width
        height
      }
    }
  }
`;
