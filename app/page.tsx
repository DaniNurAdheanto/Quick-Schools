"use client";
import Image from "next/image";

import Link from "next/link";
import { 
  ArrowRight, Sparkles, CheckCircle2, ChevronRight, Menu, Play, Star,
  Users, Calendar, GraduationCap, Megaphone, Bot, LineChart, Check,
  Laptop, Smartphone, BarChart3, ShieldCheck, Zap, Globe2, Heart, Award, ArrowUpRight,
  User, CheckSquare, Clock, CreditCard, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const STAGGER_DELAY = 0.1;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-[#531FFF]/20 overflow-x-hidden">
      {/* Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
      >
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#531FFF] to-[#8C6BFF] flex items-center justify-center shadow-lg shadow-[#531FFF]/20">
                 <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">
                Quick Schools<br/>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-none block -mt-1">School Management System</span>
              </span>
           </div>
           
           <nav className="hidden lg:flex items-center gap-10">
             <Link href="#features" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">Features</Link>
             <Link href="#how-it-works" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">How It Works</Link>
             <Link href="#pricing" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">Pricing</Link>
             <Link href="#resources" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors flex items-center gap-1">
                Resources <ChevronRight className="w-4 h-4 rotate-90" />
             </Link>
           </nav>
           
           <div className="hidden lg:flex items-center gap-6">
             <Link href="/login" className="text-[14px] font-semibold text-gray-600 hover:text-[#531FFF] transition-colors">
               Sign In
             </Link>
             <Link href="/register" className="px-6 py-2.5 bg-[#531FFF] text-white rounded-full text-[14px] font-semibold hover:bg-[#4314E5] transition-colors shadow-lg shadow-[#531FFF]/25">
               Get Started Free
             </Link>
           </div>
           
           <button className="lg:hidden text-gray-900">
             <Menu className="w-6 h-6" />
           </button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-[#531FFF] relative">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-black/20 to-transparent rounded-full blur-3xl opacity-30 -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
         

         <div className="max-w-[1400px] mx-auto px-6 relative z-10 flex flex-col xl:flex-row items-center gap-16">
            
            {/* Hero Left */}
            <div className="flex-1 text-center xl:text-left pt-10">
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1, duration: 0.5 }}
                 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-[13px] font-bold mb-6 shadow-sm"
               >
                 <Star className="w-4 h-4 fill-current" />
                 Nest-Gen School Management System
               </motion.div>
               
               <motion.h1 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2, duration: 0.5 }}
                 className="text-5xl lg:text-[64px] font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
               >
                 Manage Your School<br/>
                 Smarter, Faster, and<br/>
                 <span className="text-[#FFB800]">Future-Ready</span>
               </motion.h1>
               
               <motion.p 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3, duration: 0.5 }}
                 className="text-[18px] text-white/80 mb-10 leading-relaxed max-w-xl mx-auto xl:mx-0 font-medium"
               >
                 All-in-one platform to manage attendance, academics, schedules, communication, payments, and more. Designed for modern schools.
               </motion.p>

               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4, duration: 0.5 }}
                 className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-4 mb-12"
               >
                 <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-white text-[#531FFF] rounded-full text-[15px] font-bold hover:bg-gray-50 transition-all shadow-lg flex items-center justify-center gap-2 group">
                   Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </Link>
                 <Link href="#demo" className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white rounded-full text-[15px] font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                   Request Demo
                 </Link>
               </motion.div>

               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.6, duration: 0.8 }}
                 className="flex items-center justify-center xl:justify-start gap-6"
               >
                  <div className="flex -space-x-3">
                    {['A','B','C'].map((initial, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-[#531FFF] bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-[13px] font-bold shadow-sm">
                         {initial}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex text-[#FFB800] gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <span className="text-[13px] font-semibold text-white/90">Trusted by 500+ schools in Indonesia</span>
                  </div>
               </motion.div>
            </div>

            {/* Hero Right - Enhanced Mockup composition */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex-1 w-full relative h-[450px] lg:h-[650px] hidden lg:block"
            >
               {/* Main Application Window Mockup */}
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[850px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden transform perspective-1000 rotate-y-[-5deg] rotate-x-[2deg]">
                 {/* Mock Content area representing the dashboard */}
                 <div className="flex h-[550px]">
                    {/* Mock Sidebar */}
                    <div className="w-[180px] border-r border-gray-100 p-4 pt-6 bg-gray-50/50 flex flex-col gap-5">
                       <div className="w-full h-8 bg-[#531FFF]/10 rounded-lg flex items-center px-3 gap-2">
                         <div className="w-4 h-4 rounded-sm bg-[#531FFF]/80"></div>
                         <div className="h-2 w-16 bg-[#531FFF]/60 rounded"></div>
                       </div>
                       {[...Array(6)].map((_, i) => (
                         <div key={i} className="h-8 flex items-center px-3 gap-2">
                           <div className="w-4 h-4 rounded-sm bg-gray-300"></div>
                           <div className="h-2 w-16 bg-gray-200 rounded"></div>
                         </div>
                       ))}
                    </div>
                    
                    {/* Mock Main View */}
                    <div className="flex-1 p-6 bg-white flex flex-col gap-6">
                       {/* Header mock */}
                       <div className="flex justify-between items-center mb-2">
                         <div className="h-4 w-32 bg-gray-200 rounded"></div>
                         <div className="flex gap-3">
                           <div className="w-48 h-8 rounded-full bg-gray-100 border border-gray-200"></div>
                           <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                         </div>
                       </div>

                       {/* Top stats mock */}
                       <div className="grid grid-cols-4 gap-4">
                         {[...Array(4)].map((_, i) => (
                           <div key={i} className="h-24 bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                             <div className="h-2 w-20 bg-gray-200 rounded"></div>
                             <div className="h-6 w-12 bg-gray-800 rounded"></div>
                             <div className="h-2 w-16 bg-green-200 rounded"></div>
                           </div>
                         ))}
                       </div>

                       {/* Charts Area mock */}
                       <div className="flex-1 flex gap-4">
                         <div className="flex-[2] bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col">
                           <div className="flex justify-between mb-6">
                             <div className="h-3 w-32 bg-gray-200 rounded"></div>
                             <div className="h-3 w-16 bg-gray-200 rounded"></div>
                           </div>
                           <div className="flex-1 border-b border-l border-gray-100 relative">
                              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path d="M0 100 L 10 80 L 30 90 L 50 40 L 70 70 L 90 20 L 100 20" fill="none" stroke="#531FFF" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                                <path d="M0 100 L 10 80 L 30 90 L 50 40 L 70 70 L 90 20 L 100 20 L 100 100 Z" fill="rgba(83,31,255,0.1)" />
                              </svg>
                           </div>
                         </div>
                         <div className="flex-[1.2] bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col gap-4">
                            <div className="h-3 w-24 bg-gray-200 rounded"></div>
                            {[...Array(4)].map((_, i) => (
                               <div key={i} className="flex gap-3 py-2 border-b border-gray-50 items-center">
                                 <div className="w-10 h-3 bg-gray-200 rounded"></div>
                                 <div className="flex-1">
                                    <div className="h-2.5 w-full bg-gray-800 rounded mb-1.5"></div>
                                    <div className="h-2 w-1/2 bg-gray-300 rounded"></div>
                                 </div>
                               </div>
                            ))}
                         </div>
                       </div>
                    </div>
                 </div>
               </div>

               {/* Floating Widgets */}
               {/* 1. AI Assistant Widget */}
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.6, duration: 0.6 }}
                 className="absolute -left-12 top-1/2 translate-y-20 w-[240px] bg-white rounded-2xl shadow-xl border border-[#531FFF]/10 p-5 z-20 flex flex-col gap-3"
               >
                 <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                     <Bot className="w-5 h-5 text-[#531FFF]" />
                   </div>
                   <div className="text-[13px] font-bold text-gray-900">AI Assistant</div>
                 </div>
                 <p className="text-[12px] text-gray-500 leading-relaxed font-medium">
                   You can optimize Monday&apos;s schedule by 19%
                 </p>
                 <div className="text-[12px] text-[#531FFF] font-bold flex items-center gap-1 cursor-pointer">
                   <Sparkles className="w-3.5 h-3.5" /> View Insight
                 </div>
               </motion.div>

               {/* 2. Announcement Widget */}
               <motion.div 
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.7, duration: 0.6 }}
                 className="absolute top-16 right-[-20px] w-[260px] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-20 flex flex-col gap-2"
               >
                 <div className="flex gap-3 items-center mb-1">
                   <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                     <Calendar className="w-4 h-4 text-amber-500" />
                   </div>
                   <div>
                     <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">New Announcement</div>
                     <div className="text-[13px] font-bold text-gray-900">Science Fair 2024</div>
                   </div>
                 </div>
                 <div className="text-[12px] text-gray-500 ml-11">May 25, 2024</div>
                 <div className="ml-11 mt-1 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] w-max font-bold">
                   <Clock className="w-3 h-3" /> 2 days left
                 </div>
               </motion.div>

               {/* 3. Payment Received Widget */}
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.8, duration: 0.6 }}
                 className="absolute bottom-16 right-[-40px] w-[240px] bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-20"
               >
                 <div className="flex gap-3 items-center mb-4">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                   </div>
                   <div className="text-[13px] font-bold text-gray-900">Payment Received</div>
                 </div>
                 <div className="text-[12px] text-gray-500 mb-1">From Budi Santoso</div>
                 <div className="text-xl font-bold text-gray-900 mb-1">Rp 1,250,000</div>
                 <div className="text-[11px] text-gray-400">Today, 10:30 AM</div>
               </motion.div>

            </motion.div>
         </div>
      </section>

      {/* Logging/Trusted By */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <p className="text-center text-[13px] font-bold text-gray-800 uppercase tracking-widest mb-10">Trusted by schools across Indonesia</p>
          <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {/* Using text+icon setups instead of raw images to mirror the reference roughly */}
            <div className="flex items-center gap-2 group cursor-pointer">
              <ShieldCheck className="w-8 h-8 text-blue-800" />
              <span className="font-bold text-lg text-blue-900">SMA LABSCHOOL<br/><span className="text-[10px] tracking-wide block -mt-1">JAKARTA</span></span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
               <div className="w-8 h-8 rounded bg-red-700 flex items-center justify-center text-white font-serif font-bold italic">B</div>
               <span className="font-bold text-lg text-gray-800">BINUS<br/><span className="text-[10px] text-gray-500 tracking-wide block -mt-1">SCHOOL</span></span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
               <Globe2 className="w-8 h-8 text-green-700" />
               <span className="font-bold text-lg text-gray-800">Al-Azhar<br/><span className="text-[10px] text-gray-500 tracking-wide block -mt-1">Kelapa Gading</span></span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
               <div className="w-8 h-8 flex flex-col justify-between py-1">
                 <div className="h-1.5 w-full bg-blue-900"></div>
                 <div className="h-1.5 w-8 bg-blue-900"></div>
                 <div className="h-1.5 w-full bg-blue-900"></div>
               </div>
               <span className="font-bold text-lg text-gray-800">BPK PENABUR<br/><span className="text-[10px] text-gray-500 tracking-wide block -mt-1">Jakarta</span></span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
               <GraduationCap className="w-8 h-8 text-purple-800" />
               <span className="font-bold text-lg text-gray-800 uppercase">Global Jaya<br/><span className="text-[9px] text-gray-500 tracking-widest block -mt-1">S C H O O L</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-32" id="features">
        <div className="max-w-[1400px] mx-auto px-6">
           <div className="text-center mb-20">
             <div className="inline-flex px-4 py-1.5 bg-[#F8F9FE] text-[#531FFF] border border-[#531FFF]/10 text-[12px] font-bold tracking-wider uppercase rounded-full mb-6 mt-10">
               Features
             </div>
             <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
               Everything You Need in One Platform
             </h2>
             <p className="text-[17px] text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
               Powerful features to simplify every aspect of school management.
             </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { icon: User, title: "Student Management", desc: "Manage student data, classes, enrollment, and academic records in one place." },
               { icon: CheckSquare, title: "Attendance System", desc: "Real-time attendance tracking with smart validation for accuracy and transparency." },
               { icon: Calendar, title: "Academic Scheduling", desc: "Automated class, exam, and event scheduling with drag-and-drop ease." },
               { icon: MessageCircle, title: "Communication Hub", desc: "Connect with students, parents, and teachers through announcements and messages." },
               { icon: CreditCard, title: "Finance & Payments", desc: "Manage fee collections, invoices, and payments with secure and easy tracking." },
               { icon: LineChart, title: "Reports & Analytics", desc: "Visual reports and insights to monitor performance and make data-driven decisions." },
             ].map((f, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  key={i} 
                  className="bg-white border text-center lg:text-left border-gray-100 p-10 rounded-[2rem] shadow-sm hover:shadow-[0_15px_40px_-15px_rgba(83,31,255,0.15)] hover:border-[#531FFF]/20 transition-all duration-300"
                >
                   <div className="w-16 h-16 rounded-2xl bg-[#F8F9FE] flex items-center justify-center mb-8 mx-auto lg:mx-0">
                     <f.icon className="w-8 h-8 text-[#531FFF]" strokeWidth={1.5} />
                   </div>
                   <h3 className="text-[20px] font-bold text-gray-900 mb-4">{f.title}</h3>
                   <p className="text-[15px] font-medium text-gray-500 leading-relaxed">
                     {f.desc}
                   </p>
                </motion.div>
             ))}
           </div>
        </div>
      </section>

      {/* Feature Showcase: Built for Modern Schools */}
      <section className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24 relative z-10">
           
           {/* Content Left */}
           <div className="flex-1 lg:max-w-xl">
             <div className="inline-flex px-4 py-1.5 bg-[#F8F9FE] text-[#531FFF] border border-[#531FFF]/10 text-[12px] font-bold tracking-wider uppercase rounded-full mb-8">
               Smarter School Operations <Sparkles className="w-3.5 h-3.5 ml-2 inline-block pt-[1px]"/>
             </div>
             
             <h2 className="text-4xl lg:text-[52px] font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-10">
               Built for Modern<br/>Schools Like Yours
             </h2>

             <ul className="space-y-5 mb-12">
               {[
                 "Centralized data & secure cloud access",
                 "Role-based access for staff & teachers",
                 "AI-powered insights & smart suggestions",
                 "Mobile-friendly for anytime, anywhere",
                 "Easy to use, no training needed"
               ].map((item, i) => (
                 <li key={i} className="flex items-center gap-4">
                   <div className="w-6 h-6 rounded-full bg-[#FAFAFA] border border-gray-200 flex items-center justify-center shrink-0">
                     <Check className="w-3.5 h-3.5 text-[#531FFF]" strokeWidth={3} />
                   </div>
                   <span className="text-[16px] font-semibold text-gray-700">{item}</span>
                 </li>
               ))}
             </ul>

             <button className="px-8 py-4 bg-[#531FFF] text-white rounded-full text-[15px] font-bold hover:bg-[#4314E5] transition-all shadow-lg shadow-[#531FFF]/25 flex items-center gap-2 group">
               Explore All Features <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
             </button>
           </div>

           {/* Mockup Right */}
           <div className="flex-1 relative w-full lg:min-h-[600px] flex justify-center items-center">
              
              {/* Laptop base mockup */}
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.8 }}
                 className="relative z-10 w-full max-w-[800px] aspect-[16/10] bg-black rounded-t-[2rem] border-[12px] border-black border-b-0 shadow-2xl flex flex-col overflow-hidden"
              >
                  {/* Laptop Screen Top Bar */}
                  <div className="w-full flex justify-center pb-2 bg-black absolute top-0 inset-x-0 z-20">
                     <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                  </div>
                  {/* Mock Interface Details */}
                  <div className="w-full h-full bg-[#f8fbfa] pt-6 flex flex-col relative z-10">
                     <div className="flex px-4 py-2 bg-white border-b border-gray-100 items-center justify-between">
                       <div className="flex items-center gap-3"><div className="w-4 h-4 bg-gray-300 rounded-sm"></div><span className="text-[10px] font-bold text-gray-500">Students</span></div>
                       <div className="flex gap-2">
                          <div className="h-6 w-32 bg-gray-100 rounded-full"></div>
                          <div className="h-6 w-24 bg-[#531FFF] rounded-md text-white text-[9px] flex justify-center items-center">+ Add Student</div>
                       </div>
                     </div>
                     <div className="p-4 bg-white flex-1 overflow-hidden">
                        <div className="flex border-b border-gray-100 pb-2 mb-3">
                          <div className="w-1/4 text-[10px] font-bold text-gray-400">Student Name</div>
                          <div className="w-1/4 text-[10px] font-bold text-gray-400">Class</div>
                          <div className="w-1/4 text-[10px] font-bold text-gray-400">Attendance</div>
                          <div className="w-1/4 text-[10px] font-bold text-gray-400">Status</div>
                        </div>
                        {[1,2,3,4,5].map(i => (
                           <div key={i} className="flex border-b border-gray-50 py-3 items-center">
                              <div className="w-1/4 flex gap-2 items-center"><div className="w-6 h-6 rounded-full bg-gray-200"></div><div className="h-2 w-16 bg-gray-800 rounded"></div></div>
                              <div className="w-1/4"><div className="h-2 w-10 bg-gray-500 rounded"></div></div>
                              <div className="w-1/4 text-[11px] font-bold">{100 - i}%</div>
                              <div className="w-1/4"><div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[9px] w-max font-bold">● Active</div></div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="h-4 w-[110%] -ml-[5%] bg-gray-400 absolute bottom-0 rounded-b-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-30"></div>
              </motion.div>

              {/* Mobile Mockup overlapping right */}
              <motion.div 
                 initial={{ opacity: 0, y: 50 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.3, duration: 0.8 }}
                 className="absolute -right-6 lg:-right-4 -bottom-10 lg:-bottom-16 w-[180px] lg:w-[220px] aspect-[9/19] bg-white rounded-[3rem] border-[8px] border-black shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-30 overflow-hidden flex flex-col"
              >
                  <div className="w-full flex justify-center pt-2 pb-1 bg-white absolute top-0 inset-x-0 z-20">
                     <div className="w-20 h-5 bg-black rounded-full"></div>
                  </div>
                  <div className="mt-10 px-4 flex flex-col gap-3">
                     <div className="h-3 w-16 bg-gray-800 rounded mb-2"></div>
                     <div className="h-20 w-full bg-purple-50 rounded-xl border border-purple-100 p-3">
                        <div className="h-2 w-20 bg-gray-400 rounded mb-6"></div>
                        <div className="text-xl font-bold text-gray-900">98%</div>
                     </div>
                     <div className="h-32 w-full bg-white rounded-xl border border-gray-100 p-3 flex flex-col justify-end">
                        <div className="w-full h-[60%] border-b border-l border-gray-100 relative mt-auto">
                           <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                             <path d="M0 100 L 20 70 L 40 85 L 60 50 L 80 60 L 100 20" fill="none" stroke="#531FFF" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
                           </svg>
                        </div>
                     </div>
                  </div>
              </motion.div>
              
              {/* Floating decorative elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-0 w-20 h-20 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center z-40"
              >
                 <span className="text-2xl font-bold text-[#531FFF]">Ai<Sparkles className="w-4 h-4 text-[#FFB800] inline absolute top-5 right-4" /></span>
              </motion.div>
           </div>
        </div>
      </section>

      {/* Stats Banner Gradient */}
      <section className="py-20 bg-gradient-to-r from-[#5013F1] to-[#713EE5] text-white">
         <div className="max-w-[1400px] mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-white/20 text-center">
               {[
                 { icon: Award, label: "500+", desc: "Schools Trusted" },
                 { icon: User, label: "50,000+", desc: "Students Managed" },
                 { icon: Heart, label: "98%", desc: "Customer Satisfaction" },
                 { icon: ShieldCheck, label: "24/7", desc: "Support Available" },
               ].map((s, i) => (
                 <div key={i} className="flex flex-col items-center gap-3">
                    <s.icon className="w-8 h-8 text-white/80" strokeWidth={1.5} />
                    <div>
                      <div className="text-3xl lg:text-[40px] font-extrabold tracking-tight">{s.label}</div>
                      <div className="text-[15px] text-white/80 font-medium mt-1">{s.desc}</div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F8F9FE] py-32" id="testimonials">
         <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-16 lg:items-center">
               <div className="lg:w-1/3">
                  <div className="inline-flex px-4 py-1.5 bg-white text-[#531FFF] border border-[#531FFF]/10 text-[12px] font-bold tracking-wider uppercase rounded-full mb-6">
                    Testimonials
                  </div>
                  <h2 className="text-4xl lg:text-[48px] font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8">
                    Loved by<br/>Educators
                  </h2>
               </div>

               <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { quote: "Quick Schools has transformed the way we manage our school. It's efficient, intuitive, and the support is amazing!", name: "Indra Gunawan", role: "Principal", school: "SMA Global Mandiri", avatar: 12 },
                    { quote: "Scheduling, attendance, reports — everything is now automated. Saves us so much time!", name: "Rina Marlina", role: "Academic Coordinator", school: "SMP Al-Azhar 1", avatar: 41 },
                    { quote: "The best investment for our school. Parents love the communication features!", name: "Fauzi Rahman", role: "Vice Principal", school: "BPK Penabur", avatar: 33 },
                  ].map((t, i) => (
                     <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <p className="text-[15px] font-medium text-gray-600 leading-relaxed italic mb-8">&quot;{t.quote}&quot;</p>
                        <div className="flex items-center gap-4">
                            <Image src={`https://i.pravatar.cc/100?img=${t.avatar}`} alt={t.name} className="w-12 h-12 rounded-full object-cover bg-gray-100" fill referrerPolicy="no-referrer" />
                           <div>
                             <div className="font-bold text-[14px] text-gray-900">{t.name}</div>
                             <div className="text-[12px] text-gray-500 font-medium">{t.role}</div>
                             <div className="text-[12px] text-gray-500">{t.school}</div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
            
            {/* Pagination dots (visual only for mockup) */}
            <div className="flex justify-center gap-2 mt-16">
               <div className="w-2.5 h-2.5 rounded-full bg-[#531FFF]"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
            </div>
         </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-32" id="pricing">
         <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
               <div>
                 <div className="inline-flex px-4 py-1.5 bg-[#F8F9FE] text-[#531FFF] border border-[#531FFF]/10 text-[12px] font-bold tracking-wider uppercase rounded-full mb-6 mt-10">
                   Pricing
                 </div>
                 <h2 className="text-4xl lg:text-[48px] font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                   Simple, Transparent<br/>Pricing
                 </h2>
               </div>
               
               {/* Toggle visual */}
               <div className="flex items-center gap-2 mb-4">
                  <div className="text-[14px] font-bold text-gray-500">Monthly</div>
                  <div className="w-12 h-6 bg-[#531FFF] rounded-full p-1 relative cursor-pointer">
                     <div className="w-4 h-4 rounded-full bg-white absolute right-1"></div>
                  </div>
                  <div className="text-[14px] font-bold text-gray-900">Yearly <span className="text-[#531FFF] font-bold ml-1 text-[12px]">-20% Off</span></div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
               {/* Starter */}
               <div className="border border-gray-200 rounded-[2rem] p-10 bg-white">
                  <div className="text-[18px] font-bold text-gray-900">Starter</div>
                  <div className="text-[14px] font-medium text-gray-500 mb-6">Perfect for small schools</div>
                  <div className="flex items-baseline gap-1 mb-8">
                     <span className="text-[40px] font-extrabold text-gray-900">Rp 0</span>
                     <span className="text-[14px] font-bold text-gray-500">/month</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                     {["Up to 100 Students", "Attendance System", "Basic Reports", "Email Support"].map((item, i) => (
                        <li key={i} className="flex gap-3 items-center">
                           <div className="w-5 h-5 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
                               <Check className="w-3 h-3 text-[#531FFF]" strokeWidth={3} />
                           </div>
                           <span className="text-[14px] font-medium text-gray-600">{item}</span>
                        </li>
                     ))}
                  </ul>
                  <button className="w-full py-4 rounded-xl border-2 border-[#531FFF] text-[#531FFF] font-bold text-[15px] hover:bg-[#531FFF]/5 transition-colors">
                    Start Free Trial
                  </button>
               </div>

               {/* Pro (Most Popular) */}
               <div className="border-2 border-[#531FFF] rounded-[2rem] p-10 bg-white shadow-2xl relative transform lg:scale-105 z-10">
                  <div className="absolute -top-4 right-8 bg-[#531FFF] text-white px-4 py-1 rounded-full text-[12px] font-bold tracking-wide uppercase">
                    Most Popular
                  </div>
                  <div className="text-[18px] font-bold text-gray-900">Pro</div>
                  <div className="text-[14px] font-medium text-gray-500 mb-6">Best for growing schools</div>
                  <div className="flex items-baseline gap-1 mb-8">
                     <span className="text-[40px] font-extrabold text-gray-900">Rp 199,000</span>
                     <span className="text-[14px] font-bold text-gray-500">/month</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                     {["Up to 1,000 Students", "All Starter Features", "AI Schedule Assistant", "Advanced Analytics", "Priority Support"].map((item, i) => (
                        <li key={i} className="flex gap-3 items-center">
                           <div className="w-5 h-5 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
                               <Check className="w-3 h-3 text-[#531FFF]" strokeWidth={3} />
                           </div>
                           <span className="text-[14px] font-bold text-gray-900">{item}</span>
                        </li>
                     ))}
                  </ul>
                  <button className="w-full py-4 rounded-xl bg-[#531FFF] text-white font-bold text-[15px] shadow-lg shadow-[#531FFF]/30 hover:bg-[#4314E5] transition-colors">
                    Start Free Trial
                  </button>
               </div>

               {/* Enterprise */}
               <div className="border border-gray-200 rounded-[2rem] p-10 bg-white">
                  <div className="text-[18px] font-bold text-gray-900">Enterprise</div>
                  <div className="text-[14px] font-medium text-gray-500 mb-6">For large institutions</div>
                  <div className="flex items-baseline gap-1 mb-8">
                     <span className="text-[32px] font-extrabold text-gray-900 pt-2">Custom Pricing</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                     {["Unlimited Students", "Custom Integrations", "Dedicated Support", "SLA Guarantee", "All Pro Features"].map((item, i) => (
                        <li key={i} className="flex gap-3 items-center">
                           <div className="w-5 h-5 rounded-full bg-[#531FFF]/10 flex items-center justify-center shrink-0">
                               <Check className="w-3 h-3 text-[#531FFF]" strokeWidth={3} />
                           </div>
                           <span className="text-[14px] font-medium text-gray-600">{item}</span>
                        </li>
                     ))}
                  </ul>
                  <button className="w-full py-4 rounded-xl border border-gray-200 text-gray-900 font-bold text-[15px] hover:border-gray-900 hover:bg-gray-50 transition-all">
                    Contact Sales
                  </button>
               </div>
            </div>
            
            <p className="text-center text-[13px] text-gray-500 mt-10 font-medium">All plans include 14-day free trial. No credit card required.</p>
         </div>
      </section>

      {/* CTA Pre Footer */}
      <section className="bg-white px-6 pb-20">
         <div className="max-w-[1400px] mx-auto bg-gradient-to-r from-[#4E11F4] to-[#6A39E9] rounded-[2rem] p-12 lg:p-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Shapes */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3"></div>
            
            <div className="relative z-10 max-w-xl text-center md:text-left">
               <h2 className="text-3xl md:text-[40px] font-extrabold text-white leading-[1.2] mb-6">
                 Ready to Transform<br/>Your School?
               </h2>
               <p className="text-[16px] text-white/80 font-medium mb-10">
                 Join hundreds of schools already using Quick Schools to create better academic experiences.
               </p>
               <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button className="px-8 py-4 bg-white text-[#531FFF] rounded-full font-bold text-[15px] shadow-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </button>
                  <button className="px-8 py-4 bg-transparent border border-white/30 text-white rounded-full font-bold text-[15px] hover:bg-white/10 transition-colors">
                    Talk to Sales
                  </button>
               </div>
            </div>
            
            <div className="relative z-10 hidden lg:block">
               {/* Simulated illustration of graduation cap / books via abstract shapes */}
               <div className="relative w-64 h-64">
                  <div className="absolute bottom-10 left-0 w-64 h-16 bg-[#3B0ABB] rounded-xl transform rotate-[-15deg] shadow-2xl border-t border-white/10"></div>
                  <div className="absolute bottom-16 left-4 w-56 h-16 bg-[#4A16DB] rounded-xl transform rotate-[-8deg] shadow-2xl border-t border-white/10"></div>
                  {/* Grad cap top */}
                  <div className="absolute top-10 left-12 w-40 h-40 bg-[#1D084A] transform rotate-45 skew-x-12 skew-y-12 border-2 border-[#531FFF] rounded-md shadow-2xl"></div>
                  {/* Tassel */}
                  <div className="absolute top-28 left-40 w-1 max-h-[80px] bg-[#FFB800] rounded flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[#FFB800] -mt-1"></div>
                    <div className="h-full w-full bg-[#FFB800]"></div>
                    <div className="w-4 h-8 bg-[#FFB800] rounded-b-sm mt-auto shadow-sm"></div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A071B] pt-24 pb-12 text-gray-400">
         <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-20 lg:gap-8">
            <div className="lg:col-span-2">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#531FFF] to-[#8C6BFF] flex items-center justify-center">
                   <Zap className="w-4 h-4 text-white" />
                 </div>
                 <span className="font-bold text-[18px] text-white tracking-tight leading-snug">
                   Quick Schools<br/>
                   <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest block -mt-1">School Management System</span>
                 </span>
               </div>
               <p className="text-[13px] mb-8 max-w-sm leading-relaxed">
                 Empowering schools to work smarter, not harder.
               </p>
               <div className="flex gap-3">
                  {/* Social links (simulated) */}
                  {['f', 't', 'y', 'i'].map((i, index) => (
                    <a key={index} href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#531FFF] hover:text-white transition-all text-sm font-serif">
                       {i}
                    </a>
                  ))}
               </div>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Pricing", "Updates"] },
              { title: "Company", links: ["About Us", "Careers", "Contact"] },
              { title: "Resources", links: ["Blog", "Help Center", "Guides"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
            ].map((col, i) => (
               <div key={i}>
                  <h4 className="font-bold text-white text-[15px] mb-6">{col.title}</h4>
                  <ul className="space-y-4 text-[14px] font-medium">
                     {col.links.map(link => (
                        <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                     ))}
                  </ul>
               </div>
            ))}

            <div className="lg:col-span-1 hidden xl:block">
               <h4 className="font-bold text-white text-[15px] mb-6">Newsletter</h4>
               <p className="text-[13px] mb-4">Get the latest updates</p>
               <div className="relative">
                  <input type="email" placeholder="Enter your email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-[#531FFF]" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>
         
         <div className="max-w-[1400px] mx-auto px-6 pt-8 border-t border-white/10 text-center text-[13px] font-medium">
            © {new Date().getFullYear()} Quick Schools. All rights reserved.
         </div>
      </footer>
    </div>
  );
}
