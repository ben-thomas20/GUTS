import { useGameStore } from '../store/gameStore'

export default function EmotePicker() {
  const { showEmotePicker, closeEmotePicker, sendEmote } = useGameStore()
  
  // Generate emote URLs (emote-01.gif through emote-18.gif for now)
  const emoteCount = 18
  const emotes = Array.from({ length: emoteCount }, (_, i) => {
    const num = String(i + 1).padStart(2, '0')
    return `/emotes/emote-${num}.gif`
  })
  
  if (!showEmotePicker) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={closeEmotePicker}
    >
      <div 
        className="bg-gray-900 border-2 border-white/20 rounded-2xl p-3 sm:p-4 max-w-xs sm:max-w-sm w-full max-h-[75vh] overflow-y-auto custom-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-white text-base sm:text-lg font-bold">Choose an Emote</h2>
          <button
            onClick={closeEmotePicker}
            className="text-white/60 hover:text-white text-xl sm:text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {emotes.map((emoteUrl, index) => (
            <button
              key={index}
              onClick={() => sendEmote(emoteUrl)}
              className="aspect-square bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-lg p-1 transition-all active:scale-95 flex items-center justify-center overflow-hidden group"
            >
              <img
                src={emoteUrl}
                alt={`Emote ${index + 1}`}
                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                onError={(e) => {
                  // Fallback if emote doesn't exist
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = `<span class="text-white/40 text-xs">${index + 1}</span>`
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

