const HeroSection = () => {
  return (
    <section className='flex min-h-[calc(100dvh-4rem)] flex-1 flex-col justify-between gap-12 overflow-x-hidden pt-8 sm:gap-16 sm:pt-16 lg:gap-24 lg:pt-24'>
      {/* Hero Content */}
      <div className='mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:px-8'>

        <h1 className='text-3xl leading-[1.29167] font-bold text-balance sm:text-4xl lg:text-5xl'>
          Arc SpendOS: Your Gateway to Seamless Treasury Management
          <br />
        </h1>

        <p className='text-muted-foreground'>
          provide on-chain programmable treasury management with 
          <br />
          spend accounts, budgets, limits, approvals, auto-topup, account sweeps, 
          <br />
          and full auditability on the Arc blockchain
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/50">
              <a href='/auth/login'>Get Started</a>
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all border border-slate-700">
              <a href="https://github.com/ss2d22/SpendOS/blob/main/SpendOSContracts/README.md"
              target="_blank"
                rel="noopener noreferrer"
              >
                View Documentation
              </a>
            </button>
          </div>
      </div>

      {/* Image */}
      {/* <img
        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-19.png'
        alt='Dishes'
        className='min-h-67 w-full object-cover'
      /> */}
    </section>
  )
}

export default HeroSection
