"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const photos = Array.from({ length: 20 }, (_, index) => ({
  src: `/photos/${String(index + 1).padStart(2, "0")}.jpg`,
  alt: `珍藏的回忆照片 ${index + 1}`,
}));

const roseLayout = [
  [49, 1, 1.04, -10, 0], [27, 13, .9, 8, .05], [69, 14, .93, 18, .1],
  [11, 34, .72, 24, .16], [42, 26, 1.18, 58, .22], [76, 34, .8, 24, .29],
  [24, 46, 1, 68, .34], [57, 48, 1.07, 84, .4], [84, 51, .69, -4, .46],
  [4, 56, .64, -15, .52], [38, 64, .9, 47, .59], [68, 68, .85, 20, .65],
  [19, 75, .72, -8, .72], [49, 80, .75, 0, .78], [77, 79, .62, -18, .84],
];

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    type Particle = {
      x: number; y: number; vx: number; vy: number; size: number;
      alpha: number; life: number; burst: boolean; color: string;
    };
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: Math.min(90, Math.floor(width / 13)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .12,
        vy: -.08 - Math.random() * .22,
        size: .5 + Math.random() * 1.7,
        alpha: .12 + Math.random() * .45,
        life: 1,
        burst: false,
        color: Math.random() > .2 ? "#f4d8a3" : "#f4a1ae",
      }));
    };

    const burst = () => {
      const centerX = width * .5;
      const centerY = height * .5;
      for (let index = 0; index < 190; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 7;
        particles.push({
          x: centerX + (Math.random() - .5) * 80,
          y: centerY + (Math.random() - .5) * 80,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: 1 + Math.random() * 3.2,
          alpha: 1,
          life: 1,
          burst: true,
          color: ["#f7c6cc", "#e62e52", "#ffd993", "#ffffff"][index % 4],
        });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles = particles.filter((particle) => particle.life > 0);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.burst) {
          particle.vy += .035;
          particle.vx *= .995;
          particle.life -= .008;
          particle.alpha = Math.max(0, particle.life);
        } else if (particle.y < -10) {
          particle.y = height + 10;
          particle.x = Math.random() * width;
        }
        context.beginPath();
        context.shadowBlur = particle.size * 5;
        context.shadowColor = particle.color;
        context.fillStyle = particle.color;
        context.globalAlpha = particle.alpha;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("qixi-burst", burst);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("qixi-burst", burst);
    };
  }, []);

  return <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />;
}

function RoseBouquet() {
  return (
    <div className="gift-bouquet" aria-label="一大束正在绽放的红玫瑰">
      <div className="bouquet-flowers">
        {roseLayout.map(([x, y, scale, depth, delay], index) => (
          <div
            className="rose-3d"
            key={index}
            style={{
              "--x": `${x}%`, "--y": `${y}%`, "--scale": scale,
              "--depth": `${depth}px`, "--delay": `${delay}s`,
              "--turn": `${(index % 5) * 13 - 24}deg`,
            } as CSSVars}
          >
            {Array.from({ length: 8 }, (_, petal) => (
              <span className={`petal petal-${petal + 1}`} key={petal} />
            ))}
            <i className="rose-heart" />
          </div>
        ))}
      </div>
      <div className="bouquet-stems" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => <i key={index} />)}
      </div>
      <div className="bouquet-paper paper-left" />
      <div className="bouquet-paper paper-right" />
      <div className="bouquet-ribbon"><span>Love you</span></div>
    </div>
  );
}

export default function Home() {
  const [intro, setIntro] = useState<"waiting" | "opening" | "done">("waiting");
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(-6);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const pointer = useRef({ x: 0, y: 0, rotation: 0, tilt: -6 });
  const dragging = useRef(false);
  const moved = useRef(false);
  const step = 360 / photos.length;

  useEffect(() => {
    if (intro !== "done" || paused || lightbox !== null) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % photos.length;
        setRotation(-next * step);
        return next;
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [intro, lightbox, paused, step]);

  useEffect(() => {
    if (lightbox === null) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight") setLightbox((lightbox + 1) % photos.length);
      if (event.key === "ArrowLeft") setLightbox((lightbox - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [lightbox]);

  const openGift = () => {
    if (intro !== "waiting") return;
    setIntro("opening");
    window.dispatchEvent(new Event("qixi-burst"));
    window.setTimeout(() => setIntro("done"), 1450);
  };

  const selectPhoto = (index: number) => {
    const normalized = (index + photos.length) % photos.length;
    setActive(normalized);
    setRotation(-normalized * step);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    moved.current = false;
    pointer.current = { x: event.clientX, y: event.clientY, rotation, tilt };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const deltaX = event.clientX - pointer.current.x;
    const deltaY = event.clientY - pointer.current.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 7) moved.current = true;
    setRotation(pointer.current.rotation + deltaX * .24);
    setTilt(Math.max(-16, Math.min(10, pointer.current.tilt - deltaY * .08)));
  };

  const pointerUp = () => {
    dragging.current = false;
    const nearest = ((Math.round(-rotation / step) % photos.length) + photos.length) % photos.length;
    setActive(nearest);
    window.setTimeout(() => setPaused(false), 700);
  };

  return (
    <main className="love-page">
      <ParticleField />

      <section className={`intro intro-${intro}`} aria-hidden={intro === "done"}>
        <button className="skip-intro" type="button" onClick={() => setIntro("done")}>跳过开场</button>
        <div className="intro-copy">
          <p className="eyebrow">七夕 · 岁岁相伴</p>
          <h1>有一束花，<em>想亲手送给你</em></h1>
          <p className="intro-wish">今夜鹊桥相逢，我把星河、玫瑰和所有偏爱，都装进这一刻。</p>
          <button className="receive-button" type="button" onClick={openGift}>
            <span>收下这束花</span><span aria-hidden="true">↗</span>
          </button>
        </div>
        <RoseBouquet />
        <p className="opening-message">花已为你盛开</p>
        <div className="scroll-hint"><span /> 轻触开启回忆</div>
      </section>

      <div className={`memory-world ${intro === "done" ? "is-visible" : ""}`} aria-hidden={intro !== "done"}>
        <nav className="topline" aria-label="页面信息">
          <span>QIXI · 2026</span>
          <span className="topline-heart">♥</span>
          <span>20 MEMORIES</span>
        </nav>

        <section className="gallery-section" aria-labelledby="gallery-title">
          <header className="gallery-header">
            <p className="eyebrow">OUR LITTLE UNIVERSE</p>
            <h2 id="gallery-title">爱，是我们共同<br /><em>收藏的每一帧</em></h2>
            <p>左右拖动相册，让每一段回忆重新走到你面前。</p>
          </header>

          <div
            className="carousel-stage"
            role="region"
            aria-label="可旋转的 3D 回忆相册"
            tabIndex={0}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => { if (!dragging.current) setPaused(false); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") selectPhoto(active - 1);
              if (event.key === "ArrowRight") selectPhoto(active + 1);
            }}
          >
            <div className="carousel-glow" aria-hidden="true" />
            <div className="photo-ring" style={{ transform: `rotateX(${tilt}deg) rotateY(${rotation}deg)` }}>
              {photos.map((photo, index) => (
                <button
                  className={`photo-card ${index === active ? "is-active" : ""}`}
                  type="button"
                  key={photo.src}
                  style={{ "--angle": `${index * step}deg`, "--order": index } as CSSVars}
                  onClick={() => { if (!moved.current) setLightbox(index); }}
                  aria-label={`放大查看第 ${index + 1} 张照片`}
                >
                  <img src={photo.src} alt={photo.alt} draggable={false} />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="gallery-controls">
            <button type="button" onClick={() => selectPhoto(active - 1)} aria-label="上一张">←</button>
            <div className="counter"><strong>{String(active + 1).padStart(2, "0")}</strong><i /><span>{photos.length}</span></div>
            <button type="button" onClick={() => selectPhoto(active + 1)} aria-label="下一张">→</button>
          </div>
          <p className="interaction-tip">拖动旋转 · 点击照片放大 · 键盘方向键切换</p>
        </section>

        <section className="love-note" aria-label="七夕祝福">
          <p>TO MY DEAREST</p>
          <blockquote>“愿往后的每个朝朝暮暮，<br />都有你，也有我们。”</blockquote>
          <span>七夕快乐，岁岁年年</span>
        </section>
        <footer><span>∞</span> THE STORY CONTINUES</footer>
      </div>

      {lightbox !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`第 ${lightbox + 1} 张回忆照片`} onClick={() => setLightbox(null)}>
          <button className="lightbox-close" type="button" onClick={() => setLightbox(null)} aria-label="关闭照片">×</button>
          <button className="lightbox-arrow lightbox-prev" type="button" onClick={(event) => { event.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }} aria-label="上一张">←</button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={photos[lightbox].src} alt={photos[lightbox].alt} />
            <figcaption><span>{String(lightbox + 1).padStart(2, "0")} / {photos.length}</span> 每一帧，都是喜欢你的证明</figcaption>
          </figure>
          <button className="lightbox-arrow lightbox-next" type="button" onClick={(event) => { event.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }} aria-label="下一张">→</button>
        </div>
      )}
    </main>
  );
}
