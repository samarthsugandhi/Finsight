"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname as useLocation } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import Logo from "@/components/Logo";
import "./Menu.css";

const Menu = ({ isOpen, setIsOpen }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const menuColsRef = useRef([]);
  const menuOverlayRef = useRef(null);
  const menuItemsRef = useRef([]);
  const menuCloseRef = useRef(null);
  const menuFooterRef = useRef(null);
  const menuPatternRef = useRef(null);
  const menuBgRef = useRef(null);
  const menuContactRef = useRef(null);
  const router = useRouter();
  const location = { pathname: useLocation() };
  const navigationTimeoutRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  // Contact form state
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderMessage, setSenderMessage] = useState("");
  const [sentStatus, setSentStatus] = useState(false);

  useEffect(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      gsap.set(menuColsRef.current, {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      });
      gsap.set(menuOverlayRef.current, {
        pointerEvents: "none",
      });
      gsap.set(
        [menuCloseRef.current, menuContactRef.current, ...menuItemsRef.current, menuFooterRef.current],
        {
          opacity: 0,
        }
      );
      gsap.set(menuPatternRef.current, {
        clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
      });
      gsap.set(menuBgRef.current, {
        xPercent: -10,
        opacity: 0,
      });
      setIsOpen(false);
    }, 750);

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [location.pathname, setIsOpen]);

  const handleMenuOpen = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const timeline = gsap.timeline({
      onComplete: () => setIsAnimating(false),
    });

    timeline
      .to(menuColsRef.current, {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 1,
        stagger: 0.125,
        ease: "power4.inOut",
      })
      .set(menuOverlayRef.current, {
        pointerEvents: "all",
      })
      .to(
        menuBgRef.current,
        {
          xPercent: 0,
          opacity: 1,
          duration: 1.5,
          ease: "power3.out",
        },
        "-=0.5"
      )
      .to(
        menuPatternRef.current,
        {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          duration: 1,
          ease: "power4.inOut",
        },
        "-=2"
      )
      .to(
        [menuCloseRef.current, menuContactRef.current, ...menuItemsRef.current, menuFooterRef.current],
        {
          opacity: 1,
          duration: 0.5,
          stagger: 0.075,
          ease: "power2.out",
        },
        "-=1.5"
      );

    setIsOpen(true);
  };

  const handleMenuClose = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const timeline = gsap.timeline({
      onComplete: () => setIsAnimating(false),
    });

    timeline
      .to(
        [menuCloseRef.current, menuContactRef.current, ...menuItemsRef.current, menuFooterRef.current],
        {
          opacity: 0,
          duration: 0.5,
          stagger: 0.075,
          ease: "power2.in",
        }
      )
      .set(menuOverlayRef.current, {
        pointerEvents: "none",
      })
      .to(
        menuPatternRef.current,
        {
          clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
          duration: 1,
          ease: "power4.inOut",
        },
        "-=0.5"
      )
      .to(
        menuBgRef.current,
        {
          xPercent: -10,
          opacity: 0,
          duration: 1.2,
          ease: "power3.in",
        },
        "-=1"
      )
      .to(
        menuColsRef.current,
        {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
          duration: 1,
          stagger: 0.125,
          ease: "power4.inOut",
        },
        "-=0.8"
      );

    setIsOpen(false);
  };

  const handleNavigation = (to) => (e) => {
    e.preventDefault();
    setTimeout(() => {
      router.push(to);
    }, 0);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !senderMessage.trim()) return;
    
    const subject = encodeURIComponent(`Finsight Support Request from ${senderName}`);
    const body = encodeURIComponent(
      `Name: ${senderName}\nEmail: ${senderEmail}\n\nMessage:\n${senderMessage}`
    );
    
    // Redirect direct to mail client
    window.location.href = `mailto:finsight@gmail.com?cc=customersupport@gmail.com&subject=${subject}&body=${body}`;
    
    setSentStatus(true);
    setTimeout(() => {
      setSentStatus(false);
      setSenderName("");
      setSenderEmail("");
      setSenderMessage("");
    }, 3000);
  };

  const addToRefs = (el) => {
    if (el && !menuColsRef.current.includes(el)) {
      menuColsRef.current.push(el);
    }
  };

  const addToMenuItemsRef = (el) => {
    if (el && !menuItemsRef.current.includes(el)) {
      menuItemsRef.current.push(el);
    }
  };

  return (
    <div className="menu">
      <div className="menu-bar">
        <div className="logo">
          <Link href="/" onClick={handleNavigation("/")} className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-screamer text-2xl tracking-widest text-white select-none">
              Finsight
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Navbar Theme Switcher - Fixed inside navigation block & scrolls naturally */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-horizon/20 hover:bg-horizon/10 transition-colors flex items-center justify-center cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-horizon animate-pulse" />
            ) : (
              <Moon className="h-5 w-5 text-horizon" />
            )}
          </button>

          <div className="menu-open" onClick={handleMenuOpen}>
            <p>Menu</p>
          </div>
        </div>
      </div>

      <div className="menu-overlay" ref={menuOverlayRef}>
        {/* Left Column - Contact details, Form and background/pattern containers */}
        <div className="menu-col" ref={addToRefs}>
          {/* Animated Background image matching the finova-main zoom sweep */}
          <div className="menu-bg" ref={menuBgRef}>
            <img src="/menu/menu-bg.jpg" alt="" />
          </div>

          <div className="menu-contact-container" ref={menuContactRef}>
            <h2 className="menu-contact-title">Contact Us</h2>
            
            <div className="menu-contact-info">
              <p>Email: <a href="mailto:finsight@gmail.com">finsight@gmail.com</a></p>
              <p>Support: <a href="mailto:customersupport@gmail.com">customersupport@gmail.com</a></p>
              <p>Phone: <a href="tel:+919876543210">+91 9876543210</a></p>
            </div>

            <form onSubmit={handleSendMessage} className="menu-contact-form">
              <input
                type="text"
                placeholder="Your Name"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="menu-contact-input"
              />
              <input
                type="email"
                placeholder="Your Email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="menu-contact-input"
              />
              <textarea
                placeholder="Type your message here..."
                required
                value={senderMessage}
                onChange={(e) => setSenderMessage(e.target.value)}
                className="menu-contact-input menu-contact-textarea"
              />
              
              {sentStatus ? (
                <div className="menu-contact-success">
                  Email Prepared! Redirecting...
                </div>
              ) : (
                <button type="submit" className="menu-contact-submit cursor-pointer">
                  Send Message
                </button>
              )}
            </form>
          </div>
          
          <div className="menu-pattern" ref={menuPatternRef}>
            <img src="/menu/menu-pattern.png" alt="" />
          </div>
        </div>

        {/* Right Column - Finsight Specific Route Links */}
        <div className="menu-col" ref={addToRefs}>
          <div
            className="menu-close"
            ref={menuCloseRef}
            onClick={handleMenuClose}
          >
            <p>Close</p>
          </div>

          <div className="menu-items">
            <div className="menu-item" ref={addToMenuItemsRef}>
              <p>
                <Link href="/" onClick={handleNavigation("/")}>
                  Home
                </Link>
              </p>
            </div>
            <div className="menu-item" ref={addToMenuItemsRef}>
              <p>
                <Link href="/dashboard" onClick={handleNavigation("/dashboard")}>
                  Dashboard
                </Link>
              </p>
            </div>

            <div className="menu-item" ref={addToMenuItemsRef}>
              <p>
                <Link href="/login" onClick={handleNavigation("/login")}>
                  Sign In
                </Link>
              </p>
            </div>
            <div className="menu-item" ref={addToMenuItemsRef}>
              <p>
                <Link href="/signup" onClick={handleNavigation("/signup")}>
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          <div className="menu-footer" ref={menuFooterRef}>
            <p className="primary">Clarity for your money.</p>
            <p>Your money, explained — not just recorded.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
