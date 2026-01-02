"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TokenTester() {
  const [token, setToken] = useState("")

  const handleTest = () => {
    if (token) {
      window.location.href = `${window.location.origin}?token=${token}`
    }
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white border rounded-lg shadow-lg z-50">
      <div className="text-sm font-semibold mb-2">Token Tester</div>
      <div className="flex gap-2">
        <Input
          placeholder="Pega el token aquí"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-64"
        />
        <Button onClick={handleTest}>Probar</Button>
      </div>
    </div>
  )
}
