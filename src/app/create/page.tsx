'use client'

import { useState } from 'react'

export default function CreateStoryPage() {
  const [storyIdea, setStoryIdea] = useState('')
  const [ageGroup, setAgeGroup] = useState('3-5')
    const [tone, setTone] = useState('funny')
      const [length, setLength] = useState('short')
        const [artStyle, setArtStyle] = useState('cartoon')
          const [isGenerating, setIsGenerating] = useState(false)

          const handleGenerateStory = async () => {
            setIsGenerating(true)

                // TODO: Implement API call to generate story
                try {
                    const response = await fetch('/api/generate-story', {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                  },
                          body: JSON.stringify({
                                idea: storyIdea,
                                ageGroup,
                                tone,
                                length,
                                artStyle
                      }),
                  })

              const data = await response.json()
              console.log('Generated story:', data)

              } catch (error) {
              console.error('Error generating story:', error)
            } finally {
              setIsGenerating(false)
            }
          }

            return (
                <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4">
                  <div className="max-w-7xl mx-auto">

            {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="text-4xl">📚</div>
                        <h1 className="text-3xl font-bold text-white">StoryLoom</h1>
                      </div>
                      <button 
                        className="px-6 py-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors"
            onClick={() => window.location.href = '/'}
                      >
                        Back to Home
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Panel - Story Creation */}
                      <div className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Your Story</h2>

            {/* Story Idea Input */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            What's your story idea?
                          </label>
                          <textarea
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
                            placeholder="A brave little mouse who wants to become a knight..."
                            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-24"
                          />
                        </div>

            {/* Age Group */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age Group
                          </label>
                          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="3-5">3-5 years</option>
                            <option value="6-8">6-8 years</option>
                            <option value="9-12">9-12 years</option>
                          </select>
                        </div>

            {/* Tone */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Story Tone
                          </label>
                          <div className="grid grid-cols-2 gap-2">
            {['funny', 'calm', 'adventure', 'educational'].map((toneOption) => (
                                      <button
                    key={toneOption}
                    onClick={() => setTone(toneOption)}
                                        className={`p-3 rounded-lg capitalize transition-colors ${
                                              tone === toneOption
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                                      >
                    {toneOption}
                                      </button>
                    ))}
                              </div>
                            </div>

                {/* Length */}
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Story Length
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                {['short', 'medium', 'long'].map((lengthOption) => (
                                          <button
                        key={lengthOption}
                        onClick={() => setLength(lengthOption)}
                                            className={`p-3 rounded-lg capitalize transition-colors ${
                                                  length === lengthOption
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                                          >
                        {lengthOption}
                                          </button>
                        ))}
                                  </div>
                                </div>

                    {/* Art Style */}
                                <div className="mb-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Art Style
                                  '<u/slea bcelli>e
                    n t ' 

                    i m p o r t   {   u<sdeiSvt actlea s}s Nfarmoem= "'grreiadc tg'r
                    i
                    de-xcpoolrst- 1d egfaapu-l2t" >f
                    u n c t i o n   C r e a t e S t o{r[y'Pcaagret(o)o n{', 'watercolor', 'sketch'].map((styleOption) => (
                                                <button
                              key={styleOption}
                              onClick={() => setArtStyle(styleOption)}
                                                  className={`p-3 rounded-lg capitalize transition-colors ${
                                                        artStyle === styleOption
                                                          ? 'bg-purple-500 text-white'
                                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                                >
                              {styleOption === 'cartoon' && '🎨 '}
                                {styleOption === 'watercolor' && '🖌️ '}
                                  {styleOption === 'sketch' && '✏️ '}
                                    {styleOption}
                                                      </button>
                                    ))}
                                                </div>
                                              </div>

                                  {/* Generate Button */}
                                              <button
                                  onClick={handleGenerateStory}
                                  disabled={!storyIdea.trim() || isGenerating}
                                                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                                              >
                                                {isGenerating ? (
                                                      <span className="flex items-center justify-center">
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Creating Magic...
                                                      </span>
                                    ) : (
                                                      '✨ Generate Story'
                                      )}
                                              </button>
                                            </div>

                                  {/* Center Panel - Story Preview */}
                                            <div className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl">
                                              <div className="text-center">
                                                <div className="text-6xl mb-4">📖</div>
                                                <h3 className="text-xl font-bold text-gray-800 mb-2">Story Preview</h3>
                                                <p className="text-gray-600 mb-6">Your generated story will appear here</p>

                                  {/* Preview placeholder */}
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                                  <div className="text-4xl mb-2">✍️</div>
                                                  <p className="text-gray-500">
                                  {storyIdea ? `Ready to create: "${storyIdea.slice(0, 50)}${storyIdea.length > 50 ? '...' : ''}"` : 'Enter your story idea to get started'}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>

                                    {/* Right Panel - Character Creation */}
                                              <div className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl">
                                                <h3 className="text-xl font-bold text-gray-800 mb-4">Character Creator</h3>
                                                <p className="text-gray-600 mb-6">Create consistent characters for your stories</p>

                                      {/* Character form placeholder */}
                                                  <div className="space-y-4">
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Character Name
                                                      </label>
                                                      <input
                                                        type="text"
                                                        placeholder="Luna the Explorer"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                      />
                                                    </div>

                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Character Age
                                                      </label>
                                                      <input
                                                        type="text"
                                                        placeholder="7 years old"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                      />
                                                    </div>

                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Appearance
                                                      </label>
                                                      <textarea
                                                        placeholder="Curly brown hair, bright blue eyes, wearing a red backpack..."
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-20"
                                                      />
                                                    </div>

:to-purple-600 transition-all">
                                                      🧬 Create Character DNA
                                                    </button>
                                                  </div>
                                                  
                                      {/* Coming Soon Features */}
                                                  <div className="mt-8 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg">
                                                    <h4 className="font-semibold text-gray-800 mb-2">🚀 Coming Soon</h4>
                                                    <ul className="text-sm text-gray-600 space-y-1">
                                                      <li>• AI Voice Narration</li>
                                                      <li>• Story Series Creation</li>
                                                      <li>• Character Consistency</li>
                                                      <li>• Print Book Export</li>
                                                    </ul>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                      {/* Bottom CTA */}
                                              <div className="mt-8 text-center">
                                                <p className="text-white/80 mb-4">Ready to create magical stories for your children?</p>
                                                <div className="flex justify-center space-x-4">
                                                  <button c'use client'
                                      
                                      import { useState } from 'react'
                                      
                                      export default function CreateStoryPage() {
                                      const [storyIdea, setStoryIdea] = useState('')
                                      const [ageGroup, setAgeGroup] = useState('3-5')
                                      const [tone, setTone] = useState('funny')
                                      const [length, setLength] = useState('short')
                                      const [artStyle, setArtStyle] = useState('cartoon')
                                      const [isGenerating, setIsGenerating] = useState(false)
                                      const [characterName, setCharacterName] = useState('')
                                      const [characterAge, setCharacterAge] = useState('')
                                      const [characterAppearance, setCharacterAppearance] = useState('')
                                      
                                      const handleGenerateStory = async () => {
                                      if (!storyIdea.trim()) return
                                          
                                      setIsGenerating(true)
                                          
                                          try {
                                            const response = await fetch('/api/generate-story', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                      },
                                              body: JSON.stringify({
                                                idea: storyIdea,
                                                ageGroup,
                                                tone,
                                                length,
                                                artStyle,
                                                character: {
                                                  name: characterName,
                                                  age: characterAge,
                                                  appearance: characterAppearance
                                      }
                                      }),
                                      })
                                            
                                      if (!response.ok) {
                                      throw new Error('Failed to generate story')
                                      }
                                            
                                      const data = await response.json()
                                      console.log('Generated story:', data)
                                            
                                      alert('Story generated! Check the console for details. Full story viewer coming soon!')
                                            
                                      } catch (error) {
                                      console.error('Error generating story:', error)
                                      alert('Sorry, there was an error generating your story. Please try again.')
                                      } finally {
                                      setIsGenerating(false)
                                      }
                                      }
                                      
                                        return (
                                          <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4">
                                            <div className="max-w-7xl mx-auto">
                                              
                                      {/* Header */}
                                              <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center space-x-3">
                                                  <div className="text-4xl">📚</div>
                                                  <h1 className="text-3xl font-bold text-white">StoryLoom</h1>
                                                </div>
                                                <button 
                                                  className="px-6 py-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors"
                                      onClick={() => window.location.href = '/'}
                                                >
                                                  ← Back to Home
                                                </button>
                                              </div>
                                      
                                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                
                                      {/* Left Panel - Story Creation */}
                                                <div className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl">
                                                  <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Your Story</h2>
                                                  
                                      {/* Story Idea Input */}
                                                  <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      What's your story idea? ✨
                                                    </label>
                                                    <textarea
                                      value={storyIdea}
                                      onChange={(e) => setStoryIdea(e.target.value)}
                                                      placeholder="A brave little mouse who wants to become a knight and save the kingdom from a grumpy dragon..."
                                                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-24"
                                      maxLength={500}
                                                    />
                                      <p className="text-xs text-gray-500 mt-1">{storyIdea.length}/500 characters</p>
                                                  </div>
                                      
                                      {/* Age Group */}
                                                  <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Age Group 👶
                                                    </label>
                                                    <select
                                      value={ageGroup}
                                      onChange={(e) => setAgeGroup(e.target.value)}
                                                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    >
                                      <option value="3-5">3-5 years (Simple words)</option>
                                      <option value="6-8">6-8 years (Adventure stories)</option>
                                      <option value="9-12">9-12 years (Complex plots)</option>
                                                    </select>
                                                  </div>
                                      
                                      {/* Tone */}
                                                  <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Story Tone 🎭
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                      {[
                                      { value: 'funny', emoji: '😄', label: 'Funny' },
                                      { value: 'calm', emoji: '🌙', label: 'Calm' },
                                      { value: 'adventure', emoji: '🗺️', label: 'Adventure' },
                                      { value: 'educational', emoji: '🧠', label: 'Educational' }
                                      ].map((toneOption) => (
                                                        <button
                                      key={toneOption.value}
                                      onClick={() => setTone(toneOption.value)}
                                                          className={`p-3 rounded-lg transition-colors flex items-center space-x-2 ${
                                                            tone === toneOption.value
                                                              ? 'bg-purple-500 text-white shadow-lg'
                                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                                        >
                                      <span>{toneOption.emoji}</span>
                                      <span className="text-sm font-medium">{toneOption.label}</span>
                                                        </button>
                                      ))}
                                                    </div>
                                                  </div>
                                      
                                      {/* Length */}
                                                  <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Story Length 📏
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                      {[
                                      { value: 'short', label: 'Short', desc: '3-5 pages' },
                                      { value: 'medium', label: 'Medium', desc: '6-10 pages' },
                                      { value: 'long', label: 'Long', desc: '11-15 pages' }
                                      ].map((lengthOption) => (
                                                        <button
                                      key={lengthOption.value}
                                      onClick={() => setLength(lengthOption.value)}
                                                          className={`p-3 rounded-lg transition-colors text-center ${
                                                            length === lengthOption.value
                                                              ? 'bg-purple-500 text-white shadow-lg'
                                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                                        >
                                      <div className="font-medium text-sm">{lengthOption.label}</div>
                                      <div className="text-xs opacity-75">{lengthOption.desc}</div>
                                                        </button>
                                      ))}
                                                    </div>
                                                  </div>
                                      
                                      {/* Art Style */}
                                                  <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Art Style 🎨
                                                    </label>
                                                    <div className="grid grid-cols-1 gap-2">
                                                      {[
                                      { value: 'cartoon', emoji: '🎨', label: 'Cartoon', desc: 'Colorful and playful' },
                                      { value: 'watercolor', emoji: '🖌️', label: 'Watercolor', desc: 'Soft and dreamy' },
                                      { value: 'sketch', emoji: '✏️', label: 'Sketch', desc: 'Hand-drawn style' }
                                      ].map((styleOption) => (
                                                        <button
                                      key={styleOption.value}
                                      onClick={() => setArtStyle(styleOption.value)}
                                                          className={`p-3 rounded-lg transition-colors flex items-center space-x-3 ${
                                                            artStyle === styleOption.value
                                                              ? 'bg-purple-500 text-white shadow-lg'
                                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                                        >
                                      <span className="text-xl">{styleOption.emoji}</span>
                                                          <div className="text-left">
                                      <div className="font-medium text-sm">{styleOption.label}</div>
                                      <div className="text-xs opacity-75">{styleOption.desc}</div>
                                                          </div>
                                                        </button>
                                      ))}
                                                    </div>
                                                  </div>
                                      
                                      {/* Generate Button */}
                                                  <button
                                      onClick={handleGenerateStory}
                                      disabled={!storyIdea.trim() || isGenerating}
                                                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg"
                                                  >
                                                    {isGenerating ? (
                                                      <span className="flex items-center justify-center">
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                          <path className="opacity-<button className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover
