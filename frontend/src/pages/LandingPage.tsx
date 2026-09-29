import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Cpu,
  Flame,
  Activity,
  ArrowRight,
  Sliders,
  AlertTriangle,
  Award,
  Sparkles,
  BarChart3,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Emblems mocked
const ministryEmblem = 'https://placehold.co/100x100?text=Govt';
const oilIndiaLogo = 'https://placehold.co/100x100?text=OIL';
const m1 = 'https://placehold.co/100x100?text=m1';
const m2 = 'https://placehold.co/100x100?text=m2';
const m7 = 'https://placehold.co/100x100?text=m7';
const m8 = 'https://placehold.co/100x100?text=m8';
const m9 = 'https://placehold.co/100x100?text=m9';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'thermal' | 'srp' | 'twin' | 'ai'>('thermal');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');

  useEffect(() => {
    // Ensure clean light theme is active for the landing page
    document.documentElement.classList.remove('dark');

    // Dynamically scale root document font size so ALL Tailwind rem utilities scale
    if (fontSize === 'small') {
      document.documentElement.style.fontSize = '85%';
    } else if (fontSize === 'large') {
      document.documentElement.style.fontSize = '118%';
    } else {
      document.documentElement.style.fontSize = '100%';
    }

    return () => {
      // Reset root font size on unmount
      document.documentElement.style.fontSize = '';
    };
  }, [fontSize]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const marqueeLogos = [
    { src: ministryEmblem, alt: 'Ministry of Petroleum & Natural Gas' },
    { src: m1, alt: 'myGov' },
    { src: m2, alt: 'india.gov.in' },
    { src: m7, alt: 'Make in India' },
    { src: m8, alt: 'Indian Railways' },
    { src: m9, alt: 'Digital India' },
  ];

  const solutionPillars = [
    {
      id: 'thermal',
      title: 'Cyclic Steam Optimization (CSS)',
      subtitle: 'Thermal EOR & Reservoir Heating',
      desc: 'Optimizes steam injection volume, soak time, and production cut-off based on radial steam plume temperature falloff predictions.',
      icon: Flame,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-300',
      badgeColor: 'text-amber-800 bg-amber-100 border-amber-300',
      highlights: [
        'Predictive radial steam plume isotherms (R = 18.4m)',
        'Arrhenius crude viscosity falloff calculation',
        'Steam-Oil Ratio (SOR) minimization & energy tracking',
      ],
    },
    {
      id: 'srp',
      title: 'SRP Lift Kinematics & Rod Safety',
      subtitle: 'Downhole Pump & Rod Protection',
      desc: 'Continuous dynamometer load loop decomposition to detect downstroke rod floating, fluid pound, and Goodman fatigue limits.',
      icon: Activity,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-300',
      badgeColor: 'text-emerald-800 bg-emerald-100 border-emerald-300',
      highlights: [
        'Automated VFD stroke speed & SPM optimization',
        'Traveling valve compression phase analysis',
        '3-Tier Goodman stress tracking for Norris 97 alloy',
      ],
    },
    {
      id: 'twin',
      title: '4-Tier Coupled Digital Twin',
      subtitle: 'Subsurface Reservoir to Surface Gathering',
      desc: 'Seamless data bridge linking subsurface reservoir physics, vertical multiphase hydrodynamics, SRP dynamics, and surface production.',
      icon: Cpu,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-300',
      badgeColor: 'text-cyan-800 bg-cyan-100 border-cyan-300',
      highlights: [
        'Physics-Informed Neural Network (PINN) solver',
        'Newton-Raphson continuous PDE convergence (L2 < 1e-4)',
        'Coriolis skid production rate reconciliation (184.2 BOPD)',
      ],
    },
    {
      id: 'ai',
      title: 'Prescriptive AI & Safety Guardrails',
      subtitle: 'Explainable AI & Emergency SOS',
      desc: 'Actionable operational guidance backed by physics-informed explainability and deterministic manual emergency SOS triage.',
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-300',
      badgeColor: 'text-purple-800 bg-purple-100 border-purple-300',
      highlights: [
        'Prescriptive VFD speed recommendations (e.g. 7.8 SPM)',
        'Multi-physics causal chain root-cause attribution',
        'Human-triggered SOS independent of ML model state',
      ],
    },
  ];

  return (
    <div
      className={`min-h-screen bg-[#F4F6F8] text-[#17212B] font-sans selection:bg-amber-500/20 transition-all duration-200`}
      style={{
        fontSize: fontSize === 'small' ? '88%' : fontSize === 'large' ? '114%' : '100%',
      }}
    >
      {/* 0. Indian Flag Tricolor Top Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      {/* 1. Official Indian Government Top Bar (Rich Emerald Header) */}
      <div className="bg-[#047857] text-white text-xs px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-xs tracking-wide text-white">
              भारत सरकार | Government of India
            </span>
            <span className="text-[11px] font-semibold text-emerald-100">
              ऑयल इंडिया लिमिटेड · पेट्रोलियम एवं प्राकृतिक गैस मंत्रालय | Ministry of Petroleum & Natural Gas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-emerald-100">
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <button
              onClick={() => setFontSize('small')}
              className={`px-2 py-0.5 rounded transition-colors ${
                fontSize === 'small'
                  ? 'bg-emerald-950 text-white font-black ring-1 ring-white/60'
                  : 'hover:bg-emerald-900/50 text-emerald-100'
              }`}
              title="Decrease text size (A-)"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-0.5 rounded transition-colors ${
                fontSize === 'normal'
                  ? 'bg-emerald-950 text-white font-black ring-1 ring-white/60'
                  : 'hover:bg-emerald-900/50 text-emerald-100'
              }`}
              title="Normal text size (A)"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-0.5 rounded transition-colors ${
                fontSize === 'large'
                  ? 'bg-emerald-950 text-white font-black ring-1 ring-white/60'
                  : 'hover:bg-emerald-900/50 text-emerald-100'
              }`}
              title="Increase text size (A+)"
            >
              A+
            </button>
          </div>
          <span className="text-emerald-400">|</span>
          <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold shadow-2xs">
            SIH 2026 · Problem Statement #26120
          </span>
        </div>
      </div>

      {/* 2. Pure White Surface Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E6EA] px-4 lg:px-8 py-3 flex items-center justify-between shadow-subtle">
        <div className="flex items-center gap-3">
          <img
            src={oilIndiaLogo}
            alt="Oil India Limited Logo"
            className="h-10 w-auto object-contain rounded-xl border border-[#E2E6EA] p-1 bg-white shadow-2xs"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-black text-sm md:text-base tracking-tight text-[#17212B] uppercase">
              WAGHERAOS <span className="text-[#C69A45] font-extrabold text-xs">PORTAL</span>
            </span>
            <span className="text-[10.5px] font-bold text-[#66717C] tracking-wide uppercase">
              Baghewala Heavy Oil Field · Oil India Limited
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-[#66717C]">
            <button onClick={() => scrollToSection('overview')} className="hover:text-[#C69A45] transition-colors font-bold cursor-pointer">Overview</button>
            <button onClick={() => scrollToSection('pillars')} className="hover:text-[#C69A45] transition-colors font-bold cursor-pointer">Solution Pillars</button>
            <button onClick={() => scrollToSection('problem-context')} className="hover:text-[#C69A45] transition-colors font-bold cursor-pointer">Field Specifications</button>
            <button onClick={() => scrollToSection('marquee')} className="hover:text-[#C69A45] transition-colors font-bold cursor-pointer">Govt Initiatives</button>
          </nav>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/field-map')}
            className="px-3.5 py-1.5 rounded-xl bg-[#C69A45] hover:bg-[#B58B3A] text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Oil Field Map Workspace"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </header>

      {/* 3. Light Hero Section */}
      <section id="overview" className="scroll-mt-24 relative overflow-hidden py-14 lg:py-18 px-4 lg:px-8 border-b border-[#E2E6EA] bg-gradient-to-b from-[#F4F6F8] via-white to-[#F4F6F8]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold shadow-2xs">
              <Award className="w-4 h-4 text-[#C69A45]" />
              <span>Smart India Hackathon 2026 · Software Category · SIH26120</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17212B] tracking-tight leading-[1.15]">
              AI-Enabled Digital Twin for <span className="bg-gradient-to-r from-[#C69A45] via-amber-600 to-emerald-600 bg-clip-text text-transparent">CSS & SRP Operations</span>
            </h1>

            <p className="text-[#66717C] text-sm sm:text-base leading-relaxed font-medium">
              Engineered for <strong>Oil India Limited</strong> to optimize heavy crude (17–19° API) recovery in Rajasthan’s Baghewala Field. Integrates reservoir thermal dynamics, downhole viscosity modeling, SRP rod kinematics, and surface production networks.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E6EA] shadow-xs">
                <span className="text-[10px] text-[#8B949E] font-bold uppercase block">Field API</span>
                <span className="text-base font-black text-[#C69A45] mt-0.5 block">17–19° API</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E6EA] shadow-xs">
                <span className="text-[10px] text-[#8B949E] font-bold uppercase block">Reservoir Temp</span>
                <span className="text-base font-black text-emerald-600 mt-0.5 block">46–48 °C</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E6EA] shadow-xs">
                <span className="text-[10px] text-[#8B949E] font-bold uppercase block">Coupled Twins</span>
                <span className="text-base font-black text-blue-600 mt-0.5 block">4 Models</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E6EA] shadow-xs">
                <span className="text-[10px] text-[#8B949E] font-bold uppercase block">Accuracy</span>
                <span className="text-base font-black text-amber-600 mt-0.5 block">95.8% MAPE</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/field-map')}
                className="px-6 py-3.5 rounded-xl bg-[#C69A45] hover:bg-[#B58B3A] text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Open Field Map Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <button
                type="button"
                onClick={() => scrollToSection('pillars')}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-[#17212B] font-bold text-xs sm:text-sm border border-[#E2E6EA] transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
              >
                <span>Explore Solution Pillars</span>
                <ArrowRight className="w-4 h-4 text-[#C69A45]" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-white border border-[#E2E6EA] p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6EA] pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-[#17212B]">SCADA TELEMETRY 2.0s OK</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#C69A45] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  BW-017 LIVE
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA] flex items-center justify-between">
                  <span className="text-[#66717C] font-sans font-semibold">Crude Viscosity</span>
                  <span className="text-amber-600 font-bold">84.0 cP (+11% drag)</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA] flex items-center justify-between">
                  <span className="text-[#66717C] font-sans font-semibold">Bottomhole Temp (BHT)</span>
                  <span className="text-emerald-600 font-bold">214.8 °C (Cooling)</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA] flex items-center justify-between">
                  <span className="text-[#66717C] font-sans font-semibold">SRP Barrel Fillage</span>
                  <span className="text-rose-600 font-bold">84.6% (Fluid Pound @ 2.80m)</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA] flex items-center justify-between">
                  <span className="text-[#66717C] font-sans font-semibold">Net Oil Production</span>
                  <span className="text-blue-600 font-bold">184.2 BOPD (Pred 198.0)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-sans space-y-1">
                <span className="font-bold block text-amber-800 uppercase text-[10px] tracking-wider">
                  AI Prescriptive Optimization
                </span>
                <p className="text-[#17212B] leading-snug text-[11.5px] font-medium">
                  Trim VFD speed from 8.4 to 7.8 SPM to eliminate downstroke fluid pound & extend Goodman rod fatigue life by +24%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Solution Pillars Interactive Section */}
      <section id="pillars" className="scroll-mt-24 py-16 px-4 lg:px-8 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-[#C69A45] text-xs font-mono font-black tracking-widest uppercase">
            Multi-Physics Engineering Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#17212B]">
            Four Core Pillars of the Digital Twin Solution
          </h2>
          <p className="text-[#66717C] text-xs sm:text-sm max-w-2xl mx-auto">
            Addressing CSS steam cycle optimization, sucker rod pump mechanical reliability, and multi-physics AI prediction.
          </p>
        </div>

        {/* Pillar Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white border border-[#E2E6EA] max-w-2xl mx-auto shadow-2xs">
          {solutionPillars.map((pillar) => {
            const Icon = pillar.icon;
            const isSelected = activeTab === pillar.id;
            return (
              <button
                key={pillar.id}
                onClick={() => setActiveTab(pillar.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#C69A45] text-white shadow-md font-black'
                    : 'text-[#66717C] hover:text-[#17212B] hover:bg-[#F8F9FA]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#C69A45]'}`} />
                <span>{pillar.title.split(' ')[0]} {pillar.title.split(' ')[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Pillar Content Card */}
        <AnimatePresence mode="wait">
          {solutionPillars
            .filter((p) => p.id === activeTab)
            .map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`p-6 sm:p-8 rounded-2xl border bg-white ${pillar.borderColor} shadow-card grid grid-cols-1 md:grid-cols-12 gap-8 items-center`}
                >
                  <div className="md:col-span-8 space-y-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border inline-block ${pillar.badgeColor}`}>
                      {pillar.subtitle}
                    </span>

                    <h3 className="text-xl sm:text-2xl font-black text-[#17212B]">
                      {pillar.title}
                    </h3>

                    <p className="text-[#66717C] text-sm leading-relaxed font-medium">
                      {pillar.desc}
                    </p>

                    <div className="space-y-2 pt-2">
                      {pillar.highlights.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs font-bold text-[#17212B]">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-4 flex justify-center">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-[#F8F9FA] border border-[#E2E6EA] shadow-card flex items-center justify-center text-[#C69A45]">
                      <Icon className="w-12 h-12 sm:w-16 sm:h-16" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </section>

      {/* 5. SIH Problem Statement Details */}
      <section id="problem-context" className="scroll-mt-24 py-16 px-4 lg:px-8 max-w-6xl mx-auto space-y-8 border-t border-[#E2E6EA]">
        <div className="text-center space-y-3">
          <span className="text-emerald-700 text-xs font-mono font-bold tracking-widest uppercase">
            SIH26120 Specifications
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#17212B]">
            Baghewala Field Operational Context & Objectives
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E2E6EA] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black">
              1
            </div>
            <h3 className="font-bold text-base text-[#17212B]">Heavy Oil Recovery</h3>
            <p className="text-xs text-[#66717C] leading-relaxed font-medium">
              Jodhpur Sandstone produces heavy crude (17–19° API) under low reservoir temperature (46–48°C), requiring Cyclic Steam Stimulation (CSS) to mobilize fluids.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E2E6EA] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-black">
              2
            </div>
            <h3 className="font-bold text-base text-[#17212B]">Rod Floating Prevention</h3>
            <p className="text-xs text-[#66717C] leading-relaxed font-medium">
              As steam chamber cools, crude viscosity surges—causing downstroke rod drag, rod floating, Traveling Valve impact, and frequent mechanical failures.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E2E6EA] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black">
              3
            </div>
            <h3 className="font-bold text-base text-[#17212B]">Predictive SOR Optimization</h3>
            <p className="text-xs text-[#66717C] leading-relaxed font-medium">
              Continuous multi-physics coupling minimizes Steam-Oil Ratio (SOR) and VFD energy consumption while maximizing total cumulative oil output.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Call to Action Banner (Light Scheme Matching Workstation) */}
      <section className="py-14 px-4 lg:px-8 bg-white border-y border-[#E2E6EA] text-center space-y-5">
        <div className="max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 border border-amber-200 text-[#C69A45] inline-block">
            Production & Technical Workstation
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#17212B] tracking-tight">
            Ready to Explore the Baghewala WagheraOS Workstation?
          </h2>
          <p className="text-[#66717C] font-medium text-xs sm:text-sm max-w-xl mx-auto">
            Access live 7-well surveillance maps, interactive dynamometer cards, steam injection cycle trackers, and AI prescriptive recommendations.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/field-map')}
          className="px-8 py-3.5 rounded-xl bg-[#C69A45] hover:bg-[#B58B3A] text-white font-extrabold text-sm shadow-lg shadow-amber-600/20 inline-flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>Open Field Map Workspace</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.button>
      </section>

      {/* 8. INFINITE MARQUEE LOGO BANNER (Placed at the very bottom before footer) */}
      <section id="marquee" className="py-7 bg-white border-b border-[#E2E6EA] overflow-hidden select-none">
        <div className="max-w-6xl mx-auto px-4 mb-3 text-center">
          <span className="text-[11px] font-black text-[#8B949E] uppercase tracking-widest block">
            Government of India Portals & Digital Initiatives
          </span>
        </div>

        {/* Infinite CSS Marquee Wrapper */}
        <div className="relative w-full overflow-hidden">
          <div className="animate-marquee flex items-center gap-8 py-2">
            {[...marqueeLogos, ...marqueeLogos, ...marqueeLogos].map((logo, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="h-16 px-6 py-2 rounded-xl bg-[#F8F9FA] flex items-center justify-center border border-[#E2E6EA] shadow-2xs shrink-0"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="h-10 w-auto object-contain max-w-[140px]"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Official Government Footer */}
      <footer className="bg-white border-t border-[#E2E6EA] py-8 px-4 lg:px-8 space-y-4 text-xs text-[#66717C]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={ministryEmblem} alt="Ministry Emblem" className="h-8 w-auto object-contain rounded border border-[#E2E6EA] p-0.5" />
            <span className="font-semibold">© 2026 Oil India Limited · Ministry of Petroleum & Natural Gas · Govt of India</span>
          </div>
          <button
            onClick={() => navigate('/field-map')}
            className="text-[#C69A45] font-black hover:underline cursor-pointer"
          >
            Open Live Workstation (Field Map) →
          </button>
        </div>
      </footer>
    </div>
  );
};
