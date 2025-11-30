import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export default function BuyBackModal() {
  const { debtAmount, showBuyBackModal, needsBuyBackForAnte, anteAmount, players, playerId, buyBackIn, leaveGame } = useGameStore()
  
  // Calculate my balance
  const myPlayer = players.find(p => p.id === playerId)
  const myBalance = myPlayer?.balance ?? 0
  
  // Determine if we should show the modal
  const isInDebt = debtAmount !== null && debtAmount > 0
  const shouldShow = showBuyBackModal || isInDebt || needsBuyBackForAnte
  
  // Don't show if modal shouldn't be shown
  if (!shouldShow) {
    return null
  }
  const [buyBackAmount, setBuyBackAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Set default buy-back amount to debt amount or ante amount
    if (debtAmount && debtAmount > 0) {
      setBuyBackAmount(debtAmount.toFixed(2))
    } else if (needsBuyBackForAnte && anteAmount > 0) {
      setBuyBackAmount(anteAmount.toFixed(2))
    }
  }, [debtAmount, needsBuyBackForAnte, anteAmount])

  const handleBuyBack = () => {
    const amount = parseFloat(buyBackAmount)
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    // If in debt, must cover debt
    if (debtAmount > 0 && amount < debtAmount) {
      setError(`You must buy back at least $${debtAmount.toFixed(2)} to cover your debt`)
      return
    }

    // If need to afford ante, must buy back enough to afford it
    if (needsBuyBackForAnte && anteAmount > 0) {
      const totalAfterBuyBack = myBalance + amount
      if (totalAfterBuyBack < anteAmount) {
        const needed = anteAmount - myBalance
        setError(`You need to buy back at least $${needed.toFixed(2)} to afford the ante ($${anteAmount.toFixed(2)})`)
        return
      }
    }

    setError('')
    buyBackIn(amount)
  }

  const handleLeave = () => {
    if (debtAmount > 0) {
      setError('You cannot leave while in debt. You must buy back in first.')
      return
    }
    leaveGame()
  }

  // Recalculate isInDebt (already calculated above, but keeping for consistency)
  const currentDebt = myBalance < 0 ? Math.abs(myBalance) : (debtAmount || 0)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 safe-area-padding">
      <div className="bg-gray-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-white mb-2">
            {isInDebt ? '⚠ You\'re in Debt!' : needsBuyBackForAnte ? '⚠ Need to Buy Back' : 'Low Balance'}
          </h2>
          <p className="text-white/70 text-lg font-semibold">
            Current Balance: <span className={`font-black ${myBalance < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              ${myBalance.toFixed(2)}
            </span>
          </p>
          {isInDebt && (
            <p className="text-red-400 text-base font-bold mt-2">
              Debt Amount: ${currentDebt.toFixed(2)}
            </p>
          )}
          {needsBuyBackForAnte && !isInDebt && (
            <p className="text-yellow-400 text-base font-bold mt-2">
              Ante Required: ${anteAmount.toFixed(2)} • You need ${(anteAmount - myBalance).toFixed(2)} more
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-white/80 text-sm font-semibold mb-2 tracking-wide">
            Buy Back Amount {
              isInDebt && <span className="text-red-400">(Minimum: ${currentDebt.toFixed(2)})</span>
            }
            {needsBuyBackForAnte && !isInDebt && anteAmount > 0 && (
              <span className="text-yellow-400">(Minimum: ${(anteAmount - myBalance).toFixed(2)} to afford ante)</span>
            )}
          </label>
          <input
            type="number"
            value={buyBackAmount}
            onChange={(e) => {
              setBuyBackAmount(e.target.value)
              setError('')
            }}
            placeholder="Enter amount"
            min={isInDebt ? currentDebt : 0}
            step="0.01"
            className="w-full px-4 py-3 rounded-xl text-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {error && (
            <p className="text-red-400 text-sm mt-2 font-semibold">{error}</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleBuyBack}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-xl shadow-lg active:scale-95 transition-all"
            style={{ minHeight: '50px' }}
          >
            Buy Back In
          </button>
          
          <button
            onClick={handleLeave}
            disabled={isInDebt}
            className={`w-full py-3 text-white font-semibold text-base rounded-xl active:scale-95 transition-all ${
              isInDebt
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
            style={{ minHeight: '44px' }}
          >
            {isInDebt ? 'Cannot Leave (In Debt)' : 'Leave Game'}
          </button>
        </div>

        {isInDebt && (
          <p className="text-white/60 text-xs text-center mt-4 font-medium">
            You must buy back at least ${currentDebt.toFixed(2)} to cover your debt before leaving.
          </p>
        )}
      </div>
    </div>
  )
}

