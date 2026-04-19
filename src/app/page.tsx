'use client'

import { useEffect } from 'react'
import React from 'react'

export default function HomePage() {
  useEffect(() => {
    // Redirect to /create after a brief moment
    const timer = setTimeout(() => {
      window.location.href = '/create'
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="bg-black/20 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo - Upload your logo to /public/logo.png */}
              <img 
                src="/logo.png"
                alt="StoryLoom Logo"
                width="60"
                height="40"
                className="rounded-lg shadow-lg"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  // Fallback to emoji if logo not found
                  const target = e.currentTarget as HTMLElement;
                  if (target) {
                    target.style.display = 'none';
                    const nextElement = target.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'block';
                    }
                  }
                }}
              />
              <div className="text-4xl" style={{ display: 'none' }}>📚</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 drop-shadow-2xl">
            StoryLoom
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            AI-Powered Children's Storybook Generator
          </p>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
            <p className="text-lg text-white/80 mb-6">
              Create magical personalized stories with AI. Build characters, generate beautiful illustrations, and bring your imagination to life.
            </p>
            
            <div className="inline-block bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl">
              Start Creating Stories →
            </div>
            
            <p className="text-sm text-white/60 mt-4">
              Redirecting to story builder in a moment...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
