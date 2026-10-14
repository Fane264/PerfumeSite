// A single tiny, dark JPEG used as a generic `blurDataURL` for product imagery.
// Keeping one shared constant avoids generating a per-image placeholder while
// still giving `next/image` a low-quality placeholder to fade in from, which
// matches the storefront's dark aesthetic and reduces layout-shift flash.
export const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJiQgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJjBGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAQQDAAAAAAAAAAAAAQIDAAQFEQYSITFRYXGB/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABcRAQEBAQAAAAAAAAAAAAAAAAEAESH/2gAMAwEAAhEDEQA/AKtxdQ2cJluJVjjBA2x9k6FFFc7nMpcZW4DSnUaEhEHYf2iiitGf//Z";
