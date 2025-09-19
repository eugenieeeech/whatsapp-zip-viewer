import React, { useState, useEffect, useRef } from 'react';
import { mediaLoader } from '@/utils/MediaLoader';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent } from './ui/dialog';

interface LazyMediaProps {
  filename: string;
  type: 'image' | 'sticker' | 'document' | 'audio' | 'video';
}

const LazyMediaComponent: React.FC<LazyMediaProps> = ({ filename, type }) => {
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const [open, setOpen] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to detect when component comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !inView) {
          setInView(true);
        } else if (!entry.isIntersecting && inView && blobUrl) {
          // Media has scrolled out of view - clean up after delay
          setTimeout(() => {
            if (!entry.isIntersecting) {
              console.log(`Cleaning up media that scrolled out of view: ${filename}`);
              mediaLoader.revokeMedia(filename);
              setBlobUrl(null);
              setInView(false);
              setLoading(true);
            }
          }, 30000); // 30 second delay before cleanup
        }
      },
      {
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: '50px' // Start loading 50px before element comes into view
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [inView, blobUrl, filename]);

  // Load media when component comes into view
  useEffect(() => {
    if (inView && !blobUrl && !error) {
      loadMedia();
    }
  }, [inView, blobUrl, error]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        // Don't revoke immediately as other components might use the same media
        // MediaLoader handles cleanup internally
      }
    };
  }, [blobUrl]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const loadedMedia = await mediaLoader.loadMedia(filename);
      
      if (loadedMedia) {
        setBlobUrl(loadedMedia.blobUrl);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(`Failed to load media ${filename}:`, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const canOpenDialog = !!blobUrl && (type === 'image' || type === 'sticker' || type === 'video' || type === 'audio');

  const renderContent = () => {
    if (!inView) {
      // Placeholder before coming into view
      if (type === 'image') {
        return <Skeleton className="w-full h-[180px] rounded-lg" />;
      } else if (type === 'sticker') {
        return <Skeleton className="max-w-[120px] max-h-[120px] rounded-lg" />;
      }
      return <Skeleton className="w-full h-16 rounded-lg" />;
    }

    if (loading && !error) {
      if (type === 'image') {
        return <Skeleton className="w-full h-[180px] rounded-lg" />;
      } else if (type === 'sticker') {
        return <Skeleton className="max-w-[120px] max-h-[120px] rounded-lg" />;
      }
      return <Skeleton className="w-full h-16 rounded-lg" />;
    }

    if (error || !blobUrl) {
      return (
        <div className="p-3 bg-white/20 rounded-lg flex items-center gap-3 text-white/70">
          <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
            ⚠️
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Failed to load media</p>
            <p className="text-xs">{filename}</p>
          </div>
        </div>
      );
    }

    // Render actual media content
    switch (type) {
      case 'image':
        return (
          <img
            src={blobUrl}
            alt={filename}
            className="max-w-full h-auto rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-zoom-in"
            style={{ maxHeight: '300px', objectFit: 'contain' }}
            onClick={(e) => { e.stopPropagation(); if (canOpenDialog) setOpen(true); }}
          />
        );
      
      case 'sticker':
        return (
          <div className="bg-transparent p-2">
            <img
              src={blobUrl}
              alt={filename}
              className="max-w-[120px] max-h-[120px] object-contain cursor-zoom-in"
              onClick={(e) => { e.stopPropagation(); if (canOpenDialog) setOpen(true); }}
            />
          </div>
        );
      
      case 'document':
        return (
          <div className="p-3 bg-white/20 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
              📄
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{filename}</p>
              <p className="text-xs text-white/70">Document</p>
            </div>
          </div>
        );
      
      case 'audio':
      case 'video':
        return (
          <div className="p-3 bg-white/20 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
              {type === 'audio' ? '🎵' : '🎬'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{filename}</p>
              <p className="text-xs text-white/70">
                {type === 'audio' ? 'Audio' : 'Video'}
              </p>
            </div>
            {/* For video/audio, we could add actual player controls here */}
            {blobUrl && type === 'video' && (
              <video
                src={blobUrl}
                className="max-w-full max-h-[200px] rounded cursor-zoom-in"
                controls
                preload="metadata"
                onClick={(e) => { e.stopPropagation(); if (canOpenDialog) setOpen(true); }}
              />
            )}
            {blobUrl && type === 'audio' && (
              <audio
                src={blobUrl}
                controls
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        );
      
      default:
        return (
          <div className="p-3 bg-white/20 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
              📎
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{filename}</p>
              <p className="text-xs text-white/70">Unknown media type</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div
        ref={elementRef}
        className="rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm"
        onClick={() => { if (canOpenDialog) setOpen(true); }}
        role={canOpenDialog ? 'button' : undefined}
      >
        {renderContent()}
      </div>

      {/* Dialog preview */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl bg-white/95">
          <div className="flex flex-col gap-3 items-center">
            {blobUrl && (type === 'image' || type === 'sticker') && (
              <img
                src={blobUrl}
                alt={filename}
                className="max-h-[80vh] w-auto rounded"
                style={{ objectFit: 'contain' }}
              />
            )}
            {blobUrl && type === 'video' && (
              <video
                src={blobUrl}
                className="max-h-[80vh] w-auto rounded"
                controls
                autoPlay
              />
            )}
            {blobUrl && type === 'audio' && (
              <div className="w-full">
                <div className="mb-2 text-sm text-gray-700 truncate">{filename}</div>
                <audio src={blobUrl} controls className="w-full" />
              </div>
            )}
            {blobUrl && (
              <a
                href={blobUrl}
                download={filename}
                className="mt-2 text-sm text-indigo-600 hover:underline"
              >
                下載 / Download
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LazyMediaComponent;