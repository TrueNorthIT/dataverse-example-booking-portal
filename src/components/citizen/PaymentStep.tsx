import { useState } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatGBP } from "@/lib/pricing"

interface PaymentStepProps {
  amountPence: number
  /** Called with a (fake) payment reference once the simulated payment succeeds. */
  onSuccess: (paymentRef: string) => void
  onCancel: () => void
  disabled?: boolean
}

/**
 * Demo payment screen — simulated, no real charge and no Stripe/keys. Looks like
 * a card form for the demo, then resolves successfully after a short delay.
 */
export function PaymentStep({ amountPence, onSuccess, onCancel, disabled }: PaymentStepProps) {
  const [card, setCard] = useState("4242 4242 4242 4242")
  const [expiry, setExpiry] = useState("12 / 34")
  const [cvc, setCvc] = useState("123")
  const [processing, setProcessing] = useState(false)

  const pay = () => {
    setProcessing(true)
    // Simulated payment — no real card is charged
    setTimeout(() => {
      onSuccess(`demo_${Math.random().toString(36).slice(2, 12)}`)
    }, 900)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 rounded-md border border-dashed bg-muted/40 p-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        Demo payment — no real card is charged.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="card">Card number</Label>
        <Input id="card" inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value)} disabled={processing} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expiry">Expiry</Label>
          <Input id="expiry" placeholder="MM / YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} disabled={processing} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cvc">CVC</Label>
          <Input id="cvc" inputMode="numeric" value={cvc} onChange={(e) => setCvc(e.target.value)} disabled={processing} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={processing || disabled}>
          Back
        </Button>
        <Button size="sm" onClick={pay} disabled={processing || disabled}>
          {processing ? "Processing…" : `Pay ${formatGBP(amountPence)}`}
        </Button>
      </div>
    </div>
  )
}
