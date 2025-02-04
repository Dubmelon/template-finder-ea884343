import { useEffect, useRef } from 'react';
import { BackgroundImage } from './background/BackgroundImage';
import { drawSnowflake } from './background/Snowflake';
import { useSnowfall } from './background/useSnowfall';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const { backgroundImage, drawBackground } = BackgroundImage({ ctx, canvas });
    const { settings, snowflakes, windStrength, targetWindStrength, setWindStrength } = useSnowfall(canvas);

    const animate = () => {
      if (!canvas) return;
      
      drawBackground();

      // Update wind
      setWindStrength(prev => prev + (targetWindStrength - prev) * 0.002);

      // Update and draw snowflakes
      snowflakes.forEach(flake => {
        flake.windPhase += 0.02 * settings.animationSpeed;
        const windEffect = Math.sin(flake.windPhase) * 0.5;
        
        flake.x += (windStrength + windEffect + flake.windOffset) * (flake.size / 2) * settings.animationSpeed;
        flake.y += flake.speed;

        if (flake.y > canvas.height) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) flake.x = 0;
        if (flake.x < 0) flake.x = canvas.width;

        drawSnowflake(ctx, flake, settings.color);
      });

      requestAnimationFrame(animate);
    };

    // Start animation when image is loaded
    backgroundImage.onload = () => {
      animate();
    };

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
};

export default AnimatedBackground;