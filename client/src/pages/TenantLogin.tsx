import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, KeyRound, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import "@/components/animated-icons.css";

export function TenantLogin() {
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!otpCooldown) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

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
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607688969-a5fcd26a57d2?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1920&h=1080&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1920&h=1080&fit=crop&q=80',
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const [imageBrightness, setImageBrightness] = useState<number>(0.5);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

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

  const analyzeImageBrightness = (imageUrl: string, callback: (brightness: number) => void) => {
    const img = new Image();
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

        for (let i = 0; i < data.length; i += 400) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          brightness += luminance;
          count++;
        }

        const avgBrightness = count > 0 ? brightness / count : 0.5;
        callback(avgBrightness);
      } catch (e) {
        callback(0.4);
      }
    };

    img.onload = handleLoad;
    img.onerror = () => callback(0.5);
    img.src = imageUrl;
  };

  useEffect(() => {
    analyzeImageBrightness(propertyImages[currentImageIndex], (brightness) => {
      setImageBrightness(brightness);
    });
  }, [currentImageIndex, propertyImages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % propertyImages.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [propertyImages.length]);

  const getTextContrastClass = (baseClass: string = '') => {
    const effectiveBrightness = imageBrightness * 0.35;
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpRequired && (!identifier.trim() || !accessCode.trim())) {
      toast({
        title: "Missing details",
        description: "Please enter your email/phone and access code.",
        variant: "destructive",
      });
      return;
    }
    if (otpRequired && !otpCode.trim()) {
      toast({
        title: "Missing OTP",
        description: "Please enter the OTP code sent to you.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
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
          throw new Error(verifyData.error || "Invalid OTP");
        }
        setLocation("/tenant-portal");
        return;
      }

      const response = await fetch("/api/auth/tenant-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ identifier, accessCode }),
      });
      const data = await response.json();
      if (response.status === 429) {
        setOtpRequired(true);
        setOtpCode("");
        setOtpCooldown(Math.min(60, data.retryAfter || 60));
        toast({
          title: "OTP recently sent",
          description: "Please enter the OTP or wait to resend.",
        });
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Unable to authenticate tenant login.");
      }
      if (data.otpRequired) {
        setOtpRequired(true);
        setOtpCode("");
        setOtpCooldown(Math.min(60, data.retryAfter || 60));
        return;
      }
      setLocation("/tenant-portal");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.message || "Unable to authenticate tenant login.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
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
        throw new Error(data.error || "Unable to resend OTP.");
      }
      if (data.retryAfter) {
        setOtpCooldown(Math.min(60, data.retryAfter));
      }
    } catch (error: any) {
      toast({
        title: "Resend failed",
        description: error?.message || "Unable to resend OTP.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ pointerEvents: 'auto' }}>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

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
              onLoad={() => {
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
            <div className="absolute inset-0 bg-black/40 dark:bg-black/50" style={{ zIndex: 1 }} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"
          animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-200/15 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-[2]" style={{ pointerEvents: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
        >
          <Card className="border-2 shadow-2xl backdrop-blur-2xl bg-background/20 dark:bg-background/20">
            <CardHeader className="text-center space-y-6 pb-8">
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                className="flex justify-center"
              >
                <img
                  src="/leasemaster-logo.png"
                  alt="LeaseMaster"
                  className="h-24 w-auto"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <CardDescription className={`text-xl mt-3 ${getTextContrastClass()}`}>
                  Tenant Login
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!otpRequired ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="identifier" className={`text-base ${getTextContrastClass()}`}>Email or Phone</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
                        <Input
                          id="identifier"
                          placeholder="tenant@email.com or +254..."
                          className="h-12 text-base pl-4 pr-11"
                          value={identifier}
                          onChange={(event) => setIdentifier(event.target.value)}
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="accessCode" className={`text-base ${getTextContrastClass()}`}>Access Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
                        <Input
                          id="accessCode"
                          type="password"
                          placeholder="Enter access code"
                          className="h-12 text-base pl-4 pr-11"
                          value={accessCode}
                          onChange={(event) => setAccessCode(event.target.value)}
                        />
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
                      <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
                      <Input
                        id="otp"
                        placeholder="Enter the 6-digit code"
                        className="h-12 text-base pl-4 pr-11"
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>OTP valid for 5 minutes.</span>
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOtpRequired(false);
                        setOtpCode("");
                        setOtpCooldown(0);
                      }}
                      className="w-full"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2 animated-arrow-left" />
                      Back to Login
                    </Button>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
                    {loading ? (
                      "Signing in..."
                    ) : (
                      <>
                        <ArrowRight className="h-5 w-5 animated-login-arrow" />
                        <span style={{ marginLeft: '2px' }}>]</span>
                        <span style={{ marginLeft: '8px' }}>Continue</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className={`w-full h-12 text-base gap-3 ${getTextContrastClass()}`}
                  onClick={() => {
                    const hostname = window.location.hostname;
                    const protocol = window.location.protocol;
                    if (hostname === 'localhost' || hostname === '127.0.0.1') {
                      setLocation('/');
                    } else {
                      const rootDomain = hostname.replace(/^(admin|portal|clients|enquiries)\./, '');
                      window.location.href = `${protocol}//${rootDomain}/`;
                    }
                  }}
                >
                  <ArrowLeft className="h-5 w-5 animated-arrow-left" />
                  <span className="font-medium">Homepage</span>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
