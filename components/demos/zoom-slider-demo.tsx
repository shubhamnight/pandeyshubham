'use client';

import ZoomSlider from '@/components/ui/zoom-slider';
import { travelImages } from '@/travel-data';

const images = travelImages.filter(item => item.type === 'image').map((item, index) => ({
  number: String(index + 1).padStart(2, '0'), src: item.src,
  srcSet: item.srcset, original: item.original, title: item.alt, desc: '',
}));

export default function ZoomSliderDemo() {
  return <div className="w-full h-[100svh]">
    <ZoomSlider sliderData={images} scaleOnHover textOnHover size={1} easeScrollPercentage={100} />
  </div>;
}
