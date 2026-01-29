import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2,
  Users,
  Receipt, 
  MessageSquare, 
  BarChart3, 
  Shield,
  CheckCircle,
  CheckCircle2,
  ArrowRight,
  Play,
  LogIn,
  Sparkles,
  Mail,
  Phone,
  User,
  Send,
  Clock,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import "@/components/animated-icons.css";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { BackToTop } from "@/components/back-to-top";
import { Facebook, Twitter, Linkedin, Instagram, Globe as GlobeIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Landing() {
  const [, setLocation] = useLocation();
  const [isPortal, setIsPortal] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check authentication status for dynamic admin icon
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/check");
      return await response.json();
    },
  });
  const isAuthenticated = authData?.authenticated || false;
  const currentUser = authData?.user || null;
  const isAdminUser = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
  const isClientUser = currentUser && currentUser.role === 'client';
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const { toast } = useToast();
  const logoControls = useAnimation();
  const wordControls = useAnimation();
  const [activeWord, setActiveWord] = useState<string | null>(null);
  
  // Property images for background slideshow (same as login page)
  const propertyImages = [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80',
  ];

  useEffect(() => {
    let cancelled = false;
    const words = ["Your", "No. 1", "Trusted", "Solution"];

    const runSequence = async () => {
      while (!cancelled) {
        setActiveWord(null);
        logoControls.set({
          x: -80,
          opacity: 0,
          filter: "blur(12px)",
          rotate: 0,
          scale: 1,
        });
        await logoControls.start({
          x: 0,
          opacity: 1,
          filter: "blur(0px)",
          rotate: 0,
          scale: 1,
          transition: { duration: 0.6, ease: "easeOut" },
        });
        await logoControls.start({
          x: 0,
          y: [0, -2, 2, 0],
          rotate: [0, -2, 2, 0],
          scale: [1, 1.03, 1, 1.02],
          transition: { duration: 20, ease: "easeInOut" },
        });
        await logoControls.start({
          x: 120,
          opacity: 0,
          filter: "blur(10px)",
          transition: { duration: 0.5, ease: "easeInOut" },
        });

        for (const word of words) {
          if (cancelled) break;
          setActiveWord(word);
          wordControls.set({
            y: 12,
            opacity: 0,
            filter: "blur(10px)",
          });
          await wordControls.start({
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            transition: { duration: 0.4, ease: "easeOut" },
          });
          await wordControls.start({
            opacity: 1,
            transition: { duration: 1.1 },
          });
          await wordControls.start({
            y: -12,
            opacity: 0,
            filter: "blur(8px)",
            transition: { duration: 0.35, ease: "easeInOut" },
          });
        }
      }
    };

    runSequence();
    return () => {
      cancelled = true;
    };
  }, [logoControls, wordControls]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const [imageBrightness, setImageBrightness] = useState<number>(0.5);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    // Check if we're on portal subdomain (not root domain)
    const hostname = window.location.hostname;
    setIsPortal(hostname.includes('portal'));
  }, []);

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

  // Update brightness when image changes
  useEffect(() => {
    analyzeImageBrightness(propertyImages[currentImageIndex], (brightness) => {
      setImageBrightness(brightness);
    });
  }, [currentImageIndex, propertyImages]);

  // Image slideshow interval
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % propertyImages.length);
    }, 15000); // 15 seconds per image

    return () => clearInterval(interval);
  }, [propertyImages.length]);

  // Calculate text contrast based on image brightness and theme
  const getTextContrastClass = (baseClass: string = '') => {
    const effectiveBrightness = imageBrightness * 0.35; // Account for dimming/blur filters
    
    let textClass = '';
    
    if (effectiveBrightness > 0.45) {
      textClass = isDarkTheme ? 'text-slate-100' : 'text-slate-900';
      return `${baseClass} ${textClass} drop-shadow-lg`;
    } else if (effectiveBrightness > 0.3) {
      textClass = isDarkTheme ? 'text-slate-100' : 'text-slate-800';
      return `${baseClass} ${textClass} drop-shadow-md`;
    } else {
      textClass = 'text-white';
      return `${baseClass} ${textClass} drop-shadow-lg`;
    }
  };

  const getButtonContrastClass = () => {
    const effectiveBrightness = imageBrightness * 0.35;
    if (effectiveBrightness > 0.45) {
      return "text-slate-900 border-slate-900/30 hover:bg-slate-900/10";
    }
    if (effectiveBrightness > 0.3) {
      return isDarkTheme ? "text-slate-100 border-white/30 hover:bg-white/10" : "text-slate-900 border-slate-900/30 hover:bg-slate-900/10";
    }
    return "text-white border-white/40 hover:bg-white/10";
  };

  const handleTryDemo = () => {
    // TODO: Implement demo logic
    alert("Demo feature coming soon!");
  };

  const handleClientLogin = () => {
    // Client login - navigate to portal login
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development - go to /portal/login
      setLocation('/portal/login');
    } else {
      // Production - redirect to portal subdomain
      window.location.href = `${protocol}//portal.${hostname}/login`;
    }
  };

  const handleAdminLogin = () => {
    // Admin login - navigate to admin login
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development - go to /admin/login
      setLocation('/admin/login');
    } else {
      // Production - redirect to admin subdomain (strip any existing subdomain first)
      const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
      window.location.href = `${protocol}//admin.${rootDomain}/login`;
    }
  };

  const handleTenantLogin = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setLocation("/tenant/login");
    } else {
      window.location.href = `${protocol}//${hostname}/tenant/login`;
    }
  };

  const features = [
    {
      icon: Building2,
      title: "Property Management",
      description: "Manage multiple properties, units, and house types with ease"
    },
    {
      icon: Users,
      title: "Tenant Management",
      description: "Complete tenant profiles, lease tracking, and communication"
    },
    {
      icon: Receipt,
      title: "Automated Invoicing",
      description: "Bulk and single invoicing with water unit tracking"
    },
    {
      icon: MessageSquare,
      title: "SMS & Email",
      description: "Send notifications and reminders to tenants instantly"
    },
    {
      icon: BarChart3,
      title: "Financial Reports",
      description: "Comprehensive reports and payment tracking"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security for your property data"
    }
  ];

  const benefits = [
    "Streamline rent collection",
    "Automate invoice generation",
    "Track payments in real-time",
    "Manage multiple properties",
    "Send bulk SMS notifications",
    "Generate financial reports"
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
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
            {/* Background Image */}
            <img
              key={`property-${currentImageIndex}`}
              src={propertyImages[currentImageIndex]}
              alt={`Luxury Property ${currentImageIndex + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
              loading={currentImageIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              style={{ 
                filter: 'brightness(0.5) contrast(0.9) saturate(0.8) blur(2px)',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0,
              }}
              onLoad={(e) => {
                analyzeImageBrightness(propertyImages[currentImageIndex], (brightness) => {
                  setImageBrightness(brightness);
                });
              }}
              onError={(e) => {
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

      {/* Navigation */}
      <nav className="relative z-[2] container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 flex-1"
          >
            <div className="relative flex items-center">
              <motion.img
                src="/leasemaster-logo.png"
                alt="LeaseMaster"
                className="logo-landing"
                initial={{ x: -80, opacity: 0, filter: "blur(12px)" }}
                animate={logoControls}
              />
              <motion.span
                className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-normal tracking-[0.08em]"
                style={{
                  fontFamily: "Montserrat, Inter, sans-serif",
                  color: activeWord === "No. 1" ? "#48C6EF" : "#1A2B45",
                }}
                initial={{ y: 12, opacity: 0, filter: "blur(10px)" }}
                animate={wordControls}
                aria-hidden={!activeWord}
              >
                {activeWord || ""}
              </motion.span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex items-center gap-6 justify-center flex-1 whitespace-nowrap"
          >
            <button 
              onClick={() => setShowSubscriptionPopup(true)}
              className={`px-3 py-2 rounded-md hover:bg-background/20 transition-colors ${getTextContrastClass()}`}
            >
              Pricing
            </button>
            <button 
              onClick={() => {
                const aboutSection = document.getElementById('about');
                if (aboutSection) {
                  aboutSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.location.href = '/about';
                }
              }}
              className={`px-3 py-2 rounded-md hover:bg-background/20 transition-colors ${getTextContrastClass()}`}
            >
              About Us
            </button>
            <button 
              onClick={() => setShowContactPopup(true)}
              className={`px-3 py-2 rounded-md hover:bg-background/20 transition-colors ${getTextContrastClass()}`}
            >
              Contact
            </button>
            <button 
              onClick={() => setLocation('/register')}
              className={`px-3 py-2 rounded-md hover:bg-background/20 transition-colors ${getTextContrastClass()}`}
            >
              Register with us
            </button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4 flex-1 justify-end"
          >
            <ThemeToggle />
            <Button onClick={handleAdminLogin} variant="outline" className="gap-2 hidden md:inline-flex">
              <ArrowRight className="h-4 w-4 animated-login-arrow" />
              <span style={{ marginLeft: '2px' }}>]</span>
            </Button>
            
            {/* Mobile Menu Button - Visible on mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-md hover:bg-background/20 transition-colors ${getTextContrastClass()}`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </motion.div>
        </div>
        
        {/* Mobile Menu - Below logo, collapsible */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden overflow-y-auto max-h-[calc(100vh-120px)]"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                exit={{ y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-1 pt-2 pb-2"
              >
                <button 
                  onClick={() => {
                    setShowSubscriptionPopup(true);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-md hover:bg-background/20 transition-colors text-left ${getTextContrastClass()}`}
                >
                  Pricing
                </button>
                <button 
                  onClick={() => {
                    const aboutSection = document.getElementById('about');
                    if (aboutSection) {
                      aboutSection.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      window.location.href = '/about';
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-md hover:bg-background/20 transition-colors text-left ${getTextContrastClass()}`}
                >
                  About Us
                </button>
                <button 
                  onClick={() => {
                    setShowContactPopup(true);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-md hover:bg-background/20 transition-colors text-left ${getTextContrastClass()}`}
                >
                  Contact
                </button>
                <button 
                  onClick={() => {
                    setLocation('/register');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-md hover:bg-background/20 transition-colors text-left ${getTextContrastClass()}`}
                >
                  Register with us
                </button>

                {/* Admin Login Icon - Dynamic (show if not authenticated OR admin user) */}
                {(!isAuthenticated || isAdminUser) && (
                  <button
                    onClick={() => {
                      handleAdminLogin();
                      setMobileMenuOpen(false);
                    }}
                    className={`px-4 py-2 rounded-md hover:bg-background/20 transition-colors text-left flex items-center gap-2 ${getTextContrastClass()}`}
                    aria-label="Admin Login"
                  >
                    <ArrowRight className="h-5 w-5 animated-login-arrow" />
                    <span>]</span>
                  </button>
                )}
                
                {/* Divider */}
                <div className="border-t border-background/20 my-1"></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative z-[2] container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Professional Property Management</span>
            </motion.div>
            
            <h1 className={`text-5xl md:text-7xl font-bold mb-6 ${getTextContrastClass()}`}>
              Manage Your Properties
              <br />
              <span className="text-blue-500 dark:text-blue-300">Like a Pro</span>
            </h1>
            
            <p className={`text-xl md:text-2xl mb-8 max-w-2xl mx-auto ${getTextContrastClass()}`}>
              Comprehensive rent management system with automated invoicing, 
              payment tracking, and tenant communication all in one place.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap"
            >
              <Button 
                size="lg" 
                className={`text-sm px-5 py-3 gap-2 group border-2 ${getButtonContrastClass()}`}
                onClick={handleTryDemo}
              >
                <Play className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                Try Demo
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className={`text-sm px-5 py-3 gap-2 group border-2 ${getButtonContrastClass()}`}
                onClick={handleClientLogin}
              >
                <ArrowRight className="h-5 w-5 animated-login-arrow" />
                <span style={{ marginLeft: '2px' }}>]</span>
                <span style={{ marginLeft: '8px' }}>Sign In</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={`text-sm px-5 py-3 gap-2 border-2 ${getButtonContrastClass()}`}
                onClick={handleTenantLogin}
              >
                <User className="h-5 w-5" />
                Login as Tenant
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* Features Grid */}
      <section className="relative z-[2] container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${getTextContrastClass()}`}>
            Everything You Need
          </h2>
          <p className={`text-xl ${getTextContrastClass()}`}>
            Powerful features to streamline your property management
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-2 hover:border-primary/50 backdrop-blur-lg bg-background/25 dark:bg-background/25">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                          {feature.title}
                        </h3>
                        <p className={getTextContrastClass()}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-[2] container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardContent className="p-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8"
              >
                <h2 className={`text-4xl font-bold mb-4 ${getTextContrastClass()}`}>
                  Why Choose LeaseMaster?
                </h2>
                <p className={`text-xl ${getTextContrastClass()}`}>
                  Join property managers who trust LeaseMaster
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className={`text-lg ${getTextContrastClass()}`}>
                      {benefit}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-8 text-center"
              >
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 gap-2"
                  onClick={handleClientLogin}
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enquiry Form Section */}
      <section className="relative z-[2] container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardHeader className="text-center">
              <CardTitle className={`text-4xl font-bold mb-2 ${getTextContrastClass()}`}>
                Make an Enquiry
              </CardTitle>
              <CardDescription className={`text-lg ${getTextContrastClass()}`}>
                Get in touch with us for more information about LeaseMaster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmittingEnquiry(true);
                  try {
                    const response = await fetch("/api/enquiries", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(enquiryForm),
                    });
                    
                    if (response.ok) {
                      toast({
                        title: "Enquiry Submitted",
                        description: "Thank you! We'll get back to you soon.",
                      });
                      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
                    } else {
                      throw new Error("Failed to submit enquiry");
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to submit enquiry. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setSubmittingEnquiry(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="enquiry-name" className={getTextContrastClass()}>
                      <User className="h-4 w-4 inline mr-2" />
                      Full Name
                    </Label>
                    <Input
                      id="enquiry-name"
                      placeholder="John Doe"
                      value={enquiryForm.name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                      required
                      className="h-12"
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="enquiry-email" className={getTextContrastClass()}>
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address
                    </Label>
                    <Input
                      id="enquiry-email"
                      type="email"
                      placeholder="john@example.com"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      required
                      className="h-12"
                    />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="enquiry-phone" className={getTextContrastClass()}>
                    <Phone className="h-4 w-4 inline mr-2" />
                    Phone Number
                  </Label>
                  <Input
                    id="enquiry-phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    className="h-12"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="enquiry-message" className={getTextContrastClass()}>
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    Message
                  </Label>
                  <Textarea
                    id="enquiry-message"
                    placeholder="Tell us about your property management needs..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    required
                    rows={5}
                    className="resize-none"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="pt-4"
                >
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-lg gap-2"
                    disabled={submittingEnquiry}
                  >
                    {submittingEnquiry ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Send className="h-5 w-5" />
                        </motion.div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Submit Enquiry
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Contact Us Section */}
      <section className="relative z-[2] container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardHeader className="text-center">
              <CardTitle className={`text-4xl font-bold mb-2 ${getTextContrastClass()}`}>
                Contact Us
              </CardTitle>
              <CardDescription className={`text-lg ${getTextContrastClass()}`}>
                Get in touch with our team for support and inquiries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                      Email
                    </h3>
                    <a
                      href="mailto:info@theleasemaster.com"
                      className={`text-lg hover:text-primary transition-colors ${getTextContrastClass()}`}
                    >
                      info@theleasemaster.com
                    </a>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex items-start gap-4"
                >
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                      Phone
                    </h3>
                    <a
                      href="tel:+254790213018"
                      className={`text-lg hover:text-primary transition-colors ${getTextContrastClass()}`}
                    >
                      +254 790 213 018
                    </a>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-[2] container mx-auto px-4 py-12 border-t border-white/20 dark:border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className={`text-xl font-semibold mb-4 ${getTextContrastClass()}`}>
                About LeaseMaster
              </h3>
              <p className={`text-sm leading-relaxed ${getTextContrastClass()}`}>
                Africa's Most Trusted Property Management System. Streamlining property operations 
                across the continent with innovative technology and local expertise.
              </p>
            </motion.div>

            {/* Connect Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className={`text-xl font-semibold mb-4 ${getTextContrastClass()}`}>
                Connect With Us
              </h3>
              <div className="flex gap-4">
                <a
                  href="https://facebook.com/theleasemaster"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors ${getTextContrastClass()} hover:text-primary`}
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com/theleasemaster"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors ${getTextContrastClass()} hover:text-primary`}
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://linkedin.com/company/theleasemaster"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors ${getTextContrastClass()} hover:text-primary`}
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/theleasemaster"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors ${getTextContrastClass()} hover:text-primary`}
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
              <div className={`mt-4 space-y-2 text-sm ${getTextContrastClass()}`}>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:info@theleasemaster.com" className="hover:text-primary transition-colors">
                    info@theleasemaster.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+254790213018" className="hover:text-primary transition-colors">
                    +254 790 213 018
                  </a>
                </div>
              </div>
            </motion.div>

            {/* About Us */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className={`text-xl font-semibold mb-4 ${getTextContrastClass()}`}>
                About Us
              </h3>
              <p className={`text-sm leading-relaxed ${getTextContrastClass()}`}>
                Learn more about LeaseMaster and our mission to revolutionize property management in Africa.
              </p>
              <Button
                variant="ghost"
                onClick={() => setLocation("/about")}
                className={`mt-4 ${getTextContrastClass()} hover:text-primary`}
              >
                Read More
              </Button>
            </motion.div>
          </div>

          {/* Copyright */}
          <div className={`text-center pt-8 border-t border-white/10 ${getTextContrastClass()}`}>
            <p className="text-sm">
            © {new Date().getFullYear()} LeaseMaster. All rights reserved.
          </p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <BackToTop />

      {/* Contact Popup Dialog */}
      <Dialog open={showContactPopup} onOpenChange={setShowContactPopup}>
        <DialogContent className="sm:max-w-[500px] bg-slate-800 dark:bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Contact Us</DialogTitle>
            <DialogDescription className="text-slate-300">
              Get in touch with our team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-600/20 text-blue-400">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Email</h3>
                <a
                  href="mailto:info@theleasemaster.com"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  info@theleasemaster.com
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-600/20 text-green-400">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Phone</h3>
                <a
                  href="tel:+254700000000"
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  +254 700 000 000
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-600/20 text-purple-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Working Hours</h3>
                <p className="text-slate-300">24/7 Available</p>
                <p className="text-sm text-slate-400">We're always here to help you</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Popup Dialog */}
      <Dialog open={showSubscriptionPopup} onOpenChange={setShowSubscriptionPopup}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-800 dark:bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Pricing Plans</DialogTitle>
            <DialogDescription className="text-slate-300">
              Choose the plan that scales with your property portfolio. No hidden fees.
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {/* Starter Plan */}
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-white">
                  Starter
                </h3>
                <p className="text-3xl font-bold mb-4 text-primary">
                  $50
                </p>
                <p className="text-sm mb-6 text-slate-300">
                  per month
                </p>
                <p className="text-sm mb-6 font-semibold text-slate-300">
                  Up to 10 properties
                </p>
                <ul className="space-y-3 mb-8 text-slate-300">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Basic property management</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Tenant database</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Rent tracking</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan - Most Popular */}
            <Card className="border-2 border-primary backdrop-blur-lg bg-background/25 dark:bg-background/25 relative">
              <div className="absolute -top-3 right-6">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-white">
                  Professional
                </h3>
                <p className="text-3xl font-bold mb-4 text-primary">
                  $100
                </p>
                <p className="text-sm mb-6 text-slate-300">
                  per month
                </p>
                <p className="text-sm mb-6 font-semibold text-slate-300">
                  Up to 50 properties
                </p>
                <ul className="space-y-3 mb-8 text-slate-300">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Advanced reporting</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Maintenance management</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Tenant portal</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Document storage</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-white">
                  Enterprise
                </h3>
                <p className="text-3xl font-bold mb-4 text-primary">
                  Custom
                </p>
                <p className="text-sm mb-6 text-slate-300">
                  pricing
                </p>
                <p className="text-sm mb-6 font-semibold text-slate-300">
                  Unlimited properties
                </p>
                <ul className="space-y-3 mb-8 text-slate-300">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Multi-user access</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>White-label option</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>24/7 support</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

