const generateAIStory = async () => {
  setIsGeneratingStory(true)
  try {
    const mainCharacter = characters.find(c => c.name.trim()) || { name: 'Alex' }
    
    // Call the actual API instead of hardcoded content
    const response = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: storyDescription || 'magical adventure',
        ageGroup: '6-8',
        tone: 'adventure', 
        length: 'medium',
        artStyle: 'cartoon',
        character: { name: mainCharacter.name }
      })
    })
    
    if (!response.ok) throw new Error('Failed to generate story')
    
    const apiStory = await response.json()
    
    if (apiStory.success) {
      const story: Story = {
        id: apiStory.id,
        title: apiStory.title,
        pages: apiStory.pages.map((page: any) => ({
          id: page.pageNumber.toString(),
          text: page.text,
          imagePrompt: page.imagePrompt,
          imageUrl: page.imageUrl
        })),
        characters: [mainCharacter],
        createdAt: new Date().toISOString(),
        coverImage: apiStory.pages[0]?.imageUrl
      }
      
      setCurrentStory(story)
      saveToStorage(savedStories, [...savedStories, story])
    }
  } catch (error) {
    console.error('Story generation failed:', error)
  } finally {
    setIsGeneratingStory(false)
  }
}
