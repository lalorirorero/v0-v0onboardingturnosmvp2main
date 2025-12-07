import { Suspense } from "react"
import OnboardingTurnos from "@/components/onboarding-turnos"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <OnboardingTurnos />
        </Suspense>
      </div>
    </main>
  )
}
