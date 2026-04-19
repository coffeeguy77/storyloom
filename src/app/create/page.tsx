'use client'
import { useState, useEffect } from 'react'
interface Character { id: string; name: string; imageUrl?: string; role?: string; description?: string }
interface StoryPage { id: string; text: string; imageUrl?: string; imagePrompt?: string }
interface Story { id: string; title: string; pages: StoryPage[]; characters: Character[]; createdAt: string; coverImage?: string }
export default function CreateStoryPage() {
      const [currentStep, setCurrentStep] = useState<'start' | 'characters' | 'story' | 'pages' | 'library'>('start')
      const [storyMode, setStoryMode] = useState<'ai' | 'manual'>('ai')
      const [characters, setCharacters] = useState<Character[]>([])
      const [storyDescription, setStoryDescription] = useState('')
      const [storyTitle, setStoryTitle] = useState('')
      const [currentStory, setCurrentStory] = useState<Story | null>(null)
      const [savedStories, setSavedStories] = useState<Story[]>([])
      const [isGeneratingStory, setIsGeneratingStory] = useState(false)
      const [isGeneratingImage, setIsGeneratingImage] = useState(false)
      useEffect(() => {
              const saved = localStorage.getItem('storyloom-stories')
              if (saved) setSavedStories(JSON.parse(saved))
              const savedChars = localStorage.getItem('storyloom-characters')
              if (savedChars) setCharacters(JSON.parse(savedChars))
      }, [])
      const saveToStorage = (stories: Story[], chars: Character[]) => {
              localStorage.setItem('storyloom-stories', JSON.stringify(stories))
              localStorage.setItem('storyloom-characters', JSON.stringify(chars))
      }
      const addNewCharacter = () => {
              const newChar: Character = { id: Date.now().toString(), name: '', role: '', description: '' }
              const updated = [...characters, newChar]
              setCharacters(updated)
              saveToStorage(savedStories, updated)
      }
      const updateCharacter = (id: string, updates: Partial<Character>) => {
              const updated = characters.map(char => char.id === id ? { ...char, ...updates } : char)
              setCharacters(updated)
              saveToStorage(savedStories, updated)
      }
      const removeCharacter = (id: string) => {
              const filtered = characters.filter(char => char.id !== id)
              setCharacters(filtered)
              saveToStorage(savedStories, filtered)
      }
      const handleImageUpload = (file: File, characterId: string) => {
              const reader = new FileReader()
              reader.onload = (e) => {
                        const imageUrl = e.target?.result as string
                        updateCharacter(characterId, { imageUrl })
              }
              reader.readAsDataURL(file)
      }
      const generateAIStory = async () => {
              setIsGeneratingStory(true)
              try {
                        const mainCharacter = characters.find(c => c.name.trim()) || { name: 'Alex' }
                        const story: Story = {
                                    id: Date.now().toString(),
                                    title: storyTitle || 'A Magical Adventure',
                                    pages: [
                                        { id: '1', text: `Once upon a time, there was a brave child named ${mainCharacter.name} who discovered something truly magical hidden in their backyard...`, imagePrompt: `A child named ${mainCharacter.name} discovering a magical glowing object in a beautiful garden` },
                                        { id: '2', text: `${mainCharacter.name} decided to embark on an incredible adventure. With courage in their heart, they stepped through a shimmering portal into a world of wonder.`, imagePrompt: `${mainCharacter.name} walking through a magical portal into a fantastical world` },
                                        { id: '3', text: `In this magical realm, ${mainCharacter.name} met wonderful talking animals and learned important lessons about friendship, kindness, and believing in yourself.`, imagePrompt: `${mainCharacter.name} meeting friendly talking animals in an enchanted forest` },
                                        { id: '4', text: `After their amazing journey, ${mainCharacter.name} returned home as a true hero, carrying the magic of friendship and adventure in their heart forever.`, imagePrompt: `${mainCharacter.name} returning home as a confident hero, glowing with inner magic` }
                                                ],
                                    characters: characters.filter(c => c.name.trim()),
                                    createdAt: new Date().toISOString()
                        }
                        setCurrentStory(story)
                        setCurrentStep('pages')
              } catch (error) {
                        console.error('Story generation failed:', error)
              } finally {
                        setIsGeneratingStory(false)
              }
      }
      const createManualStory = () => {
              const newStory: Story = { id: Date.now().toString(), title: storyTitle || 'My Story', pages: [{ id: '1', text: 'Once upon a time...', imagePrompt: 'A beautiful story beginning' }], characters: characters.filter(c => c.name.trim()), createdAt: new Date().toISOString() }
              setCurrentStory(newStory)
              setCurrentStep('pages')
      }
      const addPage = () => {
              if (!currentStory) return
              const newPage: StoryPage = { id: Date.now().toString(), text: '', imagePrompt: '' }
              setCurrentStory({ ...currentStory, pages: [...currentStory.pages, newPage] })
      }
      const updatePage = (pageIndex: number, updates: Partial<StoryPage>) => {
              if (!currentStory) return
              const updatedPages = currentStory.pages.map((page, index) => index === pageIndex ? { ...page, ...updates } : page)
              setCurrentStory({ ...currentStory, pages: updatedPages })
      }
      const generatePageImage = async (pageIndex: number, prompt: string) => {
              setIsGeneratingImage(true)
              try {
                        const colors = ['4F46E5', 'EC4899', 'F59E0B', '10B981', 'EF4444']
                        const randomColor = colors[Math.floor(Math.random() * colors.length)]
                        const mockImageUrl = `https://via.placeholder.com/400x300/${randomColor}/ffffff?text=${encodeURIComponent(prompt.slice(0, 15))}`
                        updatePage(pageIndex, { imageUrl: mockImageUrl })
              } catch (error) {
                        console.error('Image generation failed:', error)
              } finally {
                        setIsGeneratingImage(false)
              }
      }
      const saveStory = () => {
              if (!currentStory) return
              const updatedStories = [...savedStories, currentStory]
              setSavedStories(updatedStories)
              saveToStorage(updatedStories, characters)
              setCurrentStep('library')
      }
      return (
              <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
                    <div className="bg-black/20 border-b border-white/20">
                            <div className="max-w-7xl mx-auto px-4 py-4">
                                      <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                                <h1 className="text-2xl font-bold text-white">📚 StoryLoom</h1>h1>
                                                                <div className="text-white/70">•</div>div>
                                                                <div className="text-white/70">
                                                                    {currentStep === 'start' && 'Choose Creation Method'}
                                                                    {currentStep === 'characters' && 'Add Characters'}
                                                                    {currentStep === 'story' && (storyMode === 'ai' ? 'AI Story Creation' : 'Manual Creation')}
                                                                    {currentStep === 'pages' && 'Edit Pages'}
                                                                    {currentStep === 'library' && 'Your Library'}
                                                                </div>div>
                                                  </div>div>
                                                  <button onClick={() => setCurrentStep('library')} className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors">📚 Library ({savedStories.length})</button>button>
                                      </div>div>
                            </div>div>
                    </div>div>
                    <div className="py-8">
                        {currentStep === 'start' && (
                            <div className="max-w-4xl mx-auto p-8">
                                        <div className="text-center mb-12">
                                                      <h1 className="text-5xl font-bold text-white mb-4">📚 Create Your Story</h1>h1>
                                                      <p className="text-xl text-white/80">Choose how you'd like to create your magical storybook</p>p>
                                        </div>div>
                                        <div className="grid md:grid-cols-2 gap-8">
                                                      <div className={`p-8 rounded-2xl border-2 transition-all cursor-pointer ${storyMode === 'ai' ? 'border-yellow-300 bg-white/20' : 'border-white/30 bg-white/10 hover:bg-white/15'}`} onClick={() => setStoryMode('ai')}>
                                                                      <div className="text-center">
                                                                                        <div className="text-6xl mb-4">🤖</div>div>
                                                                                        <h3 className="text-2xl font-bold text-white mb-3">AI Story Generator</h3>h3>
                                                                                        <p className="text-white/80 mb-6">Describe your story idea and let AI create a magical tale with your characters</p>p>
                                                                                        <div className="space-y-2 text-sm text-white/70">
                                                                                                            <div>✨ AI Story Generation</div>div>
                                                                                                            <div>🎨 AI Image Creation</div>div>
                                                                                                            <div>👥 Character Integration</div>div>
                                                                                            </div>div>
                                                                      </div>div>
                                                      </div>div>
                                                      <div className={`p-8 rounded-2xl border-2 transition-all cursor-pointer ${storyMode === 'manual' ? 'border-yellow-300 bg-white/20' : 'border-white/30 bg-white/10 hover:bg-white/15'}`} onClick={() => setStoryMode('manual')}>
                                                                      <div className="text-center">
                                                                                        <div className="text-6xl mb-4">✍️</div>div>
                                                                                        <h3 className="text-2xl font-bold text-white mb-3">Write Your Own</h3>h3>
                                                                                        <p className="text-white/80 mb-6">Create your story from scratch with complete creative control</p>p>
                                                                                        <div className="space-y-2 text-sm text-white/70">
                                                                                                            <div>📝 Full Creative Control</div>div>
                                                                                                            <div>📸 Upload Your Images</div>div>
                                                                                                            <div>🎯 Page-by-Page Creation</div>div>
                                                                                            </div>div>
                                                                      </div>div>
                                                      </div>div>
                                        </div>div>
                                        <div className="text-center mt-12">
                                                      <button onClick={() => setCurrentStep('characters')} className="px-8 py-4 bg-yellow-400 text-purple-800 font-bold rounded-xl text-lg hover:bg-yellow-300 transition-colors">Continue to Characters →</button>button>
                                        </div>div>
                            </div>div>
                            )}
                        {currentStep === 'characters' && (
                            <div className="max-w-6xl mx-auto p-8">
                                        <div className="text-center mb-8">
                                                      <h2 className="text-4xl font-bold text-white mb-4">👥 Story Characters</h2>h2>
                                                      <p className="text-xl text-white/80">Add the characters who will star in your story</p>p>
                                        </div>div>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                            {characters.map((character) => (
                                                <div key={character.id} className="bg-white/10 rounded-2xl p-6 border border-white/20">
                                                                  <div className="w-32 h-32 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                                                                      {character.imageUrl ? (<img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />) : (<div className="text-4xl">👤</div>div>)}
                                                                  </div>div>
                                                                  <div className="text-center mb-4">
                                                                                      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], character.id)} className="hidden" id={`file-${character.id}`} />
                                                                                      <label htmlFor={`file-${character.id}`} className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm hover:bg-blue-600 transition-colors">📸 Upload Photo</label>label>
                                                                  </div>div>
                                                                  <div className="space-y-3">
                                                                                      <input type="text" placeholder="Character name" value={character.name} onChange={(e) => updateCharacter(character.id, { name: e.target.value })} className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50" />
                                                                                      <input type="text" placeholder="Role in story" value={character.role} onChange={(e) => updateCharacter(character.id, { role: e.target.value })} className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50" />
                                                                                      <textarea placeholder="Character description" value={character.description || ''} onChange={(e) => updateCharacter(character.id, { description: e.target.value })} className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 h-20 resize-none" />
                                                                  </div>div>
                                                                  <button onClick={() => removeCharacter(character.id)} className="w-full mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors">Remove Character</button>button>
                                                </div>div>
                                              ))}
                                                      <div onClick={addNewCharacter} className="bg-white/10 rounded-2xl p-6 border-2 border-dashed border-white/30 flex flex-col items-center justify-center cursor-pointer hover:bg-white/15 transition-colors min-h-[400px]">
                                                                      <div className="text-6xl mb-4">➕</div>div>
                                                                      <h3 className="text-xl font-bold text-white mb-2">Add Character</h3>h3>
                                                                      <p className="text-white/70 text-center">Click to add a new character to your story</p>p>
                                                      </div>div>
                                        </div>div>
                                        <div className="flex justify-between">
                                                      <button onClick={() => setCurrentStep('start')} className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors">← Back</button>button>
                                                      <button onClick={() => setCurrentStep('story')} className="px-8 py-3 bg-yellow-400 text-purple-800 font-bold rounded-xl hover:bg-yellow-300 transition-colors">Continue to Story →</button>button>
                                        </div>div>
                            </div>div>
                            )}
                        {currentStep === 'story' && (
                            <div className="max-w-4xl mx-auto p-8">
                                        <div className="text-center mb-8">
                                                      <h2 className="text-4xl font-bold text-white mb-4">{storyMode === 'ai' ? '🤖 AI Story Creation' : '✍️ Manual Story Creation'}</h2>h2>
                                                      <p className="text-xl text-white/80">{storyMode === 'ai' ? 'Describe your story and let AI create the magic' : 'Start writing your story from scratch'}</p>p>
                                        </div>div>
                                        <div className="bg-white/10 rounded-2xl p-8 border border-white/20">
                                                      <div className="mb-6">
                                                                      <label className="block text-white font-bold mb-2">Story Title</label>label>
                                                                      <input type="text" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder="Enter your story title..." className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 text-lg" />
                                                      </div>div>
                                            {storyMode === 'ai' ? (
                                                <div className="mb-8">
                                                                  <label className="block text-white font-bold mb-2">Story Description</label>label>
                                                                  <textarea value={storyDescription} onChange={(e) => setStoryDescription(e.target.value)} placeholder="Describe your story idea... For example: 'A magical adventure where the main character discovers a hidden forest full of talking animals and must help them save their home from an evil wizard.'" className="w-full px-4 py-4 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 h-40 resize-none" />
                                                </div>div>
                                              ) : null}
                                            {characters.filter(c => c.name.trim()).length > 0 && (
                                                <div className="mb-8">
                                                                  <h3 className="text-white font-bold mb-4">Characters in this story:</h3>h3>
                                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                      {characters.filter(c => c.name.trim()).map((char) => (
                                                                          <div key={char.id} className="text-center">
                                                                                                  <div className="w-16 h-16 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                                                                                                      {char.imageUrl ? (<img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />) : (<div className="text-2xl">👤</div>div>)}
                                                                                                      </div>div>
                                                                                                  <div className="text-white text-sm font-medium">{char.name}</div>div>
                                                                                                  <div className="text-white/70 text-xs">{char.role}</div>div>
                                                                          </div>div>
                                                                        ))}
                                                                  </div>div>
                                                </div>div>
                                                      )}
                                                      <div className="flex gap-4">
                                                                      <button onClick={() => setCurrentStep('characters')} className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors">← Back to Characters</button>button>
                                                          {storyMode === 'ai' ? (
                                                  <button onClick={generateAIStory} disabled={!storyTitle.trim() || isGeneratingStory} className="flex-1 px-8 py-3 bg-yellow-400 text-purple-800 font-bold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                      {isGeneratingStory ? (<div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-purple-800/30 border-t-purple-800 rounded-full animate-spin"></div>div>Generating Story...</div>div>) : ('🚀 Generate AI Story')}
                                                  </button>button>
                                                ) : (
                                                  <button onClick={createManualStory} disabled={!storyTitle.trim()} className="flex-1 px-8 py-3 bg-yellow-400 text-purple-800 font-bold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">📝 Start Writing</button>button>
                                                                      )}
                                                      </div>div>
                                        </div>div>
                            </div>div>
                            )}
                        {currentStep === 'pages' && currentStory && (
                            <div className="max-w-6xl mx-auto p-8">
                                        <div className="text-center mb-8">
                                                      <h2 className="text-4xl font-bold text-white mb-4">📖 Story Pages</h2>h2>
                                                      <p className="text-xl text-white/80">Edit your story and add images to each page</p>p>
                                                      <h3 className="text-2xl text-yellow-300 mt-2">{currentStory.title}</h3>h3>
                                        </div>div>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                            {currentStory.pages.map((page, index) => (
                                                <div key={page.id} className="bg-white/10 rounded-2xl p-6 border border-white/20">
                                                                  <div className="text-center mb-4">
                                                                                      <h4 className="text-white font-bold">Page {index + 1}</h4>h4>
                                                                  </div>div>
                                                                  <div className="w-full h-48 bg-white/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                                                                      {page.imageUrl ? (<img src={page.imageUrl} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />) : (<div className="text-center text-white/70"><div className="text-3xl mb-2">🖼️</div>div><div className="text-sm">No image yet</div>div></div>div>)}
                                                                  </div>div>
                                                                  <div className="flex gap-2 mb-4">
                                                                                      <input type="text" placeholder="Describe the image..." value={page.imagePrompt || ''} onChange={(e) => updatePage(index, { imagePrompt: e.target.value })} className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 text-sm" />
                                                                                      <button onClick={() => generatePageImage(index, page.imagePrompt || '')} disabled={!page.imagePrompt?.trim() || isGeneratingImage} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors disabled:opacity-50">🎨 Generate</button>button>
                                                                  </div>div>
                                                                  <div className="mb-4">
                                                                                      <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { updatePage(index, { imageUrl: e.target?.result as string }) }; reader.readAsDataURL(file) } }} className="hidden" id={`page-file-${index}`} />
                                                                                      <label htmlFor={`page-file-${index}`} className="block w-full px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm text-center hover:bg-blue-600 transition-colors">📸 Upload Image</label>label>
                                                                  </div>div>
                                                                  <textarea value={page.text} onChange={(e) => updatePage(index, { text: e.target.value })} placeholder="Write the story text for this page..." className="w-full px-3 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 h-32 resize-none text-sm" />
                                                </div>div>
                                              ))}
                                                      <div onClick={addPage} className="bg-white/10 rounded-2xl p-6 border-2 border-dashed border-white/30 flex flex-col items-center justify-center cursor-pointer hover:bg-white/15 transition-colors min-h-[400px]">
                                                                      <div className="text-6xl mb-4">➕</div>div>
                                                                      <h3 className="text-xl font-bold text-white mb-2">Add Page</h3>h3>
                                                                      <p className="text-white/70 text-center">Click to add a new page to your story</p>p>
                                                      </div>div>
                                        </div>div>
                                        <div className="flex justify-between">
                                                      <button onClick={() => setCurrentStep('story')} className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors">← Back to Story</button>button>
                                                      <button onClick={saveStory} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors">💾 Save to Library</button>button>
                                        </div>div>
                            </div>div>
                            )}
                        {currentStep === 'library' && (
                            <div className="max-w-6xl mx-auto p-8">
                                        <div className="text-center mb-8">
                                                      <h2 className="text-4xl font-bold text-white mb-4">📚 Your Story Library</h2>h2>
                                                      <p className="text-xl text-white/80">Read and manage your saved stories</p>p>
                                        </div>div>
                                {savedStories.length === 0 ? (
                                              <div className="text-center py-16">
                                                              <div className="text-8xl mb-4">📖</div>div>
                                                              <h3 className="text-2xl font-bold text-white mb-4">No stories yet</h3>h3>
                                                              <p className="text-white/70 mb-8">Create your first story to get started!</p>p>
                                                              <button onClick={() => setCurrentStep('start')} className="px-8 py-3 bg-yellow-400 text-purple-800 font-bold rounded-xl hover:bg-yellow-300 transition-colors">Create Your First Story</button>button>
                                              </div>div>
                                            ) : (
                                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                                  {savedStories.map((story) => (
                                                                    <div key={story.id} className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
                                                                                        <div className="w-full h-48 bg-white/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                                                                                            {story.coverImage || (story.pages[0]?.imageUrl) ? (<img src={story.coverImage || story.pages[0]?.imageUrl} alt={story.title} className="w-full h-full object-cover" />) : (<div className="text-center text-white/70"><div className="text-4xl mb-2">📚</div>div><div className="text-sm">{story.title}</div>div></div>div>)}
                                                                                            </div>div>
                                                                                        <h3 className="text-xl font-bold text-white mb-2">{story.title}</h3>h3>
                                                                                        <p className="text-white/70 text-sm mb-4">{story.pages.length} page{story.pages.length !== 1 ? 's' : ''} • {story.characters.length} character{story.characters.length !== 1 ? 's' : ''}</p>p>
                                                                                        <p className="text-white/50 text-xs mb-4">Created: {new Date(story.createdAt).toLocaleDateString()}</p>p>
                                                                                        <div className="flex gap-2">
                                                                                                              <button onClick={() => { setCurrentStory(story); setCurrentStep('pages') }} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">📖 Read</button>button>
                                                                                                              <button onClick={() => { setCurrentStory(story); setCurrentStep('pages') }} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">✏️ Edit</button>button>
                                                                                            </div>div>
                                                                    </div>div>
                                                                  ))}
                                              </div>div>
                                        )}
                                        <div className="text-center">
                                                      <button onClick={() => setCurrentStep('start')} className="px-8 py-3 bg-yellow-400 text-purple-800 font-bold rounded-xl hover:bg-yellow-300 transition-colors">➕ Create New Story</button>button>
                                        </div>div>
                            </div>div>
                            )}
                    </div>div>
              </div>div>
            )
}</div>
