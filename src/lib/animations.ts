export const animations = {
  // Fade animations
  fadeIn: "animate-in fade-in duration-300",
  fadeOut: "animate-out fade-out duration-300",

  // Slide animations
  slideInFromTop: "animate-in slide-in-from-top-2 duration-300",
  slideInFromBottom: "animate-in slide-in-from-bottom-2 duration-300",
  slideInFromLeft: "animate-in slide-in-from-left-2 duration-300",
  slideInFromRight: "animate-in slide-in-from-right-2 duration-300",

  // Scale animations
  scaleIn: "animate-in zoom-in-95 duration-200",
  scaleOut: "animate-out zoom-out-95 duration-200",

  // Bounce animations
  bounce: "animate-bounce",

  // Pulse animations
  pulse: "animate-pulse",

  // Spin animations
  spin: "animate-spin",

  // Custom animations for cards
  cardFlip: "transition-all duration-500 [transform-style:preserve-3d]",
  cardFlipInner: "[backface-visibility:hidden]",

  // Flash card animations
  flashCardContainer: "relative w-full h-full [perspective:1000px]",
  flashCardInner:
    "relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]",
  flashCardFlipped: "[transform:rotateY(180deg)]",
  flashCardFace: "absolute w-full h-full [backface-visibility:hidden] rounded-lg",
  flashCardBack: "[transform:rotateY(180deg)]",

  // Slide navigation animations
  slideNext: "animate-in slide-in-from-right-4 fade-in duration-300",
  slidePrev: "animate-in slide-in-from-left-4 fade-in duration-300",
  slideOut: "animate-out slide-out-to-left-4 fade-out duration-300",

  // Success animations
  success: "animate-in zoom-in-105 duration-300",
  successPulse: "animate-pulse bg-green-100 dark:bg-green-900/20",
  successBounce: "animate-bounce",

  // Error animations
  shake: "animate-shake",
  errorShake: "animate-shake bg-red-100 dark:bg-red-900/20",
  errorPulse: "animate-pulse bg-red-100 dark:bg-red-900/20",
};
