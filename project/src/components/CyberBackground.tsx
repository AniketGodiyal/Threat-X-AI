import { useEffect, useRef } from 'react';

export function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const nodes: { x: number; y: number; z: number; vx: number; vy: number; vz: number }[] = [];
    const nodeCount = 80;
    const maxDist = 200;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.5,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;
    let rotation = 0;

    const handleMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouse);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let rafId: number;

    const render = () => {
      rotation += 0.001;

      ctx.fillStyle = 'rgba(10, 14, 26, 0.15)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const focal = 400;

      const projected = nodes.map((node) => {
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const rx = node.x * cosR - node.z * sinR;
      const rz = node.x * sinR + node.z * cosR;

        const scale = focal / (focal + rz + node.z);
        const px = cx + (rx + (mouseX - cx) * 0.05) * scale;
        const py = cy + (node.y + (mouseY - cy) * 0.05) * scale;

        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        if (node.x < -width) node.x = width;
        if (node.x > width) node.x = -width;
        if (node.y < -height) node.y = height;
        if (node.y > height) node.y = -height;
        if (node.z < -500) node.z = 500;
        if (node.z > 500) node.z = -500;

        return { x: px, y: py, z: rz + node.z, scale };
      });

      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.4 * Math.min(projected[i].scale, projected[j].scale);
            const isAccent = (i + j) % 7 === 0;
            ctx.strokeStyle = isAccent
              ? `rgba(0, 229, 255, ${alpha})`
              : `rgba(30, 144, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of projected) {
        const size = Math.max(0.5, 2 * p.scale);
        const alpha = Math.min(1, p.scale * 0.8);
        ctx.fillStyle = `rgba(30, 144, 255, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-cyber-bg">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyber-bg" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyber-blue/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyber-cyan/5 rounded-full blur-[100px]" />
    </div>
  );
}
