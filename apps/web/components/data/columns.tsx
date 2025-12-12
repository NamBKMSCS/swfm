"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, CheckCircle2, AlertCircle, Trash2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { StationMeasurements } from "@/lib/supabase/schema"

// View-model for DataTable (extends StationMeasurements with joined/parsed fields)
export type MeasurementRecord = {
  id: string
  station_id: StationMeasurements['station_id']
  station: string  // Joined from stations table
  date: string     // Parsed from measured_at
  time: string     // Parsed from measured_at
  water_level: StationMeasurements['water_level']
  rainfall_24h: StationMeasurements['rainfall_24h']
  source: StationMeasurements['source']
  status: StationMeasurements['status']
}

export const createColumns = (
  onEdit: (record: MeasurementRecord) => void,
  onDelete: (id: string) => void,
  onVerify: (id: string, currentStatus: string) => void
): ColumnDef<MeasurementRecord>[] => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-slate-500"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-slate-500"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Date & Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("date")}</div>
          <div className="text-xs text-slate-500">{row.original.time}</div>
        </div>
      ),
    },
    {
      accessorKey: "station",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Station
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <span className="font-medium text-white">{row.getValue("station")}</span>
      ),
    },
    {
      accessorKey: "water_level",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Water Level
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const value = row.getValue("water_level") as number | null
        return value !== null ? (
          <span>{value.toFixed(2)} <span className="text-xs text-slate-500">m</span></span>
        ) : (
          <span className="text-slate-500">-</span>
        )
      },
    },
    {
      accessorKey: "rainfall_24h",
      header: "Rainfall (24h)",
      cell: ({ row }) => {
        const value = row.getValue("rainfall_24h") as number | null
        return value !== null ? (
          <span>{value.toFixed(1)} <span className="text-xs text-slate-500">mm</span></span>
        ) : (
          <span className="text-slate-500">-</span>
        )
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const source = row.getValue("source") as string
        return (
          <Badge
            variant="outline"
            className={source === "automated"
              ? "bg-blue-900/50 text-blue-200 border-blue-700"
              : "bg-slate-700 text-slate-300 border-slate-600"
            }
          >
            {source}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const record = row.original
        return (
          <button
            onClick={() => onVerify(record.id, status)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${status === "verified"
              ? "bg-green-900/50 text-green-200 hover:bg-green-900/70"
              : "bg-orange-900/50 text-orange-200 hover:bg-orange-900/70"
              }`}
          >
            {status === "verified" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            <span className="capitalize">{status}</span>
          </button>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuLabel className="text-slate-300">Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(record.id)}
                className="text-slate-300 focus:bg-slate-700 focus:text-white"
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={() => onEdit(record)}
                className="text-slate-300 focus:bg-slate-700 focus:text-white"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(record.id)}
                className="text-red-400 focus:bg-red-900/50 focus:text-red-300"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
