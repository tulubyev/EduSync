import { useRef, useEffect } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction?: 'horizontal' | 'vertical';
}

export function ResizeHandle({ onResize, direction = 'vertical' }: ResizeHandleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startPosRef = useRef(0);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      isResizingRef.current = true;
      startPosRef.current = direction === 'vertical' ? e.clientX : e.clientY;
      document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const delta = (direction === 'vertical' ? e.clientX : e.clientY) - startPosRef.current;
      onResize(delta);
      startPosRef.current = direction === 'vertical' ? e.clientX : e.clientY;
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (ref.current) {
      ref.current.addEventListener('mousedown', handleMouseDown);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize]);

  return (
    <div
      ref={ref}
      className={`${
        direction === 'vertical' ? 'w-1 cursor-col-resize hover:bg-primary/50' : 'h-1 cursor-row-resize hover:bg-primary/50'
      } bg-border transition-colors duration-200 flex-shrink-0`}
      title={direction === 'vertical' ? 'Перетащите для изменения ширины' : 'Перетащите для изменения высоты'}
    />
  );
}
