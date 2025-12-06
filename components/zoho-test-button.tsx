"use client"

import { useState } from "react"
import { testZohoWebhook } from "@/app/actions/test-zoho"
import { Button } from "@/components/ui/button"

export function ZohoTestButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleTest = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await testZohoWebhook()
      setResult(response)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Prueba de Zoho Flow</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">TEST</span>
        </div>

        <Button onClick={handleTest} disabled={loading} className="w-full" size="sm">
          {loading ? "Enviando..." : "Probar Webhook de Zoho"}
        </Button>

        {result && (
          <div className="mt-3 max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${result.success ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-xs font-semibold">{result.success ? "Éxito" : "Error"}</span>
            </div>

            <pre className="text-[10px] leading-relaxed text-slate-700">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
