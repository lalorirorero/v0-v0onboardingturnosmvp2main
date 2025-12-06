import OnboardingTurnos from "@/components/onboarding-turnos"
import { ZohoTestButton } from "@/components/zoho-test-button"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <OnboardingTurnos />
      </div>
      <ZohoTestButton />
    </main>
  )
}
