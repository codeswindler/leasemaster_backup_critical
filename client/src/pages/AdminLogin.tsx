import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import { LogIn, Loader2, Eye, EyeOff, FileText, ArrowRight, Users, Mail, Phone, Search, ThumbsUp, ArrowLeft, Book, BookOpen, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import "@/components/animated-icons.css";

// Animated Eye Component - eye tracks mouse, blinks properly, and has idle state
function AnimatedEye() {
  const [pupilPosition, setPupilPosition] = useState({ x: 0, y: 0 });
  const [containerTransform, setContainerTransform] = useState({ rotate: 0, translateX: 0, translateY: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const eyeRef = React.useRef<HTMLDivElement>(null);
  const lastMouseMoveRef = React.useRef<number>(Date.now());
  const blinkTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      lastMouseMoveRef.current = now;
      
      if (!eyeRef.current) return;
      
      const rect = eyeRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const distance = Math.sqrt(
        Math.pow(mouseX - eyeCenterX, 2) + Math.pow(mouseY - eyeCenterY, 2)
      );
      
      // 200px radius detection
      if (distance <= 200) {
        setIsIdle(false);
        
        // Calculate pupil position relative to eye center
        const angle = Math.atan2(mouseY - eyeCenterY, mouseX - eyeCenterX);
        const maxRadius = 4;
        const rawX = Math.cos(angle) * maxRadius;
        const rawY = Math.sin(angle) * maxRadius;
        
        // Clamp pupil position to keep iris (5px radius) within eyelid bounds
        // Eyelid bounds: x ~2-22 at center (y=12), height ~6-18
        // Iris center must be at least 5px from edges, so clamp to keep iris within bounds
        const clampedX = Math.max(-5, Math.min(5, rawX));
        const clampedY = Math.max(-1, Math.min(1, rawY));
        setPupilPosition({ x: clampedX, y: clampedY });
        
        // Head turning: rotation and translation
        const rotation = (mouseX - eyeCenterX) / 40; // ±5-10 degrees max
        const translateX = (mouseX - eyeCenterX) / 80; // ±2-3px max
        const translateY = (mouseY - eyeCenterY) / 80;
        setContainerTransform({ 
          rotate: Math.max(-10, Math.min(10, rotation)),
          translateX: Math.max(-3, Math.min(3, translateX)),
          translateY: Math.max(-3, Math.min(3, translateY))
        });
      } else {
        // Mouse too far, start idle timer (5 seconds)
        setTimeout(() => {
          if (Date.now() - lastMouseMoveRef.current >= 5000) {
            setIsIdle(true);
          }
        }, 5000);
      }
    };

    // Human-like idle wandering animation with still periods
    let idleSequenceIndex = 0;
    let isStillPeriod = false;
    let stillPeriodTimeout: NodeJS.Timeout | null = null;
    
    const idlePositions = [
      { x: 0, y: 0 },      // center
      { x: -3, y: 0 },     // left (clamped)
      { x: 0, y: 0 },      // center
      { x: 3, y: 0 },      // right (clamped)
      { x: 0, y: 0 },      // center
      { x: 0, y: -1 },     // up (clamped)
      { x: 0, y: 0 },      // center
      { x: 0, y: 1 },      // down (clamped)
      { x: 0, y: 0 },      // center
    ];
    
    const startStillPeriod = () => {
      isStillPeriod = true;
      // Return to center position
      setPupilPosition({ x: 0, y: 0 });
      setContainerTransform({ rotate: 0, translateX: 0, translateY: 0 });
      
      // Random still period duration: 8-15 seconds
      const stillDuration = 8000 + Math.random() * 7000;
      stillPeriodTimeout = setTimeout(() => {
        isStillPeriod = false;
        idleSequenceIndex = 0; // Reset sequence
      }, stillDuration);
    };
    
    const idleInterval = setInterval(() => {
      if (isIdle && !isStillPeriod) {
        // Cycle through directional looks with pauses
        const targetPos = idlePositions[idleSequenceIndex % idlePositions.length];
        setPupilPosition(targetPos);
        
        // Subtle head movement following gaze direction
        const headFollowAmount = 0.3;
        setContainerTransform({
          rotate: targetPos.x * 1.5 * headFollowAmount,
          translateX: targetPos.x * 0.5 * headFollowAmount,
          translateY: targetPos.y * 0.5 * headFollowAmount
        });
        
        idleSequenceIndex++;
        
        // After completing sequence, start still period
        if (idleSequenceIndex >= idlePositions.length) {
          startStillPeriod();
        }
      }
    }, 2500);

    // Blinking: every 10-20 seconds (eye stays open most of the time)
    const scheduleBlink = () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      const delay = 10000 + Math.random() * 10000; // 10-20 seconds
      blinkTimeoutRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(idleInterval);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      if (stillPeriodTimeout) clearTimeout(stillPeriodTimeout);
    };
  }, [isIdle]);

  return (
    <div 
      ref={eyeRef}
      className="animated-eye-container"
      style={{
        transform: `rotate(${containerTransform.rotate}deg) translate(${containerTransform.translateX}px, ${containerTransform.translateY}px)`,
        transition: 'transform 0.5s ease-in-out'
      }}
    >
      <svg 
        className="h-5 w-5 animated-eye-icon" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `translate(0px, 0px)`,
          transition: 'transform 0.4s ease-in-out'
        }}
      >
        {/* Eyelids - white outline oval */}
        <path 
          d="M12 6C8 6 4.5 8 2 12C4.5 16 8 18 12 18C16 18 19.5 16 22 12C19.5 8 16 6 12 6Z" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          fill="none"
        />
        {/* Iris - white outline circle (moves with pupil) */}
        <circle 
          cx={String(12 + pupilPosition.x)} 
          cy={String(12 + pupilPosition.y)} 
          r="5" 
          stroke="white" 
          strokeWidth="1.5"
          fill="none"
          className="animated-eye-pupil-svg"
        />
        {/* Pupil - white filled circle */}
        <circle 
          cx={String(12 + pupilPosition.x)} 
          cy={String(12 + pupilPosition.y)} 
          r="2.5" 
          fill="white"
        />
      </svg>
      <div className={`animated-eye-blink ${isBlinking ? 'blinking' : ''}`}>
        <div />
      </div>
    </div>
  );
}

// Animated Book Component - opens, peruses pages, closes in cycle
function AnimatedBook() {
  const [bookState, setBookState] = useState<"closed" | "opening" | "pages" | "closing">("closed");

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    const runCycle = () => {
      setBookState("closed");
      timeouts.push(setTimeout(() => {
        setBookState("opening");
        timeouts.push(setTimeout(() => {
          setBookState("pages");
          timeouts.push(setTimeout(() => {
            setBookState("closing");
            timeouts.push(setTimeout(() => {
              runCycle();
            }, 800));
          }, 3000)); // Pages perusing for 3 seconds
        }, 800)); // Opening animation
      }, 3000)); // Closed for 3 seconds
    };

    // Start cycle after initial delay
    timeouts.push(setTimeout(() => {
      runCycle();
    }, 1000));

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div 
      className={`animated-book-container ${
        bookState === "opening" ? "animated-book-open-state" :
        bookState === "pages" ? "animated-book-pages-state" :
        bookState === "closing" ? "animated-book-close-state" : ""
      }`}
    >
      {bookState === "closed" || bookState === "closing" ? (
        <Book className="h-5 w-5" />
      ) : (
        <BookOpen className="h-5 w-5" />
      )}
    </div>
  );
}

type AdminLoginProps = {
  loginType?: "admin" | "agent";
  hideEnquiries?: boolean;
  portalLabel?: string;
  showForgotPassword?: boolean;
  forgotPasswordPath?: string;
  showBecomeAgent?: boolean;
  becomeAgentPath?: string;
};

export function AdminLogin({
  loginType = "admin",
  hideEnquiries = false,
  portalLabel,
  showForgotPassword = false,
  forgotPasswordPath,
  showBecomeAgent = false,
  becomeAgentPath,
}: AdminLoginProps) {
  const [location, setLocation] = useLocation();
  const [resetToken, setResetToken] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const resolvedPortalLabel = portalLabel || (loginType === "agent" ? "Agent Portal" : "Admin Portal");
  const loginCardClassName =
    loginType === "agent"
      ? "border-2 shadow-2xl backdrop-blur-2xl bg-white/80 dark:bg-background/20"
      : "border-2 shadow-2xl backdrop-blur-2xl bg-background/20 dark:bg-background/20";
  const portalSubdomain = loginType === "agent" ? "agents" : "admin";
  const portalPath = loginType === "agent" ? "/agent" : "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showClientsDialog, setShowClientsDialog] = useState(false);
  const [showEnquiriesDialog, setShowEnquiriesDialog] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [shakeQuickAction, setShakeQuickAction] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    setResetToken(token);
    if (loginType === "agent" && (token || window.location.pathname.endsWith("/reset"))) {
      setIsResetDialogOpen(true);
    }
  }, [location, loginType]);

  useEffect(() => {
    if (!otpCooldown) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Generate 50 luxury property image URLs
  // Using actual Unsplash photo IDs for luxury properties
  // These are real luxury property photos from Unsplash
  const propertyImages = [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&h=1080&fit=crop&q=80', // Luxury modern home
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop&q=80', // Luxury mansion
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&h=1080&fit=crop&q=80', // Luxury villa
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Luxury penthouse
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // Luxury estate
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // Modern luxury home
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&h=1080&fit=crop&q=80', // Luxury residence
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Luxury apartment
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Luxury condo
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80', // Luxury property
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Luxury real estate
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80', // Luxury architecture
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Luxury interior
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // Luxury design
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // Luxury living
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Luxury bedroom
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Luxury kitchen
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80', // Luxury bathroom
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80', // Luxury pool
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Luxury exterior
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // Luxury garden
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // Luxury patio
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Luxury balcony
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Luxury view
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80', // Luxury beach house
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80', // Luxury mountain home
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Luxury city penthouse
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // Modern luxury
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // Contemporary luxury
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Minimalist luxury
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Scandinavian luxury
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80', // Tropical villa
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80', // Mediterranean luxury
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Colonial luxury
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // French chateau
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // English manor
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Spanish villa
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Tuscan villa
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80', // Beachfront luxury
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80', // Waterfront luxury
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Mountain villa
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // Desert home
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // Forest retreat
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Urban penthouse
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80', // Sky villa
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80', // Rooftop terrace
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80', // Infinity pool
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80', // Spa resort
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80', // Winery estate
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80', // Golf course home
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80', // Island retreat
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const [imageBrightness, setImageBrightness] = useState<number>(0.5); // 0 = dark, 1 = light
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Preload next few images for smoother transitions
  useEffect(() => {
    const preloadImages = () => {
      const nextIndices = [
        (currentImageIndex + 1) % propertyImages.length,
        (currentImageIndex + 2) % propertyImages.length,
        (currentImageIndex + 3) % propertyImages.length,
      ];
      
      nextIndices.forEach((idx) => {
        if (!imagesLoaded.has(idx)) {
          const img = new Image();
          img.src = propertyImages[idx];
          img.onload = () => {
            setImagesLoaded((prev) => new Set(prev).add(idx));
          };
        }
      });
    };

    preloadImages();
  }, [currentImageIndex, propertyImages, imagesLoaded]);

  // Check current theme
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkTheme(isDark);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  // Analyze image brightness (with CORS fallback)
  const analyzeImageBrightness = (imageUrl: string, callback: (brightness: number) => void) => {
    const img = new Image();
    // Try with CORS first
    img.crossOrigin = 'anonymous';
    
    const handleLoad = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(0.5);
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let brightness = 0;
        let count = 0;
        
        // Sample pixels (every 400th pixel for performance)
        for (let i = 0; i < data.length; i += 400) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Calculate relative luminance (perceived brightness)
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          brightness += luminance;
          count++;
        }
        
        const avgBrightness = count > 0 ? brightness / count : 0.5;
        callback(avgBrightness);
      } catch (e) {
        // CORS error - use fallback
        handleCorsError();
      }
    };
    
    const handleCorsError = () => {
      // Fallback: Estimate brightness based on URL/image properties
      // Since we're using dimmed/blurred images, default to darker
      callback(0.4);
    };
    
    img.onload = handleLoad;
    img.onerror = () => callback(0.5); // Default on error
    img.src = imageUrl;
  };

  // Update brightness when image changes
  useEffect(() => {
    analyzeImageBrightness(propertyImages[currentImageIndex], (brightness) => {
      setImageBrightness(brightness);
    });
  }, [currentImageIndex, propertyImages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % propertyImages.length);
    }, 15000); // 15 seconds per image

    return () => clearInterval(interval);
  }, [propertyImages.length]);

  // Calculate text contrast based on image brightness and theme
  const getTextContrastClass = (baseClass: string = '') => {
    // Consider effective brightness (image + overlay dimming + theme)
    // With black/40 overlay and 0.5 brightness filter, images are quite dark
    // Account for dimming: 0.5 brightness filter + 40% dark overlay = ~0.25-0.3 effective brightness
    const effectiveBrightness = imageBrightness * 0.35; // Account for dimming/blur filters
    
    // Determine text color based on effective brightness and theme
    // Brighter images (even after dimming) = use darker text for contrast
    // Darker images = use lighter text for contrast
    let textClass = '';
    
    if (effectiveBrightness > 0.45) {
      // Bright image after dimming - use dark text
      textClass = isDarkTheme ? 'text-slate-100' : 'text-slate-900';
      return `${baseClass} ${textClass} drop-shadow-lg`;
    } else if (effectiveBrightness > 0.3) {
      // Medium brightness - use theme-appropriate with enhanced contrast
      textClass = isDarkTheme ? 'text-slate-100' : 'text-slate-800';
      return `${baseClass} ${textClass} drop-shadow-md`;
    } else {
      // Dark image - use light text for maximum contrast
      textClass = 'text-white';
      return `${baseClass} ${textClass} drop-shadow-lg`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (otpRequired) {
        const verifyResponse = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ code: otpCode }),
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          setError(verifyData.error || "Invalid OTP");
          return;
        }
        setIsAuthenticated(true);
        if (verifyData.user?.username) {
          setCurrentUsername(verifyData.user.username);
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password, rememberMe, loginType }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.otpRequired) {
          setOtpRequired(true);
          setOtpCode("");
          setOtpCooldown(data.retryAfter || 60);
          return;
        }
        setIsAuthenticated(true);
        if (data.user?.username) {
          setCurrentUsername(data.user.username);
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        if (data.retryAfter || data.error === "OTP recently sent") {
          setOtpRequired(true);
          setOtpCode("");
          setOtpCooldown(data.retryAfter || 60);
          return;
        }
        setError(data.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Failed to connect to server. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to resend OTP.");
        if (data.retryAfter) {
          setOtpCooldown(data.retryAfter);
        }
        return;
      }
      setOtpCooldown(data.retryAfter || 60);
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenants for clients view
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tenants");
      return await response.json();
    },
    enabled: showClientsDialog && isAuthenticated,
  });

  // Fetch enquiries
  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ["/api/enquiries"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/enquiries");
      return await response.json();
    },
    enabled: !hideEnquiries && showEnquiriesDialog && isAuthenticated,
  });

  // Filter tenants based on search term
  const filteredTenants = Array.isArray(tenants) ? tenants.filter((tenant: any) => {
    if (!clientSearchTerm) return true;
    const searchLower = clientSearchTerm.toLowerCase();
    return (
      tenant.fullName?.toLowerCase().includes(searchLower) ||
      tenant.email?.toLowerCase().includes(searchLower) ||
      tenant.phone?.includes(searchLower)
    );
  }) : [];

  const handleQuickActionClick = (action: 'clients' | 'enquiries' | 'agents') => {
    if (!isAuthenticated) {
      // Shake animation for unauthorized access
      setShakeQuickAction(action);
      setTimeout(() => setShakeQuickAction(null), 500);
      return;
    }
    if (action === 'enquiries' && hideEnquiries) {
      return;
    }
    
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (action === 'clients') {
      // Navigate to clients page - use path-based routing under admin subdomain
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.location.href = '/clients';
      } else {
        const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries|tenant|tenants)\./, '');
        window.location.href = `${protocol}//${portalSubdomain}.${rootDomain}/clients`;
      }
    } else if (action === 'agents') {
      // Navigate to agents page - admin-only
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.location.href = '/agents';
      } else {
        const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries|tenant|tenants)\./, '');
        window.location.href = `${protocol}//admin.${rootDomain}/agents`;
      }
    } else {
      // Navigate to enquiries page - use path-based routing under admin subdomain
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.location.href = '/enquiries';
      } else {
        const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries|tenant|tenants)\./, '');
        window.location.href = `${protocol}//admin.${rootDomain}/enquiries`;
      }
    }
  };

  const handleProceedToSystem = () => {
    console.log('handleProceedToSystem called');
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    // Navigate to admin portal
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log(`Navigating to ${portalPath} (localhost)`);
      window.location.href = portalPath;
    } else {
      // Remove any existing subdomain and use admin subdomain
      const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries|tenant|tenants)\./, '');
      const portalUrl = `${protocol}//${portalSubdomain}.${rootDomain}`;
      console.log('Navigating to', portalUrl);
      window.location.href = portalUrl;
    }
  };

  // Add useEffect to test if button is in DOM and clickable
  useEffect(() => {
    if (isAuthenticated) {
      const testButton = () => {
        // Find button by text content (querySelector doesn't support :contains)
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(btn => 
          btn.textContent?.includes('Proceed to System Dashboard')
        );
        if (button) {
          console.log('✅ Button found in DOM:', button);
          console.log('Button z-index:', window.getComputedStyle(button as Element).zIndex);
          console.log('Button pointer-events:', window.getComputedStyle(button as Element).pointerEvents);
          
          // Test if we can programmatically click it
          (button as HTMLButtonElement).addEventListener('click', () => {
            console.log('✅ Button click event listener fired!');
          }, { once: true });
        } else {
          console.log('❌ Button not found in DOM');
        }
      };
      setTimeout(testButton, 100);
    }
  }, [isAuthenticated]);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setIsAuthenticated(true);
            setCurrentUsername(data.user.username || "");
          }
        }
      } catch (error) {
        // Silently fail - user is not authenticated
        console.log("Auth check failed:", error);
      }
    };
    
    checkAuth();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setIsAuthenticated(false);
      setCurrentUsername("");
      setShowSuccess(false);
      setShowClientsDialog(false);
      setShowEnquiriesDialog(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh/var(--ui-zoom))] h-[calc(100vh/var(--ui-zoom))] flex flex-col relative overflow-hidden" style={{ pointerEvents: 'auto' }}>
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Luxury Properties Background Slideshow */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Background Image - Using img tag for better control */}
            <img
              key={`property-${currentImageIndex}`}
              src={propertyImages[currentImageIndex]}
              alt={`Luxury Property ${currentImageIndex + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ 
                filter: 'brightness(0.5) contrast(0.9) saturate(0.8) blur(2px)',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0,
              }}
              onLoad={(e) => {
                console.log(`✅ Property image ${currentImageIndex + 1} loaded:`, propertyImages[currentImageIndex]);
                // Analyze brightness when image loads
                analyzeImageBrightness(propertyImages[currentImageIndex], (brightness) => {
                  setImageBrightness(brightness);
                });
              }}
              onError={(e) => {
                console.warn(`⚠️ Property image ${currentImageIndex + 1} failed:`, propertyImages[currentImageIndex]);
                const img = e.target as HTMLImageElement;
                const nextIndex = (currentImageIndex + 1) % propertyImages.length;
                if (nextIndex !== currentImageIndex) {
                  img.src = propertyImages[nextIndex];
                }
              }}
            />
            
            {/* Dimmed overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40 dark:bg-black/50" style={{ zIndex: 1 }} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-200/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Content Container - Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 p-6 lg:p-12 relative z-[2]" style={{ pointerEvents: 'auto' }}>
        {/* Left Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md lg:max-w-lg"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
        >
          <Card className={loginCardClassName} style={{ pointerEvents: 'auto', position: 'relative', zIndex: 11 }}>
            <CardHeader className="text-center space-y-6 pb-8" style={{ pointerEvents: 'auto' }}>
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                className="flex justify-center"
              >
                <img
                  src="/leasemaster-logo.png"
                  alt="LeaseMaster"
                  className="logo-login"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <CardDescription className={`text-xl mt-3 ${getTextContrastClass()}`}>
                  {resolvedPortalLabel} Login
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent className="space-y-6" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 12 }}>
              {!isAuthenticated ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {!otpRequired ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="username" className={`text-base ${getTextContrastClass()}`}>Username</Label>
                        <div className="relative">
                          <Input
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                            className="h-12 text-base pl-4 pr-11"
                          />
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="password" className={`text-base ${getTextContrastClass()}`}>Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="h-12 text-base pl-4 pr-20"
                          />
                          <Lock className="absolute right-12 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="space-y-3"
                    >
                      <Label htmlFor="otp" className={`text-base ${getTextContrastClass()}`}>OTP Code</Label>
                      <div className="relative">
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter the 6-digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          required
                          disabled={loading}
                          className="h-12 text-base pl-4 pr-11"
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className={getTextContrastClass()}>OTP valid for 5 minutes.</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResendOtp}
                          disabled={loading || otpCooldown > 0}
                        >
                          {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label
                        htmlFor="rememberMe"
                        className={`text-sm cursor-pointer ${getTextContrastClass()}`}
                      >
                        Remember me for 30 days
                      </Label>
                    </div>
                    {showForgotPassword && (
                      <button
                        type="button"
                        onClick={() => setIsResetDialogOpen(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 text-base gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-5 w-5 animated-login-arrow" />
                          <span>]</span>
                          <span style={{ marginLeft: '8px' }}>Login</span>
                        </>
                      )}
                    </Button>
                  </motion.div>

                  {showBecomeAgent && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.65 }}
                      className="text-center"
                    >
                      <p className="text-sm text-foreground/80">
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setLocation(becomeAgentPath || "/register")}
                          className="text-primary hover:underline font-medium"
                        >
                          Become an agent with us
                        </button>
                      </p>
                    </motion.div>
                  )}
                  {showForgotPassword && (
                    <ResetPasswordDialog
                      isOpen={isResetDialogOpen}
                      onOpenChange={setIsResetDialogOpen}
                      accountType="agent"
                      token={resetToken}
                      loginPath="/agent/login"
                    />
                  )}
                </form>
                ) : (
                <div 
                  className="space-y-4" 
                  style={{ 
                    pointerEvents: 'auto', 
                    position: 'relative', 
                    zIndex: 10000,
                    isolation: 'isolate'
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', zIndex: 99999 }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleProceedToSystem();
                      }}
                      type="button"
                      className="w-full h-16 text-lg gap-2 cursor-pointer flex items-center justify-center bg-primary text-primary-foreground rounded-md px-4 hover:opacity-90 transition-opacity"
                      style={{ 
                        position: 'relative', 
                        zIndex: 99999, 
                        pointerEvents: 'auto', 
                        cursor: 'pointer',
                        userSelect: 'none',
                        border: 'none',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                      }}
                    >
                      <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Proceed to System Dashboard
                        <ArrowRight className="h-5 w-5 animated-arrow-right" />
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Side - Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-md lg:max-w-lg space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-4"
          >
            <h3 className={`text-2xl font-semibold text-center mb-6 ${getTextContrastClass()}`}>
              Quick Actions
            </h3>

            {/* Welcome and Logout Section */}
            {isAuthenticated && currentUsername && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mb-4 pb-4 border-b border-slate-200/50 dark:border-slate-700/50"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${getTextContrastClass()}`}>
                    Welcome, {currentUsername}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <span>Logout</span>
                    <ArrowLeft className="h-4 w-4 animated-arrow-left" />
                  </Button>
                </div>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.div
                animate={shakeQuickAction === 'clients' ? {
                  x: [0, -10, 10, -10, 10, 0],
                  rotate: [0, -5, 5, -5, 5, 0]
                } : {}}
                transition={{ duration: 0.5 }}
                onClick={() => handleQuickActionClick(loginType === "agent" ? "clients" : "agents")}
                className="cursor-pointer"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className={`w-full h-16 text-lg gap-3 border-2 hover:border-primary/50 hover:bg-primary/5 backdrop-blur-sm bg-background/20 dark:bg-background/20 transition-all ${!isAuthenticated ? 'opacity-60' : ''}`}
                >
                  <AnimatedEye />
                  <span className="font-medium">{loginType === "agent" ? "View Clients" : "View Agents"}</span>
                  {!isAuthenticated && (
                    <Badge variant="destructive" className="ml-auto">
                      Login Required
                    </Badge>
                  )}
                </Button>
              </motion.div>
              {!isAuthenticated && shakeQuickAction === 'clients' && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 text-center mt-2"
                >
                  ⚠️ You need to login to access this feature
                </motion.p>
              )}
            </motion.div>

            {!hideEnquiries && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <motion.div
                  animate={shakeQuickAction === 'enquiries' ? {
                    x: [0, -10, 10, -10, 10, 0],
                    rotate: [0, -5, 5, -5, 5, 0]
                  } : {}}
                  transition={{ duration: 0.5 }}
                  onClick={() => handleQuickActionClick('enquiries')}
                  className="cursor-pointer"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={`w-full h-16 text-lg gap-3 border-2 hover:border-primary/50 hover:bg-primary/5 backdrop-blur-sm bg-background/20 dark:bg-background/20 transition-all ${!isAuthenticated ? 'opacity-60' : ''}`}
                  >
                    <AnimatedBook />
                    <span className="font-medium">Enquiries</span>
                    {Array.isArray(enquiries) && enquiries.length > 0 && isAuthenticated && (
                      <Badge variant="default" className="ml-auto">
                        {enquiries.length}
                      </Badge>
                    )}
                    {!isAuthenticated && (
                      <Badge variant="destructive" className="ml-auto">
                        Login Required
                      </Badge>
                    )}
                  </Button>
                </motion.div>
                {!isAuthenticated && shakeQuickAction === 'enquiries' && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 text-center mt-2"
                  >
                    ⚠️ You need to login to access this feature
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Back to Homepage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="pt-8 border-t border-slate-200/50 dark:border-slate-700/50"
            >
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className={`w-full h-14 text-base gap-3 ${getTextContrastClass()}`}
                onClick={() => {
                  const hostname = window.location.hostname;
                  const protocol = window.location.protocol;
                  if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    setLocation('/');
                  } else {
                    // Production: always redirect to root domain (theleasemaster.com)
                    const rootDomain = hostname.replace(/^(www|admin|agents|portal|clients|enquiries|tenant|tenants)\./, '');
                    window.location.href = `${protocol}//${rootDomain}/`;
                  }
                }}
              >
                <ArrowLeft className="h-5 w-5 animated-arrow-left" />
                <span className="font-medium">Homepage</span>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Success Animation with Thumbs Up */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            style={{ pointerEvents: showSuccess ? 'auto' : 'none' }}
            onClick={() => setShowSuccess(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="bg-background border-2 rounded-lg p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center mb-4"
              >
                <ThumbsUp className="h-16 w-16 text-green-500" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-center mb-2"
              >
                Authentication Successful!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground text-center"
              >
                Welcome back! You can now access all features.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Clients Dialog */}
      <Dialog open={showClientsDialog} onOpenChange={setShowClientsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              View Clients
            </DialogTitle>
            <DialogDescription>
              Browse and search through all registered clients
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex-1 overflow-auto">
              {tenantsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredTenants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Property</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.map((tenant: any) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.fullName || 'N/A'}</TableCell>
                        <TableCell>{tenant.email || 'N/A'}</TableCell>
                        <TableCell>{tenant.phone || 'N/A'}</TableCell>
                        <TableCell>{tenant.propertyName || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {clientSearchTerm ? 'No clients found matching your search' : 'No clients found'}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enquiries Dialog */}
      {!hideEnquiries && (
        <Dialog open={showEnquiriesDialog} onOpenChange={setShowEnquiriesDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Enquiries Inbox
              </DialogTitle>
              <DialogDescription>
                View and manage all property enquiries
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              {enquiriesLoading ? (
                <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : Array.isArray(enquiries) && enquiries.length > 0 ? (
              <div className="space-y-4">
                {enquiries.map((enquiry: any) => (
                  <Card key={enquiry.id} className="border">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{enquiry.name}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {enquiry.email}
                            </span>
                            {enquiry.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {enquiry.phone}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        {enquiry.createdAt && (
                          <Badge variant="outline">
                            {new Date(enquiry.createdAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {enquiry.message && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{enquiry.message}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No enquiries found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}

    </div>
  );
}

