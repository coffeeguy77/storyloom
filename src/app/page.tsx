'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="bg-black/20 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Header Logo - Small 3:2 ratio */}
              <Image 
                src="/logo.png" 
                alt="StoryLoom Logo" 
                width={60} 
                height={40}
                className="rounded-lg shadow-lg"
                onError={(e) => {
                  // Fallback to emoji if logo not found
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling.style.display = 'block'
                }}
              />
              <div className="text-3xl" style={{display: 'none'}}>📚</div>
              <h1 className="text-2xl font-bold text-white">StoryLoom</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-4xl mx-auto px-4 sm:px-8">
          {/* Main Hero Logo - Responsive 3:2 ratio */}
          <div className="mb-6 sm:mb-8">
            <Image 
              src="/logo.png" 
              alt="StoryLoom Logo" 
              width={240} 
              height={160}
              className="mx-auto rounded-2xl shadow-2xl max-w-[280px] w-full h-auto sm:max-w-[320px] md:max-w-[400px]"
              priority
              onError={(e) => {
                // Fallback to emoji if logo not found
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling.style.display = 'block'
              }}
            />
            <div className="text-6xl sm:text-8xl mb-4" style={{display: 'none'}}>📚</div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6">
            StoryLoom
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-3 sm:mb-4">
            AI-Powered Children's Storybook Generator
          </p>
          
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
            Create magical personalized stories with AI. Build characters, generate beautiful illustrations, and bring your imagination to life.
          </p>

          {/* Create Story Button - Mobile optimized */}
          <Link 
            href="/create"
            className="inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-12 py-4 sm:py-6 bg-yellow-400 text-purple-800 font-bold rounded-xl sm:rounded-2xl text-lg sm:text-xl hover:bg-yellow-300 transition-all duration-300 hover:scale-105 shadow-2xl mx-4"
          >
            <span className="text-xl sm:text-2xl">✨</span>
            <span className="whitespace-nowrap">Start Creating Stories</span>
            <span className="text-xl sm:text-2xl">📖</span>
          </Link>

          {/* Features Grid - Mobile responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 max-w-4xl mx-auto px-4">
            <div className="bg-white/10 rounded-2xl p-4 sm:p-6 border border-white/20 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🤖</div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">AI Story Generation</h3>
              <p className="text-white/80 text-sm">Let AI create magical tales with your characters and ideas</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 sm:p-6 border border-white/20 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎨</div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Beautiful Illustrations</h3>
              <p className="text-white/80 text-sm">Generate stunning images or upload your own artwork</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 sm:p-6 border border-white/20 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📱</div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Easy to Use</h3>
              <p className="text-white/80 text-sm">Simple interface designed for creators of all ages</p>
            </div>
          </div>

          {/* Secondary CTA - Mobile optimized */}
          <div className="mt-12 sm:mt-16 px-4">
            <p className="text-white/70 mb-4 text-sm sm:text-base">Ready to begin your storytelling journey?</p>
            <Link 
              href="/create"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              <span>🚀</span>
              <span className="text-sm sm:text-base">Get Started Now</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
