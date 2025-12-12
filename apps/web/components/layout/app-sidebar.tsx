"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/providers/auth-provider"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useAuth()

  // Define navigation structure
  const navMainData = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [],
    },
    {
      title: "Expert Tools",
      url: "/forecast",
      icon: Zap,
      items: [
        { title: "Forecasting", url: "/forecast" },
        { title: "Model Registry", url: "/models" },
        { title: "Model Evaluation", url: "/evaluation" },
        { title: "Preprocessing", url: "/preprocessing" },
      ],
    },
    {
      title: "Administration",
      url: "/admin",
      icon: Settings,
      items: [
        { title: "User Management", url: "/admin/users" },
        { title: "Data Management", url: "/data" },
      ],
    }
  ]

  const filteredNavMain = React.useMemo(() => {
    const items = []

    // Dashboard is visible to all authenticated users
    items.push(navMainData[0])

    // Expert Tools are visible to Admin and Data Scientists
    if (role === "admin" || role === "expert") {
      items.push(navMainData[1])
    }

    // Administration is visible ONLY to Admins
    if (role === "admin") {
      items.push(navMainData[2])
    }

    return items
  }, [role])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">SWFM</span>
            <span className="truncate text-xs">Water Forecasting</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
