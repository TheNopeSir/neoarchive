
import React, { useEffect, useRef } from 'react';

interface PixelSnowProps {
  theme: 'dark' | 'light';
}

const PixelSnow: React.FC<PixelSnowProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Configuration
    const particleCount = width < 768 ? 80 : 150; // Less snow on mobile
    const particles: { x: number; y: number; size: number; speed: number; opacity: number; wobble: number }[] = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.floor(Math.random() * 3) + 2, // 2px to 4px integer squares for pixel look
        speed: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        wobble: Math.random() * Math.PI * 2
      });
    }

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Green color base (Neo Green)
      // In light mode, we might want it slightly darker to be visible, or keep it subtle.
      // Keeping it "Radioactive Green" for the theme.
      const r = 74, g = 222, b = 128; 

      particles.forEach((p) => {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
        
        // Draw a distinct square (pixel)
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);

        // Update position
        p.y += p.speed;
        p.wobble += 0.02;
        p.x += Math.sin(p.wobble) * 0.5; // Slight horizontal drift

        // Wrap around screen
        if (p.y > height) {
          p.y = -5;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none -z-[5] opacity-60"
    />
  );
};

export default PixelSnow;
