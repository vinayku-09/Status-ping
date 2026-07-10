"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Gauge,
  Globe,
  Layers,
  Mail,
  Megaphone,
  Monitor,
  Palette,
  Terminal,
  Webhook,
  XCircle,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
// ─── CanvasRevealEffect ───────────────────────────────────────────────────────

interface CanvasRevealEffectProps {
  animationSpeed: number;
  containerClassName?: string;
  colors?: number[][];
  dotSize?: number;
}

function CanvasRevealEffect({
  animationSpeed,
  containerClassName,
  colors,
  dotSize,
}: CanvasRevealEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const numDots = 50;
    const dots: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < numDots; i++) {
      dots.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * animationSpeed * 0.4,
        vy: (Math.random() - 0.5) * animationSpeed * 0.4,
      });
    }

    const c1 = colors?.[0] || [255, 255, 255];
    const c2 = colors?.[1] || [200, 200, 200];
    const size = dotSize || 2;

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > height) dot.vy *= -1;
        dot.x = Math.max(0, Math.min(width, dot.x));
        dot.y = Math.max(0, Math.min(height, dot.y));

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.85)`;
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${(1 - dist / 110) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);
    };
  }, [animationSpeed, colors, dotSize]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${containerClassName || ""}`}
    />
  );
}

// ─── Canvas Reveal Cards ──────────────────────────────────────────────────────

const canvasCards = [
  {
    title: "Connect your endpoints",
    subtitle: "Paste any URL — API, website, cron job, or TCP port.",
    animationSpeed: 5.1,
    containerClassName: "bg-emerald-700",
  },
  {
    title: "We check every 60 seconds",
    subtitle: "From 12 global regions, around the clock.",
    animationSpeed: 3,
    containerClassName: "bg-blue-800",
    colors: [[59, 130, 246], [147, 197, 253]] as number[][],
    dotSize: 2,
  },
  {
    title: "Alert your team instantly",
    subtitle: "Slack, email, PagerDuty, SMS — in under 30 seconds.",
    animationSpeed: 3,
    containerClassName: "bg-sky-700",
    colors: [[125, 211, 252], [186, 230, 253]] as number[][],
  },
];

function CanvasCard({
  title,
  subtitle,
  animationSpeed,
  containerClassName,
  colors,
  dotSize,
}: (typeof canvasCards)[number]) {
  return (
    <div className="group/canvas-card relative flex h-[28rem] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Corner decorators */}
      <div className="absolute left-4 top-4 h-4 w-4 border-l-2 border-t-2 border-slate-300" />
      <div className="absolute right-4 top-4 h-4 w-4 border-r-2 border-t-2 border-slate-300" />
      <div className="absolute bottom-4 left-4 h-4 w-4 border-b-2 border-l-2 border-slate-300" />
      <div className="absolute bottom-4 right-4 h-4 w-4 border-b-2 border-r-2 border-slate-300" />

      <CanvasRevealEffect
        animationSpeed={animationSpeed}
        containerClassName={containerClassName}
        colors={colors}
        dotSize={dotSize}
      />

      <div className="relative z-10 flex flex-col items-center p-6 text-center">
        <h3 className="text-xl font-bold text-slate-900 opacity-0 transition duration-200 group-hover/canvas-card:-translate-y-2 group-hover/canvas-card:text-white group-hover/canvas-card:opacity-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-500 opacity-0 transition duration-200 group-hover/canvas-card:text-white/80 group-hover/canvas-card:opacity-100">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ─── Step Illustrations ───────────────────────────────────────────────────────

function Step1Illustration() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-auto text-[10px] text-slate-500">Endpoint creation</span>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600">HTTP</span>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">HTTPS</span>
      </div>
    </div>
  );
}

function Step2Illustration() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
          <Calendar className="h-3 w-3" /> Scheduling
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
          <Layers className="h-3 w-3" /> BullMQ
        </span>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-[9px] text-slate-500">Time</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span className="text-[9px] text-slate-500">Status</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-2">
          <Gauge className="h-4 w-4 text-blue-500" />
          <span className="text-[9px] text-slate-500">Latency</span>
        </div>
      </div>
    </div>
  );
}

function Step3Illustration() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-2 py-1.5">
        <XCircle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-[10px] text-red-700">Failing checks</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-[10px] text-emerald-700">Reliability</span>
      </div>
      <div className="flex items-end justify-center gap-1 pt-1">
        <div className="h-6 w-4 rounded-sm bg-emerald-400" />
        <div className="h-4 w-4 rounded-sm bg-amber-400" />
        <div className="h-8 w-4 rounded-sm bg-emerald-400" />
        <div className="h-5 w-4 rounded-sm bg-red-400" />
      </div>
    </div>
  );
}

function Step4Illustration() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Megaphone className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-600">Channel notifications</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-white p-1.5">
          <Bell className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div className="h-2 flex-1 rounded bg-slate-100" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-white p-1.5">
          <Globe className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <div className="h-2 flex-1 rounded bg-slate-100" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 self-start rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
        <Monitor className="h-3 w-3 text-slate-500" />
        <span className="text-[9px] text-slate-500">Public</span>
      </div>
    </div>
  );
}

// ─── Workflow Steps ───────────────────────────────────────────────────────────

const steps = [
  {
    number: "1",
    title: "Create a Monitor",
    description:
      "Add any HTTP or HTTPS endpoint you want to monitor. Configure the check interval, timeout, expected status code, and optional keyword validation to match your application's requirements.",
    illustration: Step1Illustration,
  },
  {
    number: "2",
    title: "Automated Health Checks",
    description:
      "A background worker schedules health checks at the configured interval using BullMQ. Every check records response time, HTTP status, latency, SSL certificate information, and availability metrics.",
    illustration: Step2Illustration,
  },
  {
    number: "3",
    title: "Intelligent Incident Detection",
    description:
      "When consecutive health checks fail, StatusPing automatically creates an incident, tracks downtime, and calculates important reliability metrics like uptime percentage, MTTD, and MTTR.",
    illustration: Step3Illustration,
  },
  {
    number: "4",
    title: "Get Notified Instantly",
    description:
      "Receive email alerts, webhook notifications, and real-time dashboard updates whenever an incident is created or resolved. Your public status page is updated automatically.",
    illustration: Step4Illustration,
  },
];

function WorkflowStepsSection() {
  return (
    <div className="py-16">
      <div className="mb-12 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-500">How it works</span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
          Monitor your services in four simple steps
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
          StatusPing continuously monitors your websites and APIs, automatically detects issues,
          and keeps your team informed before your users report a problem.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {steps.map((step, i) => {
          const Illustration = step.illustration;
          return (
            <div key={step.number} className="contents">
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-blue-500">{step.number}</span>
                  <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                </div>
                <div className="mt-4 min-h-[120px]">
                  <Illustration />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden items-center lg:flex">
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          Sequence pointer <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

// ─── Sync Tools Hub ───────────────────────────────────────────────────────────

interface ToolCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  extra?: string;
}

function ToolCard({ icon: Icon, title, subtitle, extra }: ToolCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        {extra && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            {extra}
          </p>
        )}
      </div>
    </div>
  );
}

function CenterMonitor() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex flex-col items-center">
        <div className="rounded-lg border-[3px] border-slate-700 bg-white p-4 shadow-sm">
          <Activity className="h-12 w-12 text-slate-600" strokeWidth={1.5} />
        </div>
        <div className="h-2 w-8 bg-slate-700" />
        <div className="h-1.5 w-14 rounded-b bg-slate-700" />
      </div>
      <p className="text-center text-xs leading-relaxed text-slate-500">
        Establish automated workflows for specific incident triggers, from API failures to latency
        spikes, and define root-cause-analysis rules.
      </p>
    </div>
  );
}

const comingSoonFeatures = [
  { name: "Slack Notifications",      color: "bg-purple-500" },
  { name: "Microsoft Teams",          color: "bg-blue-500"   },
  { name: "Discord Alerts",           color: "bg-indigo-500" },
  { name: "PagerDuty",                color: "bg-emerald-500"},
  { name: "Grafana",                  color: "bg-orange-500" },
  { name: "Prometheus",               color: "bg-amber-500"  },
  { name: "Custom Domains",           color: "bg-teal-500"   },
  { name: "SMS Alerts",               color: "bg-red-500"    },
  { name: "Multi-region Monitoring",  color: "bg-sky-500"    },
];

function ComingSoonSection() {
  return (
    <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="shrink-0 lg:w-64">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Coming Soon</span>
          <h3 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">
            Planned Integrations and Features
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 lg:flex-1">
          {comingSoonFeatures.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${f.color}`} />
              <span className="text-sm text-slate-600">{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SyncToolsHub() {
  return (
    <div className="py-16">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Sync StatusPing with Your Existing Tools
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
          Integrate StatusPing into your existing workflow to receive alerts, automate responses,
          and keep your entire team informed without changing how you work.
        </p>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="order-1 flex items-center justify-center lg:order-2 lg:flex-1">
          <CenterMonitor />
        </div>
        <div className="order-2 flex flex-col gap-4 lg:order-1 lg:flex-1">
          <ToolCard icon={Mail}     title="Email Notifications" subtitle="Receive instant incident alerts and recovery notifications directly in your inbox." extra="Resend-powered delivery" />
          <ToolCard icon={FaGithub}   title="GitHub OAuth"        subtitle="Sign in securely with GitHub OAuth. No passwords to manage." />
          <ToolCard icon={Terminal} title="REST API"            subtitle="Manage monitors, incidents, and historical metrics programmatically through a well-documented REST API." />
        </div>
        <div className="order-3 flex flex-col gap-4 lg:order-3 lg:flex-1">
          <ToolCard icon={Webhook} title="Webhooks"         subtitle="Send signed HTTP webhook events to your own applications whenever a monitor changes status." />
          <ToolCard icon={Globe}   title="Public Status Pages" subtitle="Share a branded, real-time status page with customers and stakeholders." />
          <ToolCard icon={Palette} title="Branded Experience"  subtitle="Customize your status page branding, colors, and logo. Send branded email notifications." />
        </div>
      </div>

      <ComingSoonSection />
    </div>
  );
}

// ─── Expandable FAQ Cards ─────────────────────────────────────────────────────

const faqItems = [
  {
    description: "Monitoring frequency",
    title: "How often does StatusPing check my endpoints?",
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
    ctaText: "Learn more",
    ctaLink: "#",
    content: () => (
      <p>
        By default, StatusPing checks every 60 seconds from all 12 global regions simultaneously.
        On paid plans you can increase frequency to every 30 or 10 seconds for critical APIs. Checks
        are staggered across regions to give a real-time picture of global availability at all times.
      </p>
    ),
  },
  {
    description: "Alert channels",
    title: "Which notification channels does StatusPing support?",
    src: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop",
    ctaText: "See integrations",
    ctaLink: "#",
    content: () => (
      <p>
        StatusPing supports Slack, PagerDuty, OpsGenie, email, SMS, Microsoft Teams, Discord, and
        webhook callbacks. You can configure separate alert policies per monitor — so your payments
        API can wake the on-call engineer at 3am while your blog just sends a Slack message.
      </p>
    ),
  },
  {
    description: "Status pages",
    title: "Can I build a custom public status page?",
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop",
    ctaText: "See example",
    ctaLink: "#",
    content: () => (
      <p>
        Yes — every StatusPing account gets a hosted status page at yourteam.statusping.io. On paid
        plans you can add a custom domain (status.yourcompany.com) with one DNS record. The page
        auto-updates with any incident and supports maintenance window announcements.
      </p>
    ),
  },
  {
    description: "SSL monitoring",
    title: "Does StatusPing monitor SSL certificate expiry?",
    src: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=400&fit=crop",
    ctaText: "Learn more",
    ctaLink: "#",
    content: () => (
      <p>
        Absolutely. StatusPing checks your SSL cert on every monitor run. You will receive alerts
        30 days before expiry, then again at 14 days and 7 days. We have saved hundreds of teams
        from the costly experience of an expired cert taking down their HTTPS traffic.
      </p>
    ),
  },
  {
    description: "Developer tools",
    title: "Is there an API to manage monitors programmatically?",
    src: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop",
    ctaText: "Read docs",
    ctaLink: "#",
    content: () => (
      <p>
        Yes — StatusPing has a full REST API to create, update, pause, and delete monitors; trigger
        incident reports; and fetch uptime metrics over any time range. Use it with Terraform, GitHub
        Actions, or any CI/CD pipeline to automate monitor management alongside your infrastructure.
      </p>
    ),
  },
];

function ExpandableFAQCards() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="space-y-3">
        {faqItems.map((item, index) => (
          <div
            key={index}
            onClick={() => setActive(active === index ? null : index)}
            className={`cursor-pointer rounded-xl border border-slate-100 p-4 transition-all ${
              active === index ? "bg-white shadow-lg" : "bg-white shadow-sm hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-4">
              <img src={item.src} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">{item.description}</p>
                <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
              </div>
              <div className={`shrink-0 text-xs font-medium transition-colors ${active === index ? "text-blue-600" : "text-slate-400"}`}>
                {active === index ? "Close" : "Open"}
              </div>
            </div>

            <AnimatePresence>
              {active === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
                    <img src={item.src} alt="" className="mb-4 h-48 w-full rounded-2xl object-cover" />
                    <div className="text-sm leading-relaxed text-slate-600">{item.content()}</div>
                    <a href={item.ctaLink} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
                      {item.ctaText} →
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white py-24">
      {/* Header */}
      <div className="mb-16 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-500">
          Up and running in 5 minutes
        </span>
        <h2 className="mt-4 text-4xl font-bold text-slate-900 md:text-5xl">
          Three steps to zero downtime
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-500">
          No servers, no config files. Add your first monitor and you are done.
        </p>
      </div>

      {/* Canvas Reveal Cards */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 lg:grid-cols-3">
        {canvasCards.map((card, i) => (
          <CanvasCard key={i} {...card} />
        ))}
      </div>

      {/* Workflow Steps + Sync Tools */}
      <div className="mx-auto max-w-6xl px-6">
        <WorkflowStepsSection />
        <SyncToolsHub />
      </div>

      {/* FAQ divider */}
      <div className="mx-auto mb-12 mt-20 max-w-5xl px-6">
        <div className="border-t border-slate-100" />
      </div>

      {/* FAQ */}
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h3>
        <p className="mt-2 text-slate-500">Everything you need to know about StatusPing.</p>
      </div>
      <ExpandableFAQCards />
    </section>
  );
}
