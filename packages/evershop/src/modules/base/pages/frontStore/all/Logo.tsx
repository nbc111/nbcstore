import React from 'react';

interface LogoProps {
  themeConfig: {
    logo: {
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
    };
  };
}
export default function Logo({
  themeConfig: {
    logo: { src, alt = 'NBC Store', width = 128, height = 128 }
  }
}: LogoProps) {
  return (
    <div className="logo md:ml-0 flex justify-center items-center">
      {src && (
        <a href="/" className="logo-icon">
          <img src={src} alt={alt} width={width} height={height} />
        </a>
      )}
      {!src && (
        <a href="/" className="logo-icon flex items-center gap-2.5 group">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            className="w-9 h-9 transition-transform duration-300 group-hover:scale-105"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <path
              d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
              stroke="url(#logoGrad)"
              strokeWidth="1.5"
              fill="rgba(20, 22, 40, 0.8)"
            />
            <path
              d="M20 10L28 14.5V25.5L20 30L12 25.5V14.5L20 10Z"
              fill="url(#logoGrad)"
              opacity="0.9"
            />
            <circle cx="20" cy="20" r="3" fill="#0a0b14" />
          </svg>
          <span className="web3-gradient-text text-lg font-bold tracking-tight hidden sm:inline">
            NBC Store
          </span>
        </a>
      )}
    </div>
  );
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
