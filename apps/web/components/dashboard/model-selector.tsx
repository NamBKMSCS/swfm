"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const models = [
    { id: "hybrid", name: "Hybrid Model", accuracy: "94.2%", description: "ML + Statistical ensemble" },
    { id: "lstm", name: "LSTM Neural Network", accuracy: "91.5%", description: "Deep learning approach" },
    { id: "statistical", name: "Statistical", accuracy: "87.8%", description: "Traditional time series" },
  ]

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${selectedModel === model.id
                ? "bg-blue-900 border-blue-500"
                : "bg-slate-700 border-slate-700 hover:border-slate-600"
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-white">{model.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{model.description}</p>
                </div>
                {selectedModel === model.id && <Check className="w-5 h-5 text-blue-400" />}
              </div>
              <p className="text-sm text-slate-300 mt-2">Accuracy: {model.accuracy}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
