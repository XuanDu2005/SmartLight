import type { ImgHTMLAttributes } from 'react';
import { useState } from 'react';
import { cn } from '../utils/cn.util';

export interface SmartImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: string;
  aspectRatio?: 'square' | 'video' | 'portrait';
}

const aspectClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
};

const FALLBACK_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23e5e7eb"/><text x="200" y="200" font-family="sans-serif" font-size="20" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle">No image</text></svg>';

export const SmartImage = ({
  src,
  fallback = FALLBACK_SVG,
  aspectRatio = 'square',
  alt,
  className,
  ...rest
}: SmartImageProps): JSX.Element => {
  const [errored, setErrored] = useState(false);
  const effective = !errored && src ? src : fallback;
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md bg-neutral-100',
        aspectClasses[aspectRatio],
        className,
      )}
    >
      <img
        src={effective}
        alt={alt ?? ''}
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
        loading="lazy"
        {...rest}
      />
    </div>
  );
};