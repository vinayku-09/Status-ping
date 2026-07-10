"use client";

import * as React from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Cloud,
  DollarSign,
  Filter,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  LayoutDashboard,
  Link,
  Mail,
  Megaphone,
  Menu,
  Monitor,
  MoreVertical,
  Network,
  Palette,
  Pencil,
  Plug,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  Sliders,
  Terminal,
  Users,
  Webhook,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { FaGithub } from "react-icons/fa";
import HowItWorksSection from "./HowItWorksSection";
const AURORA_COLORS = ["#bfdbfe", "#93c5fd", "#a5b4fc", "#7dd3fc", "#c4b5fd", "#dbeafe"];

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "Monitoring Agents", href: "#infrastructure" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Integrations", href: "#integrations" },
  { name: "Docs", href: "#docs" },
];

export function StatusPingLanding() {
  const color = useMotionValue(AURORA_COLORS[0]);

  React.useEffect(() => {
    const controls = animate(color, AURORA_COLORS, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
    return controls.stop;
  }, [color]);

  const backgroundImage = useMotionTemplate`radial-gradient(130% 130% at 50% 0%, #ffffff 40%, ${color})`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Header />
      <main className="relative">
        <motion.section style={{ backgroundImage }} className="relative overflow-hidden px-4 pb-24 pt-20 sm:pb-40 sm:pt-28">
          <StarField />
          <div className="relative z-20 mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex flex-col items-center text-center">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-600 backdrop-blur-sm sm:text-xs"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Live Monitoring - Beta Now Open
              </motion.span>

              <TypewriterEffectSmooth
                words={[
                  { text: "Monitor" },
                  { text: "everything" },
                  { text: "your" },
                  { text: "stack" },
                  { text: "effortlessly.", className: "text-blue-600" },
                ]}
                className="m-0 items-center justify-center gap-x-2 gap-y-1 text-center text-4xl font-bold text-slate-900 sm:!flex-nowrap md:text-6xl"
              />

              <p className="mt-4 text-xl font-normal text-slate-600 md:text-2xl">
                Zero downtime for{" "}
                <FlipWords words={["your API", "your team", "your customers", "your SaaS"]} className="font-semibold text-blue-600" />
              </p>

              <p className="mx-auto mt-4 max-w-2xl px-2 text-sm leading-relaxed text-slate-600">
                We just raised $3M to build the future of full-stack monitoring
                <br className="hidden sm:block" />
                Real-time uptime alerts, beautiful public status pages, and instant incident reports - all in one place. Know before your customers do.
              </p>

              <div className="mt-6 flex w-full max-w-[280px] flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
                <a href="/register" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 sm:w-auto">
                  Get Started
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a href="#dashboard-preview" className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white/70 px-6 py-3 text-sm font-medium text-slate-700 backdrop-blur-sm transition hover:bg-white sm:w-auto">
                  View Demo
                </a>
              </div>

              <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-6 border-t border-slate-300 pt-6 sm:max-w-none sm:flex sm:flex-wrap sm:justify-center sm:gap-12 sm:border-0 sm:pt-0 md:gap-16">
                {[
                  { num: 100, suffix: "%", label: "Uptime" },
                  { num: 30, suffix: "s", label: "Alert Time" },
                  { num: 40, suffix: "+", label: "Integrations" },
                  { num: 99.9, suffix: "%", label: "SLA", decimals: 1 },
                ].map(({ num, suffix, label, decimals = 0 }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      <NumberTicker value={num} decimals={decimals} />
                      <span>{suffix}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-black">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <AnimatedStripes />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-b from-transparent to-white" aria-hidden="true" />
        </motion.section>

        <section id="dashboard-preview" className="relative z-30 mx-auto -mt-20 max-w-6xl px-6 pb-24 sm:-mt-32">
          <GlowingDashboardWrapper>
            <DashboardMock />
          </GlowingDashboardWrapper>
        </section>

        <TechStackSection />
        <InfrastructureShowcase />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
        <Footer />
      </main>
    </div>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // Smoothly catch scrolling events to swap out navbar form-factors
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    /* Outer layout wrapper to handle the floating gap adjustment elegantly without layout shifting */
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
      scrolled ? "px-4 pt-3" : "px-0 pt-0"
    }`}>
      <nav
        className={`mx-auto w-full transition-all duration-500 ease-in-out ${
          scrolled
            ? "max-w-5xl rounded-2xl border border-slate-200/80 bg-white/80 shadow-md shadow-slate-900/5 backdrop-blur-md px-5 py-3"
            : "max-w-full border-b border-transparent bg-transparent px-6 py-5"
        } ${
          open 
            ? "max-md:h-[auto] max-md:bg-white max-md:rounded-2xl max-md:border-slate-200 max-md:shadow-xl max-md:mx-0" 
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-6">
          
          {/* Brand Identity */}
          <a href="#" className="flex items-center gap-2.5 flex-shrink-0 group">
            <Activity className="h-5 w-5 text-blue-600 transition-transform group-active:scale-95" strokeWidth={2.5} />
            <span className="font-semibold text-base tracking-tight text-slate-950">
              StatusPing
            </span>
          </a>

          {/* Desktop Navigation Link Lists */}
          <ul className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {menuItems.map((item) => (
              <li key={item.name}>
                <a 
                  href={item.href} 
                  className="transition-colors hover:text-slate-900"
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop Auth Actions Cluster */}
          <div className="hidden items-center gap-4 md:flex">
            <a 
              href="/login" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log in
            </a>
            <a 
              href="/register" 
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-600/10 transition-colors hover:bg-blue-700"
            >
              Try for Free
            </a>
          </div>

          {/* Mobile responsive drawer toggle trigger button */}
          <button 
            onClick={() => setOpen((v) => !v)} 
            className="p-2 text-slate-700 rounded-lg hover:bg-slate-100/80 focus:outline-none transition-colors md:hidden" 
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5 stroke-[2.5]" /> : <Menu className="h-5 w-5 stroke-[2.5]" />}
          </button>
        </div>

        {/* Mobile View Navigation Drawer */}
        {open && (
          <div className="mt-4 flex flex-col gap-5 border-t border-slate-100 pt-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-1.5">
              {menuItems.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href} 
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {item.name}
                </a>
              ))}
            </div>

            {/* Mobile Actions Footer Area */}
            <div className="border-t border-slate-100 pt-4 pb-2 flex flex-col gap-2">
              <a 
                href="/login" 
                className="w-full text-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
                onClick={() => setOpen(false)}
              >
                Log in
              </a>
              <a 
                href="/register" 
                className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-sm shadow-blue-600/10 text-sm transition-colors"
                onClick={() => setOpen(false)}
              >
                Try for Free
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function NumberTicker({ value, initial = 0, decimals = 0 }: { value: number; initial?: number; decimals?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const motionValue = useMotionValue(initial);
  const springValue = useSpring(motionValue, { mass: 0.8, stiffness: 75, damping: 15 });

  React.useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, motionValue, value]);

  React.useEffect(() => springValue.on("change", (latest) => {
    if (ref.current) ref.current.textContent = latest.toFixed(decimals);
  }), [springValue, decimals]);

  return <span ref={ref}>{initial.toFixed(decimals)}</span>;
}

function FlipWords({ words, duration = 3000, className = "" }: { words: string[]; duration?: number; className?: string }) {
  const [currentWord, setCurrentWord] = React.useState(words[0]);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const startAnimation = React.useCallback(() => {
    const next = words[words.indexOf(currentWord) + 1] ?? words[0];
    setCurrentWord(next);
    setIsAnimating(true);
  }, [currentWord, words]);

  React.useEffect(() => {
    if (!isAnimating) {
      const id = setTimeout(startAnimation, duration);
      return () => clearTimeout(id);
    }
  }, [isAnimating, duration, startAnimation]);

  return (
    <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
      <motion.span
        key={currentWord}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40, x: 40, filter: "blur(8px)", scale: 2, position: "absolute" }}
        transition={{ type: "spring", stiffness: 100, damping: 10 }}
        className={`relative z-10 inline-block text-left ${className}`}
      >
        {currentWord.split("").map((letter, index) => <span key={`${currentWord}-${index}`} className="inline-block">{letter === " " ? "\u00A0" : letter}</span>)}
      </motion.span>
    </AnimatePresence>
  );
}

function TypewriterEffectSmooth({ words, className = "", cursorClassName = "" }: { words: { text: string; className?: string }[]; className?: string; cursorClassName?: string }) {
  const wordsArray = words.map((word) => ({ ...word, chars: word.text.split("") }));
  return (
    <div className={`flex flex-wrap justify-center ${className}`}>
      <motion.div className="overflow-hidden pb-2" initial={{ width: "0%" }} animate={{ width: "fit-content" }} transition={{ duration: 2, ease: "linear", delay: 0.5 }}>
        <div style={{ whiteSpace: "nowrap" }}>
          {wordsArray.map((word, idx) => (
            <span key={idx} className="inline-block">
              {word.chars.map((char, i) => <span key={i} className={word.className ?? ""}>{char}</span>)}
              &nbsp;
            </span>
          ))}
        </div>
      </motion.div>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }} className={`block h-9 w-[3px] rounded-sm bg-blue-600 md:h-12 ${cursorClassName}`} />
    </div>
  );
}

function StarField() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.0003 + 0.0001,
      phase: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        const twinkle = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 1000 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${twinkle})`;
        ctx.fill();
      });
      t += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

const STRIPES = [55, 80, 65, 100, 120, 140, 110, 90, 75, 130, 95, 115, 70, 150, 85, 125, 60, 135, 105, 145, 80, 120, 95, 160, 75, 110, 65, 140];

function AnimatedStripes() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 flex h-[200px] items-end justify-center gap-[5px] overflow-hidden px-4" aria-hidden="true">
      {STRIPES.map((h, i) => (
        <motion.div
          key={i}
          className="shrink-0 rounded-t"
          style={{ width: 14, background: `linear-gradient(to top, rgba(${i % 3 === 0 ? "59,130,246" : i % 3 === 1 ? "99,102,241" : "14,165,233"},0.${12 + (i % 9)}), rgba(219,234,254,0))` }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: h, opacity: 1 }}
          transition={{ duration: 1.2, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

function GlowingDashboardWrapper({ children }: { children: React.ReactNode }) {
  const angle = useMotionValue(0);
  const [deg, setDeg] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(angle, 360, { duration: 6, repeat: Infinity, ease: "linear" });
    return controls.stop;
  }, [angle]);

  React.useEffect(() => angle.on("change", (v) => setDeg(v)), [angle]);

  const conicGradient = `conic-gradient(from ${deg}deg at 50% 50%, #44BCFF, #a5b4fc, #FF44EC, #c4b5fd, #FF675E, #93c5fd, #44BCFF)`;
  return (
    <div className="relative rounded-2xl p-[2px]" style={{ background: conicGradient }}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-40 blur-xl" style={{ background: conicGradient }} aria-hidden="true" />
      <div className="relative z-10 overflow-hidden rounded-2xl bg-white shadow-2xl">{children}</div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-blue-600" strokeWidth={2.5} /><span className="text-sm font-semibold text-slate-800">StatusPing</span></div>
        <div className="hidden text-[11px] text-slate-500 md:block">Account: sweet</div>
        <button className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">Sawyer Middeleer <ChevronDown className="h-3 w-3" /></button>
      </div>
      <div className="flex">
        <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-slate-50/40 p-3 md:block">
          <button className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">StatusPing <ChevronDown className="h-3 w-3" /></button>
          <nav className="mt-4 space-y-1 text-xs">
            <SideItem icon={<Server className="h-3.5 w-3.5" />} label="Infrastructure" active />
            <div className="ml-6 space-y-1 text-slate-600"><div className="rounded px-2 py-1 hover:bg-slate-100">Servers</div><div className="rounded px-2 py-1 hover:bg-slate-100">Databases</div><div className="rounded px-2 py-1 hover:bg-slate-100">APIs</div></div>
            <SideItem icon={<Network className="h-3.5 w-3.5" />} label="Network" />
            <SideItem icon={<BarChart3 className="h-3.5 w-3.5" />} label="Application Performance" />
            <div className="pt-3"><SideItem icon={<Bell className="h-3.5 w-3.5" />} label="Incidents" /><SideItem icon={<FileText className="h-3.5 w-3.5" />} label="Status Pages" /><SideItem icon={<Settings className="h-3.5 w-3.5" />} label="Configure" /></div>
          </nav>
          <div className="mt-8 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-1.5 text-xs"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-[10px] font-medium text-slate-700">da</div><span className="text-slate-700">david</span></div>
        </aside>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <button className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-100 text-sky-600"><LayoutDashboard className="h-4 w-4" /></div>
              <div><div className="text-sm font-semibold text-slate-800">Snowflake</div><div className="text-[11px] text-slate-500">Monitoring for Snowflake</div></div>
            </div>
            <div className="flex items-center gap-2"><button className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700"><Share2 className="h-3 w-3" /> Share</button><button className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><MoreVertical className="h-3.5 w-3.5" /></button></div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <InfoCard title="Account" status="Up-time Status"><div className="mb-2 flex items-center justify-between"><div className="text-xs text-slate-500">About Snowflake</div><UptimeBadge /></div><p className="text-[11px] leading-relaxed text-slate-600">Snowflake delivers the Data Cloud, enabling organizations to mobilize data with unlimited scale.</p><div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-500"><MetaCell label="Industry" value="Cloud..." /><MetaCell label="Headquarters" value="450 Concar Dr..." /><MetaCell label="Employees" value="3,992" /></div></InfoCard>
            <InfoCard title="5 key products and services" status="Up-time Status"><div className="mb-2 flex items-center justify-end"><UptimeBadge /></div><div className="grid grid-cols-2 gap-3 text-[11px]"><ProductBlock name="AI Data Cloud" bullets={["Ease of Use and Security", "Cortex AI"]} /><ProductBlock name="Data Warehouse" bullets={["High Performance Analytics", "Scalable Architecture"]} /><ProductBlock name="Snowpark" bullets={["Multi language Support", "Secure Code Execution"]} /><ProductBlock name="Snowflake Marketplace" bullets={["Third Party Product Access", "Seamless Integration"]} /></div></InfoCard>
            <InfoCard title="Contacts (11) - Rec. (81)" status="Response Times"><div className="mb-2 flex items-center justify-end"><UptimeBadge /></div><div className="space-y-2"><ContactRow name="Divyansh Salni" role="Snowflake Data..." ms="-11 ms" /><ContactRow name="Sonny Bedi" role="Chief Information..." /><ContactRow name="Tim Martey" role="Director, Canada..." /><ContactRow name="Ganesh..." role="Director of Product..." ms="-11 ms" /><ContactRow name="David Johnson" role="Partner, Alliances..." /><ContactRow name="Robert..." role="Senior Global..." ms="-15 ms" /></div></InfoCard>
          </div>
          <div className="mt-5 flex items-center gap-6 overflow-x-auto border-b border-slate-200 text-xs"><Tab label="Deals" active /><Tab label="Managed Service" /><Tab label="Financial Services" /><Tab label="Healthcare Cloud" /><button className="flex shrink-0 items-center gap-1 pb-2 text-slate-500">Add deal <Plus className="h-3 w-3" /></button></div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
            <div className="min-w-0">
              <Panel title="Overview" action={<button className="flex items-center gap-1 text-[11px] text-slate-500">Edit <Pencil className="h-3 w-3" /></button>}><div className="grid grid-cols-2 gap-4 p-3 text-[11px] md:grid-cols-4"><OverviewField label="Prompt" value="Focus on the EU" /><OverviewField label="$ Value" value="$120,000.00" /><OverviewField label="Deal opportunity" value="Medium" /><OverviewField label="Target date" value="Dec 1, 2024" /></div></Panel>
              <Panel title="Incident History" className="mt-4" action={<div className="flex items-center gap-3 text-[11px] text-slate-500"><button className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button><button>{"View all ->"}</button></div>}><div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3"><IncidentCard tag="Recent Host Summary" tagColor="bg-rose-100 text-rose-700" title="Incident recent Summary" /><IncidentCard tag="Incident Insight" tagColor="bg-emerald-100 text-emerald-700" title="Incident Incident Summary" steps /><IncidentCard tag="Alert/Root" tagColor="bg-amber-100 text-amber-700" title="Alert Rules Summary" steps /></div></Panel>
              <Panel title="Info Error Logs" className="mt-4"><div className="divide-y divide-slate-100 text-[11px]"><LogRow time="2024-05-25 13:38:59 AM" msg="Data logs Summary incident" ago="1 hour ago" /><LogRow time="2024-05-25 13:32:59 AM" msg="Error logs summary incident" ago="1 hour ago" /><LogRow time="2024-05-25 13:49:39 AM" msg="Error logs summary incident" ago="3 hours ago" /><LogRow time="2024-05-25 13:48:29 AM" msg="Error logs summary incident" ago="2 hours ago" /></div></Panel>
            </div>
            <aside className="space-y-1 text-xs text-slate-700">
              <RailItem icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Deal overview" /><RailItem icon={<BarChart3 className="h-3.5 w-3.5" />} label="Market report" /><RailItem icon={<Server className="h-3.5 w-3.5" />} label="Company report" />
              <div className="pt-3 text-[11px] font-medium text-slate-800">Alert Rules</div><div className="pt-1 text-[11px] text-slate-500">Conditions</div>
              <button className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800"><span>Warning Same conditions</span><ChevronDown className="h-3 w-3" /></button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) { return <div className={`flex items-center gap-2 rounded px-2 py-1.5 ${active ? "bg-slate-200/70 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>{icon}<span>{label}</span></div>; }
function InfoCard({ title, status, children }: { title: string; status: string; children: React.ReactNode }) { return <div className="rounded-lg border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><div className="text-[11px] font-medium text-slate-700">{title}</div><div className="text-[10px] text-slate-500">{status}</div></div><div className="p-3">{children}</div></div>; }
function UptimeBadge() { return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Uptime <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>; }
function MetaCell({ label, value }: { label: string; value: string }) { return <div><div className="text-slate-400">{label}</div><div className="text-slate-700">{value}</div></div>; }
function ProductBlock({ name, bullets }: { name: string; bullets: string[] }) { return <div><div className="font-medium text-slate-800">{name}</div><ul className="mt-1 space-y-0.5 text-slate-500">{bullets.map((b) => <li key={b}>- {b}</li>)}</ul></div>; }
function ContactRow({ name, role, ms }: { name: string; role: string; ms?: string }) { return <div className="flex items-center gap-2"><div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-sky-300 to-indigo-400" /><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium text-slate-800">{name}</div><div className="truncate text-[10px] text-slate-500">{role}</div></div>{ms && <div className="text-[10px] font-medium text-rose-600">{ms}</div>}</div>; }
function Tab({ label, active }: { label: string; active?: boolean }) { return <button className={`-mb-px shrink-0 border-b-2 pb-2 ${active ? "border-blue-600 text-slate-900" : "border-transparent text-slate-500"}`}>{label}</button>; }
function Panel({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) { return <div className={`rounded-lg border border-slate-200 ${className}`}><div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><div className="text-xs font-medium text-slate-700">{title}</div>{action}</div>{children}</div>; }
function OverviewField({ label, value }: { label: string; value: string }) { return <div><div className="text-slate-400">{label}</div><div className="mt-0.5 text-slate-800">{value}</div></div>; }
function IncidentCard({ tag, tagColor, title, steps }: { tag: string; tagColor: string; title: string; steps?: boolean }) { return <div className="rounded-md border border-slate-200 p-3"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${tagColor}`}>{tag}</span><div className="mt-2 text-[12px] font-medium text-slate-800">{title}</div><p className="mt-1 text-[10px] text-slate-500">AI powered incident summary for this monitor.</p>{steps && <ul className="mt-2 space-y-1 text-[10px] text-slate-600"><li>1 Response the latest incident</li><li>2 Response thread mirror summary</li></ul>}<button className="mt-3 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-700">Response steps</button></div>; }
function LogRow({ time, msg, ago }: { time: string; msg: string; ago: string }) { return <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><div className="flex flex-wrap gap-3"><span className="text-slate-500">{time}</span><span className="text-slate-700">{msg}</span><span className="text-slate-400">{ago}</span></div><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Summary</span></div>; }
function RailItem({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-100">{icon}<span>{label}</span></div>; }

function TechStackSection() {
  const techLogos = ["NEXT.js", "▲ Vercel", "neon", "BullMQ", "upstash", "node", "Prisma", "Railway", "PostgreSQL", "docker"];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-center text-sm text-slate-500">StatusPing is built with industry-standard, high-performance tech</p>
      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-5">{techLogos.map((logo) => <div key={logo} className="flex items-center justify-center text-lg font-semibold text-slate-800">{logo}</div>)}</div>
      <div className="mt-20 text-center"><p className="text-sm font-medium tracking-wide text-indigo-500">Reactive checks are dead.</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">No Uptime? No Deal.</h2></div>
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        <FeaturePill icon={<Radar className="h-6 w-6 text-indigo-600" />} description="Continuous background pings and health checks eliminate monitoring blind spots" />
        <FeaturePill icon={<Zap className="h-6 w-6 text-indigo-600" />} description="Asynchronous job processing, database branching, and queue persistence ensure high availability" />
        <FeaturePill icon={<Megaphone className="h-6 w-6 text-indigo-600" />} description="Real-time incident updates on a public status page and instant user notifications via email and webhooks" />
      </div>
    </section>
  );
}

function FeaturePill({ icon, description }: { icon: React.ReactNode; description: string }) {
  return <div className="flex flex-col items-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50">{icon}</div><p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">{description}</p></div>;
}

const infraTabs = [
  { label: "Multi-Region Scheduled Pings", activeMonitor: "api.statusping.io/v1/health", stepResults: "Executed health checks across 12 global nodes using Undici client", logs: ["[2026-07-09 14:23:01] HTTP GET initiated via Node.js 22 native HTTP client.", "[Status] 200 OK | [Latency] 12ms | [Region] us-east-1 (Neon DB Synced)", "[Region Sync] Repeatable job metrics pushed to Redis via BullMQ scheduler.", "[2026-07-09 14:23:02] All 12 regions verified. Global SLA: 100% uptime."] },
  { label: "BullMQ Queue Worker", activeMonitor: "bullmq-worker-prod-7f8a9d", stepResults: "Active queue processing with 24 concurrent workers across 3 Redis clusters", logs: ["[2026-07-09 14:23:05] Worker pool initialized - 24 concurrent slots", "[Queue] health-check-queue - 1,247 active | 38 delayed | 2 retries", "[Throughput] 4,821 jobs/minute | Avg processing time 142ms"] },
  { label: "Incident Management Engine", activeMonitor: "incident-engine.statusping.io", stepResults: "Active incident pipeline with automated root-cause detection and escalation", logs: ["[2026-07-09 14:22:47] INC-2026-0709-0042 triggered - SEVERITY: HIGH", "[Detection] Automated root-cause: DNS resolution failure on api.statusping.io", "[2026-07-09 14:23:45] INC-0042 RESOLVED - 58s total response time"] },
  { label: "Real-Time Notification Systems", activeMonitor: "notifier.statusping.io/delivery", stepResults: "Multi-channel delivery pipeline with retry logic and queue persistence", logs: ["[2026-07-09 14:23:01] Alert batch dispatched - 14 notifications queued", "[Slack] #alerts-channel - DELIVERED | 0.12s | Webhook 200 OK", "[2026-07-09 14:23:02] Batch complete - 14/14 delivered | 0 retries | 100% success"] },
];

function InfrastructureShowcase() {
  const [activeTab, setActiveTab] = React.useState(0);
  const tab = infraTabs[activeTab];
  return (
    <section id="infrastructure" className="relative overflow-hidden bg-[#050608] py-24">
      <div className="pointer-events-none absolute -left-32 -top-32 h-[700px] w-[700px] bg-[radial-gradient(ellipse_at_center,rgba(255,220,170,0.18)_0%,rgba(255,220,170,0.06)_35%,transparent_70%)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="text-center"><p className="text-sm font-medium tracking-wide text-slate-400">Add value to every interaction</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Your AI Infrastructure Assistant</h2></div>
        <div className="mt-10 flex flex-wrap justify-center gap-2">{infraTabs.map((item, i) => <button key={item.label} onClick={() => setActiveTab(i)} className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${activeTab === i ? "bg-white/10 text-white ring-1 ring-white/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>{item.label}</button>)}</div>
        <div className="mt-8"><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }} className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"><div className="border-b border-white/[0.06] px-6 py-4"><h3 className="text-sm font-semibold text-white">Your Account&apos;s Infrastructure Status</h3></div><div className="px-6 py-5"><div className="border-b border-white/[0.06] pb-4 text-sm text-slate-300"><span className="font-medium text-slate-200">Active Monitor:</span> <span className="font-mono text-emerald-400">{tab.activeMonitor}</span></div><div className="border-b border-white/[0.06] py-4 text-sm text-slate-300"><span className="font-medium text-slate-200">Step Results:</span> {tab.stepResults}</div><div className="pt-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Logs / Output Window</p><div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0B0F14] p-4"><div className="font-mono text-xs leading-relaxed">{tab.logs.map((log) => <div key={log} className={log.includes("RESOLVED") || log.includes("success") ? "mb-1 text-emerald-400" : "mb-1 text-slate-400"}>{log}</div>)}</div></div></div></div></motion.div></AnimatePresence></div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3"><DarkStat value="<30" suffix="Seconds" title="Instant Failover Alerting Time" /><div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-blue-400/15 to-blue-700/25 p-6"><div className="relative"><div className="text-4xl font-bold text-white">99.99%</div><p className="mt-2 text-sm font-medium text-blue-200">Guaranteed Monitored SLA</p><p className="mt-1 text-xs leading-relaxed text-blue-200/70">12 concurrent global checkpoint locations eliminate false alert occurrences.</p></div></div><DarkStat value="0" suffix="Latency Overheads" title="Ultra-lightweight Native Processing" /></div>
      </div>
    </section>
  );
}

function DarkStat({ value, suffix, title }: { value: string; suffix: string; title: string }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F14]/60 p-6 transition hover:border-white/[0.14]"><div className="flex items-baseline gap-2"><span className="text-4xl font-bold text-white">{value}</span><span className="text-lg font-semibold text-slate-300">{suffix}</span></div><p className="mt-2 text-sm font-medium text-slate-300">{title}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Fast distributed worker architecture for reliable monitoring.</p></div>;
}

function FeaturesSection() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 0.85", "start 0.25"] });
  const text = "With multi-region checks, sub-minute alerts, and beautiful public status pages, StatusPing keeps your team informed before your customers notice anything is wrong.";
  return (
    <section id="features" className="bg-sky-50/50">
      <div ref={containerRef} className="mx-auto max-w-4xl px-6 py-20"><p className="mb-6 text-xs font-bold uppercase tracking-widest text-blue-500">SMARTER MONITORING</p><h2 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">{text.split("").map((char, i) => <Character key={i} char={char} index={i} total={text.length} progress={scrollYProgress} />)}</h2></div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-20 lg:grid-cols-3">
        <GlowingCard icon={<Zap className="h-5 w-5 text-blue-600" />} title="Instant Alerts" description="Get notified in under 30 seconds via Slack, PagerDuty, email, or SMS the moment any endpoint goes down." large />
        <GlowingCard icon={<Globe className="h-5 w-5 text-blue-600" />} title="Public Status Pages" description="Beautiful, customizable status pages your customers can bookmark. Auto-updates with every incident." />
        <GlowingCard icon={<ShieldCheck className="h-5 w-5 text-blue-600" />} title="Multi-Region Checks" description="Monitors run from 12 global regions simultaneously. No more false positives from a single flaky node." large />
        <GlowingCard icon={<Plug className="h-5 w-5 text-blue-600" />} title="40+ Integrations" description="Connect to Slack, PagerDuty, OpsGenie, Datadog, and 40+ tools with one click." />
        <GlowingCard icon={<Users className="h-5 w-5 text-blue-600" />} title="Team Escalation Policies" description="Route alerts to the right person on call. Set escalation chains so nothing falls through the cracks." />
      </div>
      <FeatureGrid />
    </section>
  );
}

function Character({ char, index, total, progress }: { char: string; index: number; total: number; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const opacity = useTransform(progress, [index / total, index / total + 4 / total], [0.25, 1]);
  const color = useTransform(progress, [index / total, index / total + 4 / total], ["rgb(203,213,225)", "rgb(15,23,42)"]);
  return <motion.span style={{ opacity, color }} className="inline-block">{char === " " ? "\u00A0" : char}</motion.span>;
}

function GlowingCard({ icon, title, description, large }: { icon: React.ReactNode; title: string; description: string; large?: boolean }) {
  return <div className={`group relative h-full ${large ? "lg:col-span-2" : ""}`}><div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 opacity-0 blur-md transition duration-700 group-hover:opacity-50" /><div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">{icon}</div><div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p></div></div></div>;
}

function FeatureGrid() {
  const features = [
    ["Multi-region monitoring", "12 global locations check simultaneously to eliminate false positives.", <Cloud className="h-6 w-6" />],
    ["SSL certificate alerts", "Get warned 30 days before your cert expires. Never get caught off guard.", <Sliders className="h-6 w-6" />],
    ["Custom domains", "Host your status page on status.yourcompany.com with a one-click DNS setup.", <Link className="h-6 w-6" />],
    ["Full API access", "REST API to manage monitors, incidents, and status pages programmatically.", <Terminal className="h-6 w-6" />],
    ["Webhook support", "Fire webhooks on any status change. Integrate with any tool in your stack.", <Webhook className="h-6 w-6" />],
    ["24/7 human support", "Real people available around the clock. Average response under 4 minutes.", <HelpCircle className="h-6 w-6" />],
    ["Team roles & permissions", "Granular access control. Invite unlimited teammates with viewer or admin roles.", <Heart className="h-6 w-6" />],
    ["Full audit logs", "Complete trail for every action. Know exactly who changed what and when.", <DollarSign className="h-6 w-6" />],
  ] as const;
  return <div className="mx-auto max-w-6xl px-6 pb-24"><div className="overflow-hidden rounded-xl border border-slate-100 bg-white"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">{features.map(([title, description, icon], i) => <div key={title} className={`group relative border-slate-100 p-6 transition-all hover:bg-blue-50/30 ${i % 4 !== 3 ? "lg:border-r" : ""} ${i < 4 ? "lg:border-b" : ""} border-b`}><div className="absolute left-0 top-0 h-full w-[2px] bg-transparent transition-colors group-hover:bg-blue-500" /><div className="mb-4 text-blue-500">{icon}</div><h3 className="text-base font-semibold text-slate-800">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p></div>)}</div></div></div>;
}

function CTASection() {
  const services = [
    ["Stripe API", "UP", "bg-emerald-100 text-emerald-700", "bg-emerald-500", "25ms"],
    ["Shopify Checkout", "WARNING", "bg-amber-100 text-amber-700", "bg-amber-500", "250ms"],
  ];
  return <section id="pricing" className="bg-slate-50/80 py-20"><div className="mx-auto max-w-5xl px-6 text-center"><h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">Ready to Monitor More Services?</h2><p className="mt-3 text-slate-500">Start your free trial today.</p><a href="/register" className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">Try StatusPing for Free</a></div><div className="mx-auto mt-14 max-w-5xl px-6"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="flex-1 p-5"><div className="flex flex-wrap items-center gap-3"><div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-400">Search...</span></div><button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><Filter className="h-4 w-4" /></button><button className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"><Plus className="h-3.5 w-3.5" />New Service...</button></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="pb-2 pr-4 font-medium">Service Name</th><th className="pb-2 pr-4 font-medium">Status</th><th className="pb-2 pr-4 font-medium">Latency</th><th className="pb-2 font-medium">Assigned to</th></tr></thead><tbody>{services.map(([name, status, statusColor, dotColor, latency]) => <tr key={name} className="border-b border-slate-50"><td className="py-3 pr-4 font-medium text-slate-800">{name}</td><td className="py-3 pr-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}><span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />{status}</span></td><td className="py-3 pr-4 text-slate-600">{latency}</td><td className="py-3 text-slate-500">Sarah Jenkins</td></tr>)}</tbody></table></div></div></div></div></section>;
}

function Footer() {
  const columns = { Product: ["Features", "Monitoring", "Incident Management", "Status Pages", "Roadmap"], Resources: ["Documentation", "API Reference", "Getting Started", "FAQs", "System Status"], Developers: ["GitHub", "OpenAPI", "Webhooks", "Release Notes"], Company: ["About", "Contact", "Privacy Policy", "Terms", "Careers"] };
  return <footer id="status-pages" className="relative overflow-hidden border-t border-slate-100 bg-white"><div className="mx-auto max-w-6xl px-6 py-16"><div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]"><div className="flex flex-col gap-5"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><span className="text-lg font-bold text-slate-900">StatusPing</span></div><p className="max-w-xs text-sm leading-relaxed text-slate-500">Reliable uptime monitoring and incident management for modern applications. Monitor websites, APIs, and services with automated health checks, real-time alerts, and public status pages.</p><div className="flex w-fit items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">AN</div><div><p className="text-xs font-semibold text-slate-800">Aditya Nishad</p><p className="text-[11px] text-slate-400">Mumbai, India</p></div></div></div>{Object.entries(columns).map(([title, links]) => <div key={title}><p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-900">{title}</p><ul className="space-y-2.5">{links.map((link) => <li key={link}><a href="#" className="text-sm text-slate-500 transition-colors hover:text-slate-900">{link}</a></li>)}</ul></div>)}</div><div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row"><p className="text-xs text-slate-400">© 2026 StatusPing. All rights reserved.</p><div className="flex items-center gap-3"><FaGithub className="h-4 w-4 text-slate-400" /><Mail className="h-4 w-4 text-slate-400" /></div></div></div><div className="pointer-events-none relative mx-auto max-w-6xl overflow-hidden px-6"><div className="select-none whitespace-nowrap text-center text-[6rem] font-black leading-none tracking-tight text-slate-100 sm:text-[8rem] md:text-[10rem] lg:text-[12rem]">STATUSPING</div></div></footer>;
}
