"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import "./PageLoader.css";

// Check if GSAP and CustomEase exist to prevent crash
if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

export default function PageLoader({ active, onComplete }) {
  const [counter, setCounter] = useState(0);
  const heroRef = useRef(null);
  const progressRef = useRef(null);
  const videoRef = useRef(null);
  const lineRef = useRef(null);

  const statusText = useMemo(() => (counter < 100 ? "Loading Finsight dashboard data..." : "ready"), [counter]);

  useEffect(() => {
    if (!active) {
      setCounter(100);
      return;
    }

    setCounter(0);

    const hero = heroRef.current;
    const progress = progressRef.current;
    const video = videoRef.current;
    const line = lineRef.current;

    if (!hero || !progress || !video || !line) {
      return;
    }

    // Initialize custom ease curve
    let customEase;
    try {
      customEase = CustomEase.create("bpLoaderEase", ".87,0,.13,1");
    } catch (e) {
      customEase = "power4.inOut";
    }

    gsap.set(hero, {
      clipPath: "polygon(0% 45%, 0% 45%, 0% 55%, 0% 55%)",
    });
    gsap.set(progress, {
      width: "25vw",
      opacity: 1,
    });
    gsap.set(video, {
      clipPath: "polygon(0% 49.8%, 100% 49.8%, 100% 50.2%, 0% 50.2%)",
      opacity: 1,
    });
    gsap.set(line, {
      opacity: 0,
      scaleX: 0,
      height: "6px",
      transformOrigin: "left center",
    });

    const counterValue = { value: 0 };

    const tl = gsap.timeline();

    tl.to(hero, {
      clipPath: "polygon(0% 45%, 25% 45%, 25% 55%, 0% 55%)",
      duration: 1.5,
      ease: customEase,
      delay: 1,
    })
      .to(hero, {
        clipPath: "polygon(0% 45%, 100% 45%, 100% 55%, 0% 55%)",
        duration: 2,
        ease: customEase,
        onStart: () => {
          gsap.to(progress, {
            width: "100vw",
            duration: 2,
            ease: customEase,
          });

          gsap.to(counterValue, {
            value: 100,
            duration: 2,
            ease: customEase,
            snap: { value: 1 },
            onUpdate: () => setCounter(counterValue.value),
          });

          gsap.to(line, {
            scaleX: 1,
            opacity: 1,
            duration: 0.6,
            ease: customEase,
          });
        },
      })
      .to(hero, {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 1,
        ease: customEase,
        onStart: () => {
          gsap.to(video, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 1,
            ease: customEase,
          });

          gsap.to(line, {
            height: "100svh",
            opacity: 0.25,
            duration: 1,
            ease: customEase,
          });

          gsap.to(progress, {
            opacity: 0,
            duration: 0.3,
          });
        },
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });

    return () => {
      tl.kill();
      gsap.killTweensOf([progress, video, line, counterValue, hero]);
    };
  }, [active]);

  return (
    <div className={`bp-loader ${active ? "is-active" : "is-hidden"}`} aria-hidden={!active}>
      <div className="bp-loader-hero" ref={heroRef}>
        <div className="bp-loader-video-container" ref={videoRef}>
          <video autoPlay muted loop playsInline preload="auto">
            <source src="/toxic-hero.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="bp-progress-bar" ref={progressRef}>
          <p>{statusText}</p>
          <p>
            /<span>{counter}</span>
          </p>
        </div>

        <div className="bp-loader-line" ref={lineRef} />
      </div>
    </div>
  );
}
