import { Suspense } from "react"
import OnboardingTurnos from "@/components/onboarding-turnos"
import { ZohoTestButton } from "@/components/zoho-test-button"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-4 text-slate-600">Cargando formulario...</p>
              </div>
            </div>
          }
        >
          <OnboardingTurnos />
        </Suspense>
      </div>
      <ZohoTestButton />
    </main>
  )
}
