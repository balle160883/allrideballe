import React from 'react';
import { Car, ShieldCheck, Zap, Globe, ArrowRight, Smartphone, Map as MapIcon, Users } from 'lucide-react';

const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Navbar Discreta */}
      <nav className="fixed top-0 w-full z-50 p-6 flex justify-between items-center backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black">A</div>
          <span className="text-xl font-black tracking-tighter uppercase">AllRide</span>
        </div>
        <button 
          onClick={onStart}
          className="px-6 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full hover:bg-indigo-500 hover:text-white transition-all"
        >
          Lanzar App
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent -z-10" />
        
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Zap size={14} /> La nueva era de la movilidad
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
            Muevete con <br /> <span className="text-indigo-500">Inteligencia.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium mb-12">
            La plataforma premium de transporte colaborativo. <br className="hidden md:block" /> 
            Viajes seguros, en tiempo real y con una experiencia de otro nivel.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all flex items-center justify-center gap-3 group"
            >
              Comenzar ahora <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-10 py-5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl transition-all">
              Saber más
            </button>
          </div>
        </div>

        {/* Preview App Floating */}
        <div className="mt-20 max-w-5xl mx-auto relative group">
           <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full -z-10" />
           <div className="bg-slate-900/80 border border-white/10 rounded-[48px] p-4 backdrop-blur-3xl shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center">
                 <MapIcon size={64} className="text-indigo-500 mx-auto mb-4 opacity-50" />
                 <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Interfaz en tiempo real</p>
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { title: 'Seguridad Total', desc: 'Conductores 100% verificados y monitoreo GPS en tiempo real para tu tranquilidad.', icon: ShieldCheck, color: 'text-emerald-400' },
            { title: 'Velocidad Rayo', desc: 'Algoritmos de optimización de rutas que te aseguran llegar a tu destino más rápido.', icon: Zap, color: 'text-amber-400' },
            { title: 'Red Global', desc: 'Una comunidad en crecimiento conectando miles de destinos en tu ciudad.', icon: Globe, color: 'text-indigo-400' },
          ].map((feat, i) => (
            <div key={i} className="group p-10 bg-slate-900 border border-white/5 rounded-[40px] hover:border-indigo-500/30 transition-all">
              <div className={`w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 ${feat.color} group-hover:scale-110 transition-transform`}>
                <feat.icon size={28} />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-4">{feat.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-20">
          <div className="text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Impulsando el futuro <br /> de la movilidad.</h2>
            <p className="text-slate-500 max-w-md">Nuestros números hablan por sí solos. AllRide no es solo una app, es una revolución logística.</p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            {[
              { label: 'Viajes hoy', value: '12K', icon: Car },
              { label: 'Usuarios', value: '1.2M', icon: Users },
            ].map((stat, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 text-indigo-500 mb-2 font-black uppercase tracking-widest text-[10px]">
                   <stat.icon size={14} /> {stat.label}
                </div>
                <div className="text-5xl font-black tracking-tighter">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 text-center text-slate-600">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-black text-xs">A</div>
          <span className="text-sm font-black tracking-tighter uppercase text-slate-500">AllRide 2026</span>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase mb-4">Diseñado para la excelencia logistica</p>
        <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest">
           <a href="#" className="hover:text-white transition-colors">Privacidad</a>
           <a href="#" className="hover:text-white transition-colors">Términos</a>
           <a href="#" className="hover:text-white transition-colors">Contacto</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
