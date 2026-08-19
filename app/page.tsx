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

const loveMessages = [
  "点一下，把心动送给付晨",
  "心动升温中 · 33%",
  "只对付晨心动 · 66%",
  "爱意满格 · 永远喜欢付晨",
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
      alpha: number; life: number; kind: "ambient" | "spark" | "confetti"; color: string;
    };
    type Firework = {
      x: number; y: number; targetY: number; speed: number; color: string;
      trail: Array<{ x: number; y: number }>;
    };
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let particles: Particle[] = [];
    let fireworks: Firework[] = [];
    const launchTimers: number[] = [];

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
        kind: "ambient",
        color: Math.random() > .2 ? "#f4d8a3" : "#f4a1ae",
      }));
    };

    const addExplosion = (x: number, y: number, color: string, amount = 90) => {
      for (let index = 0; index < amount; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.1 + Math.random() * 5.8;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: .7 + Math.random() * 2.8,
          alpha: 1,
          life: 1,
          kind: "spark",
          color: index % 8 === 0 ? "#fff7e8" : color,
        });
      }
    };

    const burst = () => addExplosion(width * .5, height * .48, "#e62e52", 180);

    const launchFirework = (position: number, color: string, heightRatio: number) => {
      fireworks.push({
        x: width * position,
        y: height + 24,
        targetY: height * heightRatio,
        speed: 7.3 + Math.random() * 2.4,
        color,
        trail: [],
      });
    };

    const fireworkShow = () => {
      const show = [
        [.22, "#ff335f", .27], [.72, "#ffd27d", .2], [.48, "#ff90a6", .14],
        [.84, "#ff5c7b", .35], [.12, "#fff0c4", .38], [.61, "#d65cff", .29],
      ] as const;
      show.forEach(([position, color, target], index) => {
        launchTimers.push(window.setTimeout(() => launchFirework(position, color, target), index * 310));
      });
    };

    const heartBurst = () => {
      const centerX = width * (.35 + Math.random() * .3);
      const centerY = height * (.3 + Math.random() * .15);
      for (let index = 0; index < 80; index += 1) {
        const t = (index / 80) * Math.PI * 2;
        const heartX = 16 * Math.sin(t) ** 3;
        const heartY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        particles.push({
          x: centerX, y: centerY,
          vx: heartX * .24, vy: heartY * .24,
          size: 1.2 + Math.random() * 1.6,
          alpha: 1, life: 1, kind: "spark", color: index % 3 ? "#ff4f72" : "#ffd9a0",
        });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      fireworks = fireworks.filter((firework) => {
        firework.trail.push({ x: firework.x, y: firework.y });
        if (firework.trail.length > 9) firework.trail.shift();
        firework.y -= firework.speed;
        context.beginPath();
        firework.trail.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.strokeStyle = firework.color;
        context.globalAlpha = .75;
        context.lineWidth = 1.6;
        context.shadowBlur = 14;
        context.shadowColor = firework.color;
        context.stroke();
        context.beginPath();
        context.arc(firework.x, firework.y, 2.4, 0, Math.PI * 2);
        context.fillStyle = "#fff";
        context.fill();
        if (firework.y <= firework.targetY) {
          addExplosion(firework.x, firework.y, firework.color, 115);
          return false;
        }
        return true;
      });

      particles = particles.filter((particle) => particle.life > 0);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.kind !== "ambient") {
          particle.vy += particle.kind === "spark" ? .025 : .05;
          particle.vx *= .992;
          particle.life -= particle.kind === "spark" ? .009 : .014;
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
    window.addEventListener("qixi-fireworks", fireworkShow);
    window.addEventListener("qixi-heart-burst", heartBurst);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      launchTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", resize);
      window.removeEventListener("qixi-burst", burst);
      window.removeEventListener("qixi-fireworks", fireworkShow);
      window.removeEventListener("qixi-heart-burst", heartBurst);
    };
  }, []);

  return <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />;
}

function RoseBouquet() {
  return (
    <div className="gift-bouquet" aria-label="一大束正在绽放的红玫瑰">
      <div className="bouquet-aura" aria-hidden="true">
        <i /><i /><i />
        <span className="orbit-star orbit-star-one">✦</span>
        <span className="orbit-star orbit-star-two">✧</span>
        <span className="orbit-star orbit-star-three">✦</span>
      </div>
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
      <div className="bouquet-ribbon"><span>To 付晨</span></div>
    </div>
  );
}

export default function Home() {
  const [intro, setIntro] = useState<"waiting" | "opening" | "done">("waiting");
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(-6);
  const [active, setActive] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [heartRain, setHeartRain] = useState(0);
  const [loveLevel, setLoveLevel] = useState(0);
  const pointer = useRef({ x: 0, y: 0, rotation: 0, tilt: -6 });
  const dragging = useRef(false);
  const moved = useRef(false);
  const galleryRef = useRef<HTMLElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const step = 360 / photos.length;

  useEffect(() => {
    if (intro !== "done") return;

    const syncToScroll = () => {
      if (scrollFrame.current !== null) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        scrollFrame.current = null;
        const section = galleryRef.current;
        if (!section || dragging.current || lightbox !== null) return;
        const start = section.offsetTop - 36;
        const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
        const progress = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
        const nextRotation = -progress * 720;
        const nextActive = ((Math.round(-nextRotation / step) % photos.length) + photos.length) % photos.length;
        setScrollProgress(progress);
        setRotation(nextRotation);
        setActive(nextActive);
      });
    };

    syncToScroll();
    window.addEventListener("scroll", syncToScroll, { passive: true });
    window.addEventListener("resize", syncToScroll);
    return () => {
      window.removeEventListener("scroll", syncToScroll);
      window.removeEventListener("resize", syncToScroll);
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
  }, [intro, lightbox, step]);

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

  const celebrate = () => {
    window.dispatchEvent(new Event("qixi-fireworks"));
    window.dispatchEvent(new Event("qixi-heart-burst"));
    setHeartRain((current) => current + 1);
  };

  const openGift = () => {
    if (intro !== "waiting") return;
    setIntro("opening");
    celebrate();
    window.setTimeout(() => window.dispatchEvent(new Event("qixi-burst")), 520);
    window.setTimeout(() => setIntro("done"), 3350);
  };

  const fillLove = () => {
    setLoveLevel((current) => {
      const next = Math.min(3, current + 1);
      if (next === 3) window.setTimeout(celebrate, 120);
      return next;
    });
  };

  const selectPhoto = (index: number) => {
    const normalized = (index + photos.length) % photos.length;
    setActive(normalized);
    setRotation(-normalized * step);
    setScrollProgress((normalized / photos.length) / 2);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    moved.current = false;
    pointer.current = { x: event.clientX, y: event.clientY, rotation, tilt };
    event.currentTarget.setPointerCapture(event.pointerId);
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
    setScrollProgress((nearest / photos.length) / 2);
  };

  return (
    <main className="love-page">
      <ParticleField />
      {heartRain > 0 && (
        <div className="heart-rain" key={heartRain} aria-hidden="true">
          {Array.from({ length: 38 }, (_, index) => (
            <span
              key={index}
              style={{
                "--left": `${(index * 37) % 100}%`,
                "--delay": `${(index % 11) * .11}s`,
                "--drift": `${((index % 7) - 3) * 18}px`,
                "--size": `${12 + (index % 5) * 5}px`,
              } as CSSVars}
            >{index % 4 === 0 ? "✦" : "♥"}</span>
          ))}
        </div>
      )}

      <section className={`intro intro-${intro}`} aria-hidden={intro === "done"}>
        <button className="skip-intro" type="button" onClick={() => setIntro("done")}>跳过开场</button>
        <div className="intro-copy">
          <p className="eyebrow">FOR FU CHEN · 七夕限定</p>
          <h1>付晨，<em>这束花只为你盛开</em></h1>
          <p className="intro-wish">今夜鹊桥相逢，我把星河、烟火、玫瑰和所有偏爱，都装进这一刻送给你。</p>
          <button className="receive-button" type="button" onClick={openGift}>
            <span>付晨，收下这束花</span><span aria-hidden="true">↗</span>
          </button>
          <p className="firework-hint">点击后，请看一场只属于你的烟火</p>
        </div>
        <RoseBouquet />
        <p className="opening-message"><strong>付晨</strong>，花与烟火都为你盛开</p>
        <div className="scroll-hint"><span /> 轻触开启回忆</div>
      </section>

      <div className={`memory-world ${intro === "done" ? "is-visible" : ""}`} aria-hidden={intro !== "done"}>
        <nav className="topline" aria-label="页面信息">
          <span>FU CHEN · QIXI 2026</span>
          <button className="topline-heart" type="button" onClick={celebrate} aria-label="为付晨放烟花">♥</button>
          <span>20 MEMORIES</span>
        </nav>

        <section className="gallery-section" ref={galleryRef} aria-labelledby="gallery-title">
          <header className="gallery-header">
            <p className="eyebrow">FU CHEN, OUR LITTLE UNIVERSE</p>
            <h2 id="gallery-title">付晨，爱是我们<br /><em>收藏的每一帧</em></h2>
            <p>向下滚动，让回忆随你的步伐转动；也可以拖动环形相册，重新遇见每一帧。</p>
            <button className="firework-button" type="button" onClick={celebrate}><span>✦</span> 再为付晨放一次烟花</button>
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

          <div className="scroll-orbit" aria-hidden="true">
            <span className="scroll-orbit-label">SCROLL TO ROTATE</span>
            <i><b style={{ transform: `scaleX(${Math.max(.08, scrollProgress)})` }} /></i>
            <span>{String(active + 1).padStart(2, "0")} / {photos.length}</span>
          </div>

          <div className="gallery-controls">
            <button type="button" onClick={() => selectPhoto(active - 1)} aria-label="上一张">←</button>
            <div className="counter"><strong>{String(active + 1).padStart(2, "0")}</strong><i /><span>{photos.length}</span></div>
            <button type="button" onClick={() => selectPhoto(active + 1)} aria-label="下一张">→</button>
          </div>
          <p className="interaction-tip">向下滚动旋转 · 拖动微调 · 点击照片放大 · 键盘方向键切换</p>
        </section>

        <section className="love-note" aria-label="七夕祝福">
          <p>TO FU CHEN, MY DEAREST</p>
          <blockquote>“付晨，愿往后的每个朝朝暮暮，<br />都有你，也有我们。”</blockquote>
          <div className="love-meter-wrap">
            <button className="love-meter" type="button" onClick={fillLove} style={{ "--love": `${(loveLevel / 3) * 100}%` } as CSSVars}>
              <i className="love-meter-fill" />
              <span>{loveMessages[loveLevel]}</span>
              <b aria-hidden="true">♥</b>
            </button>
            <small>连续点击三次，解锁给付晨的隐藏惊喜</small>
          </div>
          <span>付晨，七夕快乐，岁岁年年</span>
        </section>
        <footer><span>∞</span> THE STORY CONTINUES</footer>
      </div>

      {lightbox !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`第 ${lightbox + 1} 张回忆照片`} onClick={() => setLightbox(null)}>
          <button className="lightbox-close" type="button" onClick={() => setLightbox(null)} aria-label="关闭照片">×</button>
          <button className="lightbox-arrow lightbox-prev" type="button" onClick={(event) => { event.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }} aria-label="上一张">←</button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={photos[lightbox].src} alt={photos[lightbox].alt} />
            <figcaption><span>{String(lightbox + 1).padStart(2, "0")} / {photos.length}</span> 付晨，每一帧都是喜欢你的证明</figcaption>
          </figure>
          <button className="lightbox-arrow lightbox-next" type="button" onClick={(event) => { event.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }} aria-label="下一张">→</button>
        </div>
      )}
    </main>
  );
}
