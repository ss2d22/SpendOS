import Link from "next/link";
import HeroSection from '@/components/shadcn-studio/blocks/hero-section-01/hero-section-01'
import Header from '@/components/shadcn-studio/blocks/hero-section-01/header'
import type { NavigationSection } from '@/components/shadcn-studio/blocks/hero-section-01/header'




const navigationData: NavigationSection[] = [
  {
    title: 'Home',
    href: '/'
  },
  {
    title: 'About',
    href: '#'
  },
  {
    title: 'Contract',
    href: '#'
  }
]

const HeroSectionPage = () => {
  return (
    <div className="relative">

      <Header navigationData={navigationData} />

      <main className="flex flex-col">
        <HeroSection />
      </main>
    </div>
  )
}

export default HeroSectionPage
