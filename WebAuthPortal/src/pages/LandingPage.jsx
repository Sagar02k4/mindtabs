import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  LayoutTemplate, 
  Zap, 
  ShieldCheck, 
  Download,
} from 'lucide-react';

const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const features = [
    {
      title: "Smart Tab Management",
      description: "Automatically group and organize your tabs by context, saving memory and mental bandwidth.",
      icon: <LayoutTemplate className="w-6 h-6 text-primary" />
    },
    {
      title: "Lightning Fast Sync",
      description: "Access your beautifully organized workspaces across all your devices instantly via Supabase.",
      icon: <Zap className="w-6 h-6 text-accent" />
    },
    {
      title: "Privacy First",
      description: "Your browsing data never leaves your control. Secure, encrypted, and built for privacy.",
      icon: <ShieldCheck className="w-6 h-6 text-secondary" />
    }
  ];

  const steps = [
    "Install the Chrome Extension",
    "Pin MindTabs to your toolbar",
    "Click the icon to organize instantly!"
  ];

  return (
    <div className="landing-page min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="w-full fixed top-0 bg-background/80 backdrop-blur-md z-50 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">MindTabs</span>
          </div>
          <button 
            onClick={() => window.open('https://github.com/Sagar02k4/MindTabs/releases', '_blank')}
            className="text-sm font-medium hover:text-primary transition-colors cursor-pointer"
          >
            Get from GitHub
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 max-w-7xl mx-auto relative">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            MindTabs v1.0 is Live
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.05] text-balance">
            Turn tab chaos into <br/>
            <span className="text-primary">
              Reclaim your focus.
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Remember why you opened every tab, keep the useful ones close, and get your focus back without changing how you browse.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => window.open('https://github.com/Sagar02k4/MindTabs/releases', '_blank')}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              Download Source Code
            </button>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white text-foreground border border-gray-200 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all cursor-pointer">
              View Features
            </button>
          </motion.div>
        </motion.div>

        {/* Floating Abstract UI */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          <div className="aspect-[16/9] rounded-3xl bg-gradient-to-tr from-gray-100 to-white border border-gray-200 shadow-2xl overflow-hidden relative ring-1 ring-black/5">
             <img src="/dashboard-mockup.png" alt="MindTabs Dashboard Preview" className="w-full h-full object-cover" />
          </div>
          
          {/* Decorative blurs */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] rounded-full"></div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why use MindTabs?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Everything you need to manage your browsing experience, right in your toolbar.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-background border border-gray-100 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Steps */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">Get started in seconds</h2>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center max-w-xs relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary font-bold text-xl relative z-10">
                {i + 1}
              </div>
              {i !== steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-[2px] bg-gradient-to-r from-primary/20 to-transparent -z-0"></div>
              )}
              <p className="font-medium">{step}</p>
            </div>
          ))}
        </div>

        <button 
          onClick={() => window.open('https://github.com/Sagar02k4/MindTabs/releases', '_blank')}
          className="px-10 py-5 bg-foreground text-white rounded-full font-bold text-lg inline-flex items-center gap-3 hover:bg-gray-800 transition-colors shadow-xl cursor-pointer"
        >
          Download Source Code <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 py-12 text-center text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-6">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-4 md:mb-0">
             <Zap className="w-4 h-4 text-primary" /> MindTabs
          </div>
          <p>© {new Date().getFullYear()} MindTabs. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
