import { Box } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

const loadedImageUrls = new Set();

export default function AttachmentImage({
  src,
  alt,
  loading = 'lazy',
  onClick,
  imgStyle,
  containerSx,
}) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(() => loadedImageUrls.has(src));

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      return;
    }

    setLoaded(loadedImageUrls.has(src));
  }, [src]);

  useEffect(() => {
    const image = imgRef.current;
    if (!image || !src) {
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      loadedImageUrls.add(src);
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = () => {
    loadedImageUrls.add(src);
    setLoaded(true);
  };

  const handleError = () => {
    setLoaded(true);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: 'rgba(63, 81, 181, 0.08)',
        ...containerSx,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: loaded ? 0 : 1,
          pointerEvents: 'none',
          transition: 'opacity 0.18s ease-out',
          background: 'linear-gradient(135deg, rgba(63, 81, 181, 0.08), rgba(63, 81, 181, 0.16))',
        }}
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          width: '100%',
          height: 'auto',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.18s ease-out',
          ...imgStyle,
        }}
      />
    </Box>
  );
}
