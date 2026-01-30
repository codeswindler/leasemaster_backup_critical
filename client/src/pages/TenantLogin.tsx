import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, KeyRound, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import "@/components/animated-icons.css";

export function TenantLogin() {
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setAccessCode] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [requestFullName, setRequestFullName] = useState("");
  const [requestContact, setRequestContact] = useState("");
  const [requestPropertyId, setRequestPropertyId] = useState("");
  const [requestUnitNumber, setRequestUnitNumber] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

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

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties", "tenant-access"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/properties");
      return await response.json();
    },
  });

  const handleRequestAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestFullName.trim() || !requestContact.trim() || !requestPropertyId) {
      toast({
        title: "Missing details",
        description: "Name, contact, and property are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      setRequestSubmitting(true);
      const response = await apiRequest("POST", "/api/tenant-access-requests", {
        fullName: requestFullName.trim(),
        contact: requestContact.trim(),
        propertyId: requestPropertyId,
        unitNumber: requestUnitNumber.trim(),
        message: requestMessage.trim(),
      });
      const result = await response.json();
      if (result?.success) {
        toast({
          title: "Request sent",
          description: "Your access request has been sent to the landlord.",
        });
        setRequestFullName("");
        setRequestContact("");
        setRequestPropertyId("");
        setRequestUnitNumber("");
        setRequestMessage("");
      } else {
        throw new Error(result?.error || "Failed to submit request.");
      }
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error?.message || "Unable to send request.",
        variant: "destructive",
      });
    } finally {
      setRequestSubmitting(false);
    }
  };

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
    if (!otpRequired && (!identifier.trim() || !password.trim())) {
      toast({
        title: "Missing details",
        description: "Please enter your email/phone and password.",
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
        body: JSON.stringify({ identifier, password }),
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
    <div className="min-h-[calc(100vh/var(--ui-zoom))] h-[calc(100vh/var(--ui-zoom))] flex flex-col relative overflow-hidden" style={{ pointerEvents: 'auto' }}>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          
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
