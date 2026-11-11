import { useEffect, useState, type RefObject } from 'react';

export function useFitsInViewport(ref: RefObject<HTMLElement | null>, verticalMargin: number) {
  const [fits, setFits] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (element === null || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => setFits(element.offsetHeight + verticalMargin * 2 <= window.innerHeight);
    const observer = new ResizeObserver(measure);

    observer.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref, verticalMargin]);

  return fits;
}
