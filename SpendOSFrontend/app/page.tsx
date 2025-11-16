import HeroSection from '@/components/shadcn-studio/blocks/hero-section-01/hero-section-01'
import { Shield, Wallet, TrendingUp, Lock, BadgeDollarSign, CheckCircle, Activity, FileCheck, Users, Zap} from 'lucide-react' 


const HeroSectionPage = () => {
  return (
    <div className="relative ">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">Built on Arc Blockchain</span>
          </div>
          <main className="flex flex-col">
            <HeroSection />
          </main>
        </div>
      </section>

      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need for Treasury Management
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Built-in features 
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Wallet className="w-8 h-8" />,
                title: "Spend Accounts",
                description: "Isolated accounts for different departments."
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Budget Controls",
                description: "Set daily, weekly, or monthly spending limits. Automatically enforce budget constraints at the smart contract level."
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Multi-Sig Approvals",
                description: "Require multiple signatures for large transactions. Configure approval thresholds based on transaction size."
              },
              {
                icon: <BadgeDollarSign className="w-8 h-8" />,
                title: "Auto Top-Up",
                description: "Automatically refill accounts when balances fall below thresholds. Keep operations running smoothly."
              },
              {
                icon: <Activity className="w-8 h-8" />,
                title: "Account Sweeps",
                description: "Consolidate funds from multiple accounts automatically. Optimize treasury allocation with scheduled sweeps."
              },
              {
                icon: <FileCheck className="w-8 h-8" />,
                title: "Full Auditability",
                description: "Every transaction is recorded on-chain. Complete transparency and immutable audit trails."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section (from readme) */}
      <section id="how-it-works" className="relative py-32 px-4 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-slate-400">
              Deploy and manage your treasury in three simple steps
            </p>
          </div>
          <div className="space-y-16">
            {[
              {
                step: "01",
                title: "Check Policy",
                description: "The Arc smart contracts check policy (is this within budget, under limits, etc.?).c",
                icon: <Lock className="w-12 h-12" />
              },
              {
                step: "02",
                title: "Call Gateway",
                description: "If allowed, calls Gateway to move just-in-time USDC from the unified balance to the target chain / account for settlement",
                icon: <Users className="w-12 h-12" />
              },
              {
                step: "03",
                title: "Arc Contract Logs Spend",
                description: "The Arc contract logs the spend, updates that account’s remaining budget, and can auto-top-up or auto-freeze based on rules.",
                icon: <Activity className="w-12 h-12" />
              }
            ].map((step, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/50">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-6xl font-bold text-slate-800 mb-2">{step.step}</div>
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-lg text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why SpendOS ?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 ">
            {[
              {
                title: "Better Control",
                description: ""
              },
              {
                title: "",
                description: ""
              },
              {
                title: "",
                description: ""
              },
              {
                title: "",
                description: ""
              },
              {
                title: "",
                description: ""
              },
              {
                title: "",
                description: ""
              }
            ].map((benefit, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 rounded-xl bg-slate-900/30 border border-slate-800"
              >
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-slate-400">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl shadow-slate-900/50">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Give it a try ?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Join to use the better treasury management solution.
            </p>
            <div id="get-started" className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-slate-900 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-slate-900/30">
                Get Started Now
              </button>
              <button className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all border border-slate-600 inline-block text-center">
                <a href="https://github.com/ss2d22/SpendOS/blob/main/SpendOSContracts/README.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                View Documentation
                </a>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center text-slate-500">
          <p>Arc Defi Hackathon 2025</p>
        </div>
      </footer>
    </div>
  );
}




export default HeroSectionPage
