import { Image } from '@components/common/Image.js';
import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
function PrevArrow(props) {
    const { onClick } = props;
    return /*#__PURE__*/ React.createElement("button", {
        className: "absolute bottom-[20px] right-[70px] z-20 flex h-10 w-10 items-center justify-center rounded-full web3-glass text-foreground transition-all hover:scale-105 hover:shadow-[0_0_20px_var(--web3-glow-cyan)] focus:outline-none focus:ring-2 focus:ring-primary/50 md:bottom-[20px] md:right-[70px] md:h-10 md:w-10",
        onClick: onClick,
        "aria-label": "Previous slide",
        type: "button"
    }, /*#__PURE__*/ React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: "24",
        height: "24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "h-5 w-5"
    }, /*#__PURE__*/ React.createElement("polyline", {
        points: "15 18 9 12 15 6"
    })));
}
function NextArrow(props) {
    const { onClick } = props;
    return /*#__PURE__*/ React.createElement("button", {
        className: "absolute bottom-[20px] right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full web3-glass text-foreground transition-all hover:scale-105 hover:shadow-[0_0_20px_var(--web3-glow-cyan)] focus:outline-none focus:ring-2 focus:ring-primary/50 md:bottom-[20px] md:right-5 md:h-10 md:w-10",
        onClick: onClick,
        "aria-label": "Next slide",
        type: "button"
    }, /*#__PURE__*/ React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: "24",
        height: "24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: "h-5 w-5"
    }, /*#__PURE__*/ React.createElement("polyline", {
        points: "9 18 15 12 9 6"
    })));
}
function CustomDot(props) {
    const { onClick, active, className } = props;
    const isActive = active || className && className.includes('active');
    return /*#__PURE__*/ React.createElement("button", {
        onClick: onClick,
        className: `mx-1 my-0 h-2 w-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 md:h-2.5 md:w-2.5 ${isActive ? '!bg-primary scale-125 shadow-[0_0_8px_var(--web3-glow-cyan)]' : '!bg-foreground/30 hover:!bg-foreground/50'}`,
        "aria-label": "Go to slide",
        type: "button"
    });
}
const SliderComponent = Slider;
export default function Slideshow({ slideshowWidget: { slides = [], autoplay = true, autoplaySpeed = 3000, arrows = true, dots = true } }) {
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [progress, setProgress] = React.useState(0);
    const progressRef = React.useRef(0);
    const speed = Number(autoplaySpeed) || 3000;
    React.useEffect(()=>{
        if (!autoplay || slides.length <= 1) return;
        progressRef.current = 0;
        setProgress(0);
        const interval = setInterval(()=>{
            progressRef.current += 100 / (speed / 50);
            if (progressRef.current >= 100) {
                progressRef.current = 0;
            }
            setProgress(progressRef.current);
        }, 50);
        return ()=>clearInterval(interval);
    }, [
        autoplay,
        speed,
        currentSlide,
        slides.length
    ]);
    const settings = {
        dots: false,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: Boolean(autoplay),
        autoplaySpeed: speed,
        arrows: Boolean(arrows),
        fade: true,
        pauseOnHover: true,
        adaptiveHeight: true,
        beforeChange: (_current, next)=>{
            setCurrentSlide(next);
            progressRef.current = 0;
            setProgress(0);
        },
        nextArrow: arrows ? /*#__PURE__*/ React.createElement(NextArrow, null) : undefined,
        prevArrow: arrows ? /*#__PURE__*/ React.createElement(PrevArrow, null) : undefined,
        customPaging: function(i) {
            return /*#__PURE__*/ React.createElement(CustomDot, {
                active: false
            });
        },
        appendDots: (dots)=>/*#__PURE__*/ React.createElement("div", {
                className: "w-full flex justify-center items-center"
            }, /*#__PURE__*/ React.createElement("div", {
                className: "pr-[120px] md:pr-[120px]"
            }, dots)),
        dotsClass: 'slick-dots custom-dots-container'
    };
    if (!slides || slides.length === 0) {
        return null;
    }
    const containerClasses = [
        'slideshow-widget',
        'relative',
        'w-full'
    ].join(' ');
    const containerStyle = {
        height: 'auto',
        maxWidth: '100%'
    };
    const sliderStyle = {
        height: 'auto'
    };
    return /*#__PURE__*/ React.createElement("div", {
        className: containerClasses,
        style: containerStyle
    }, autoplay && slides.length > 1 && /*#__PURE__*/ React.createElement("div", {
        className: "web3-slide-progress",
        style: {
            width: `${progress}%`
        }
    }), /*#__PURE__*/ React.createElement(SliderComponent, {
        ...settings,
        style: sliderStyle
    }, slides.map((slide)=>/*#__PURE__*/ React.createElement("div", {
            key: slide.id,
            className: "relative lg:h-auto slide__wrapper !block",
            style: {
                display: 'block'
            }
        }, /*#__PURE__*/ React.createElement("div", {
            className: "relative w-full h-full"
        }, /*#__PURE__*/ React.createElement(Image, {
            src: slide.image,
            alt: slide.headline || 'Slideshow image',
            width: slide.width || 1920,
            height: slide.height || 0,
            style: {
                objectFit: 'cover',
                width: '100%',
                height: '100%',
                objectPosition: 'center'
            },
            sizes: "100vw",
            priority: true
        }), /*#__PURE__*/ React.createElement("div", {
            className: "web3-slide-overlay absolute inset-0"
        }), /*#__PURE__*/ React.createElement("div", {
            className: "absolute inset-0 flex flex-col items-center justify-end text-center p-6 md:p-12 pb-16 md:pb-20"
        }, (slide.headline || slide.subText || slide.buttonText && slide.buttonLink) && /*#__PURE__*/ React.createElement("div", {
            className: "max-w-3xl"
        }, slide.headline && /*#__PURE__*/ React.createElement("h2", {
            className: "text-foreground text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-5 tracking-tight"
        }, /*#__PURE__*/ React.createElement("span", {
            className: "web3-gradient-text"
        }, slide.headline)), slide.subText && /*#__PURE__*/ React.createElement("p", {
            className: "text-muted-foreground text-sm md:text-lg lg:text-xl mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed"
        }, slide.subText), slide.buttonText && slide.buttonLink && /*#__PURE__*/ React.createElement("a", {
            href: slide.buttonLink,
            className: "web3-btn-glow inline-block px-8 py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all hover:scale-105"
        }, slide.buttonText))))))));
}
export const query = `
  query Query($slides: [SlideInput], $autoplay: Boolean, $autoplaySpeed: Int, $arrows: Boolean, $dots: Boolean) {
    slideshowWidget(
      slides: $slides,
      autoplay: $autoplay,
      autoplaySpeed: $autoplaySpeed,
      arrows: $arrows,
      dots: $dots
    ) {
      slides {
        id
        image
        width
        height
        headline
        subText
        buttonText
        buttonLink
        buttonColor
      }
      autoplay
      autoplaySpeed
      arrows
      dots
    }
  }
`;
export const fragments = `
  fragment SlideData on Slide {
    id
    image
    width
    height
    headline
    subText
    buttonText
    buttonLink
    buttonColor
  }
`;
export const variables = `{
  slides: getWidgetSetting("slides"),
  autoplay: getWidgetSetting("autoplay"),
  autoplaySpeed: getWidgetSetting("autoplaySpeed"),
  arrows: getWidgetSetting("arrows"),
  dots: getWidgetSetting("dots")
}`;
