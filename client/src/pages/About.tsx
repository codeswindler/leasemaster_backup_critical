import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Building2,
  ArrowLeft,
  Clock,
  Mail,
  Phone,
  Sparkles,
  Info,
  Calendar,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Smartphone,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { BackToTop } from "@/components/back-to-top";

export function About() {
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageBrightness, setImageBrightness] = useState<number>(0.5);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);
  const [tenantPortalImageIndex, setTenantPortalImageIndex] = useState(0);
  const [securityImageIndex, setSecurityImageIndex] = useState(0);

  // Scroll to top when component mounts (for navigation from footer)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Property images for background slideshow (same as landing page)
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
  ];

  // Helper function for Google Drive images using proxy route
  const driveImage = (fileId: string) => `/api/public/drive-image/${fileId}`;

  // Tenant Portal images - LeaseMaster tenant dashboard showing actual interface: tabs (Maintenance/Statements/Invoices/Receipts), property info cards, maintenance requests table, invoices list, payment history - with black/diverse people accessing
  const tenantPortalImages = [
    driveImage('16sFxSqDD7wrYATeeUd8PRQ2GKPUoVv2w'),
  ];

  // Security & Compliance images - focusing on security, data protection, encryption
  const securityImages = [
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop&q=80', // Data center/server security
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop&q=80', // Cybersecurity
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop&q=80', // Digital security/encryption
    driveImage('1x6Cdp3vqLMtaEGl7YxJzVOkOEUGUbCvc'),
  ];
  const agentWorkspaceImage = driveImage('1KNSxSILzSa69_atbqyqkr13K9dgXfqIv');
  const propertyHqImage = driveImage('1sxAlLQf-o3yZr4YSZ4fpsi1UHf9kqIs5');

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

  // Background slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % propertyImages.length);
    }, 8000); // Change image every 8 seconds
    return () => clearInterval(interval);
  }, []);

  // Tenant Portal slideshow (only if more than 1 image)
  useEffect(() => {
    if (tenantPortalImages.length <= 1) return; // Static for single image
    const interval = setInterval(() => {
      setTenantPortalImageIndex((prev) => (prev + 1) % tenantPortalImages.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, [tenantPortalImages.length]);

  // Security slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setSecurityImageIndex((prev) => (prev + 1) % securityImages.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Preload images
  useEffect(() => {
    propertyImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Analyze image brightness for text contrast
  const analyzeImageBrightness = (imageUrl: string, callback: (brightness: number) => void) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(0.5);
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        totalBrightness += brightness;
      }
      const avgBrightness = totalBrightness / (data.length / 4);
      callback(avgBrightness);
    };
    img.onerror = () => callback(0.5);
    img.src = imageUrl;
  };

  // Get text contrast class based on brightness
  const getTextContrastClass = () => {
    if (isDarkTheme) return 'text-white';
    return imageBrightness > 0.5 ? 'text-gray-900' : 'text-white';
  };

  const handleComingSoon = (section: string) => {
    setShowComingSoon(section);
    setTimeout(() => setShowComingSoon(null), 3000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background Slideshow */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <img
              src={propertyImages[currentImageIndex]}
              alt="Property background"
              className="absolute inset-0 w-full h-full object-cover"
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
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Back to Homepage Button */}
      <div className="relative z-[2] pt-20 pb-8 px-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto"
        >
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className={`gap-2 ${getTextContrastClass()} hover:bg-white/10`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Button>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-[2] container mx-auto px-4 py-12">
        {/* About Us Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardContent className="p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <Info className="h-8 w-8" />
                </div>
                <h1 className={`text-4xl md:text-5xl font-bold ${getTextContrastClass()}`}>
                  About LeaseMaster
                </h1>
              </div>
              
              <div className={`space-y-6 text-lg leading-relaxed ${getTextContrastClass()}`}>
                <p>
                  <strong className="text-primary">LeaseMaster – Redefining Property Management Efficiency.</strong>
                </p>

                <p>
                  LeaseMaster is the modern property management platform built for landlords, managers, and agents who
                  demand control, clarity, and effortless oversight. Our tools streamline daily operations, enhance
                  communication, and automate rent collection—all from one intuitive command center.
                </p>

                <p>
                  Designed for real-world adaptability, the platform integrates seamlessly with local payment systems,
                  offers multilingual support, and is tailored to meet the unique demands of property management in any
                  market.
                </p>

                <p>
                  Through our exclusive Agent Partner Program, property professionals can confidently expand their
                  portfolios, manage multiple clients with ease, and deliver exceptional service—all from a single,
                  powerful LeaseMaster workspace.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Why Choose LeaseMaster Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <div className="text-center mb-12">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${getTextContrastClass()}`}>
              Why Choose LeaseMaster?
            </h2>
            <p className={`text-xl ${getTextContrastClass()}`}>
              Transform your property management operations with measurable benefits.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6 text-center">
                <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mx-auto mb-4">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Increase Efficiency
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Automate routine tasks and reduce manual paperwork by up to 70%.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6 text-center">
                <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mx-auto mb-4">
                  <DollarSign className="h-8 w-8" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Improve Cash Flow
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Faster rent collections and reduced vacancy periods increase revenue.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6 text-center">
                <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mx-auto mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Better Tenant Relations
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Enhanced communication and faster issue resolution improve satisfaction.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6 text-center">
                <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mx-auto mb-4">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Data-Driven Decisions
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Make informed decisions with comprehensive analytics and reporting.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Comprehensive Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <div className="text-center mb-12">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${getTextContrastClass()}`}>
              Comprehensive Features
            </h2>
            <p className={`text-xl ${getTextContrastClass()}`}>
              Everything you need to manage your property portfolio efficiently and professionally.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <Building2 className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Property Management
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Comprehensive property portfolio management with detailed property profiles and maintenance tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Tenant Management
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Complete tenant database with lease agreements, contact information, and communication history.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Rent Collection
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Automated rent collection, payment tracking, and financial reporting with multiple payment options.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <Calendar className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Lease Tracking
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Monitor lease expiration dates, renewal notifications, and automated alerts for important dates.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Document Management
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Secure storage and management of lease agreements, inspection reports, and property documents.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <BarChart3 className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Financial Reporting
                </h3>
                <p className={`text-sm ${getTextContrastClass()}`}>
                  Comprehensive financial reports, profit & loss statements, and property performance analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Core Modules Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <div className="text-center mb-12">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${getTextContrastClass()}`}>
              Core Modules
            </h2>
            <p className={`text-xl ${getTextContrastClass()}`}>
              Integrated modules that work together to provide a complete property management solution.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <Building2 className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Property Portfolio
                </h3>
                <p className={`text-sm mb-4 ${getTextContrastClass()}`}>
                  Manage multiple properties with detailed information, photos, and specifications.
                </p>
                <ul className={`space-y-2 text-sm ${getTextContrastClass()}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Property profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Unit management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Maintenance schedules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Property valuation tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <Smartphone className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Tenant Portal
                </h3>
                <p className={`text-sm mb-4 ${getTextContrastClass()}`}>
                  Self-service portal for tenants to pay rent, submit requests, and communicate.
                </p>
                <ul className={`space-y-2 text-sm ${getTextContrastClass()}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Online rent payment</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Maintenance requests</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Document access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Communication tools</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Financial Management
                </h3>
                <p className={`text-sm mb-4 ${getTextContrastClass()}`}>
                  Complete financial oversight with automated calculations and reporting.
                </p>
                <ul className={`space-y-2 text-sm ${getTextContrastClass()}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Rent tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Expense management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Financial reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Tax preparation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-6">
                <Zap className="h-8 w-8 text-primary mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                  Maintenance Management
                </h3>
                <p className={`text-sm mb-4 ${getTextContrastClass()}`}>
                  Streamlined maintenance workflow from request to completion.
                </p>
                <ul className={`space-y-2 text-sm ${getTextContrastClass()}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Work order management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Vendor coordination</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Preventive maintenance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Cost tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Agent Program Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-10">
                <div className="space-y-6">
                  <div>
                    <h2 className={`text-3xl font-bold mb-3 ${getTextContrastClass()}`}>
                      The Agent Workspace: Grow Your Portfolio, Not Your Workload
                    </h2>
                    <p className={`text-lg ${getTextContrastClass()}`}>
                      Your Command Center for Client Growth. Manage every landlord and portfolio from a single, powerful
                      workspace designed streamline your operations.
                    </p>
                  </div>
                  <ul className={`space-y-3 ${getTextContrastClass()}`}>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Onboard and manage multiple landlord clients</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Oversee portfolios, rent collection, and maintenance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Deliver branded reports and real-time insights</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Access exclusive partner tools and support</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-10">
                <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary/30">
                  <img
                    src={agentWorkspaceImage}
                    alt="Agent workspace dashboard preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => {}}
                    onLoad={() => {}}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardContent className="p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="relative order-2 md:order-1 aspect-video rounded-lg overflow-hidden border-2 border-primary/30">
                  <img
                    src={propertyHqImage}
                    alt="Property management control center preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => {}}
                    onLoad={() => {}}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                </div>
                <div className="order-1 md:order-2">
                  <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getTextContrastClass()}`}>
                    Your Property HQ: Full Visibility, Total Control
                  </h2>
                  <p className={`text-lg mb-6 ${getTextContrastClass()}`}>
                    Your Property Dashboard for Complete Control
                    <br />
                    Take charge of your investments with a landlord-specific portal that puts visibility, automation,
                    and peace of mind at your fingertips.
                  </p>
                  <ul className={`space-y-3 ${getTextContrastClass()}`}>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>View all properties, tenants, and financials in one place</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Automate rent collection and payment tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Approve maintenance requests and track progress</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Generate financial reports and export statements</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tenant Self-Service Portal Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardContent className="p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getTextContrastClass()}`}>
                    Tenant Self-Service Portal
                  </h2>
                  <p className={`text-lg mb-6 ${getTextContrastClass()}`}>
                    Empower your tenants with a dedicated portal where they can manage their rental experience independently, 
                    reducing your workload while improving satisfaction.
                  </p>
                  <ul className={`space-y-3 ${getTextContrastClass()}`}>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Online rent payment with multiple options</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Submit and track maintenance requests</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Access lease documents and notices</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Direct communication with property manager</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Payment history and account statements</span>
                    </li>
                  </ul>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary/30">
                  {tenantPortalImages.length > 1 ? (
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={`tenant-portal-${tenantPortalImageIndex}-${Math.random()}`}
                        src={`${tenantPortalImages[tenantPortalImageIndex]}&_t=${tenantPortalImageIndex}`}
                        alt="Tenant Portal - LeaseMaster Dashboard with diverse representation"
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const nextIndex = (tenantPortalImageIndex + 1) % tenantPortalImages.length;
                          if (nextIndex !== tenantPortalImageIndex) {
                            setTenantPortalImageIndex(nextIndex);
                          }
                        }}
                        onLoad={() => {}}
                      />
                    </AnimatePresence>
                  ) : (
                    <img
                      src={tenantPortalImages[0]}
                      alt="Tenant Portal - LeaseMaster Dashboard with diverse representation"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => {}}
                      onLoad={() => {}}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security & Compliance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardContent className="p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="relative order-2 md:order-1 aspect-video rounded-lg overflow-hidden border-2 border-primary/30">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={securityImageIndex}
                      src={securityImages[securityImageIndex]}
                      alt="Security & Compliance"
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const nextIndex = (securityImageIndex + 1) % securityImages.length;
                        if (nextIndex !== securityImageIndex) {
                          img.src = securityImages[nextIndex];
                        }
                      }}
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>
                <div className="order-1 md:order-2">
                  <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getTextContrastClass()}`}>
                    Security & Compliance
                  </h2>
                  <p className={`text-lg mb-6 ${getTextContrastClass()}`}>
                    Your data security is our priority. LeaseMaster is built with enterprise-grade security features 
                    and complies with industry standards.
                  </p>
                  <ul className={`space-y-3 ${getTextContrastClass()}`}>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>256-bit SSL encryption for all data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Regular security audits and updates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Automated daily backups</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Role-based access controls</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>GDPR compliant data handling</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transparent Pricing Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <div className="text-center mb-12">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${getTextContrastClass()}`}>
              Transparent Pricing
            </h2>
            <p className={`text-xl ${getTextContrastClass()}`}>
              Choose the plan that scales with your property portfolio. No hidden fees.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
              <CardContent className="p-8">
                <h3 className={`text-2xl font-bold mb-2 ${getTextContrastClass()}`}>
                  Starter
                </h3>
                <p className={`text-3xl font-bold mb-4 text-primary`}>
                  $50
                </p>
                <p className={`text-sm mb-6 ${getTextContrastClass()}`}>
                  per month
                </p>
                <p className={`text-sm mb-6 font-semibold ${getTextContrastClass()}`}>
                  Up to 10 properties
                </p>
                <ul className={`space-y-3 mb-8 ${getTextContrastClass()}`}>
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
                <h3 className={`text-2xl font-bold mb-2 ${getTextContrastClass()}`}>
                  Professional
                </h3>
                <p className={`text-3xl font-bold mb-4 text-primary`}>
                  $100
                </p>
                <p className={`text-sm mb-6 ${getTextContrastClass()}`}>
                  per month
                </p>
                <p className={`text-sm mb-6 font-semibold ${getTextContrastClass()}`}>
                  Up to 50 properties
                </p>
                <ul className={`space-y-3 mb-8 ${getTextContrastClass()}`}>
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
                <h3 className={`text-2xl font-bold mb-2 ${getTextContrastClass()}`}>
                  Enterprise
                </h3>
                <p className={`text-3xl font-bold mb-4 text-primary`}>
                  Custom
                </p>
                <p className={`text-sm mb-6 ${getTextContrastClass()}`}>
                  pricing
                </p>
                <p className={`text-sm mb-6 font-semibold ${getTextContrastClass()}`}>
                  Unlimited properties
                </p>
                <ul className={`space-y-3 mb-8 ${getTextContrastClass()}`}>
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
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="border-2 backdrop-blur-lg bg-background/25 dark:bg-background/25">
            <CardContent className="p-12">
              <h2 className={`text-3xl font-bold mb-8 text-center ${getTextContrastClass()}`}>
                Contact Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-start gap-4">
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
                </div>

                <div className="flex items-start gap-4">
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
                </div>

                <div className="flex items-start gap-4 md:col-span-2">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${getTextContrastClass()}`}>
                      Working Hours
                    </h3>
                    <p className={`text-lg ${getTextContrastClass()}`}>
                      Monday - Friday<br />
                      8:00 AM - 5:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />

      {/* Coming Soon Popup */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              className="relative z-10 bg-background border-2 border-primary rounded-xl p-8 shadow-2xl max-w-md mx-4"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: 2,
                  repeatType: "reverse"
                }}
                className="text-center mb-4"
              >
                <Sparkles className="h-16 w-16 text-primary mx-auto" />
              </motion.div>
              <h3 className="text-3xl font-bold text-center mb-2">Coming Soon!</h3>
              <p className="text-center text-muted-foreground">
                Our services section is being prepared. Check back soon!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

