"use client"

import * as React from "react"
import {
  BarChart3,
  Database,
  LayoutDashboard,
  Settings,
  Settings2,
  Sliders,
  Users,
  Zap,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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

  // Define navigation items
  const navItems = [
    {
      title: "Platform",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
          isActive: true,
        },
      ],
    },
    {
      title: "Expert Tools",
      items: [
        {
          title: "Advanced Modeling",
          url: "/expert",
          icon: Zap,
        },
        {
          title: "Tune Parameters",
          url: "/expert/tune",
          icon: Settings2,
        },
        {
          title: "Model Evaluation",
          url: "/expert/evaluation",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          title: "General",
          url: "/admin",
          icon: Settings,
        },
        {
          title: "User Management",
          url: "/admin/users",
          icon: Users,
        },
        {
          title: "Data Management",
          url: "/admin/data",
          icon: Database,
        },
        {
          title: "Preprocessing",
          url: "/admin/preprocessing",
          icon: Sliders,
        },
      ],
    },
  ]

  // Filter items based on role
  const filteredNavItems = React.useMemo(() => {
    const items = []

    // Always show Platform/Dashboard
    items.push(navItems[0])

    if (role === "expert" || role === "admin") {
      items.push(navItems[1])
    }

    if (role === "admin") {
      items.push(navItems[2])
    }

    return items
  }, [role])

  // Flatten the structure for NavMain if needed, or adjust NavMain to handle groups.
  // The current NavMain expects an array of items where each item has a title, url, icon, and optional sub-items.
  // My structure above is Group -> Items.
  // Let's adapt the data to match NavMain's expected structure or modify NavMain.
  // NavMain expects: { title, url, icon, isActive, items: [] }
  
  // Let's map my groups to NavMain items.
  // Actually, NavMain renders a SidebarGroup for the whole list.
  // I should probably use multiple NavMain components or modify NavMain to render groups.
  // For simplicity, let's just pass a flat list of "sections" to NavMain, where each section is a collapsible item.
  
  // Re-structuring to match NavMain:
  const navMainData = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [], // No sub-items for dashboard
    },
    {
      title: "Expert Tools",
      url: "/expert", // Main link
      icon: Zap,
      items: [
        { title: "Advanced Modeling", url: "/expert" },
        { title: "Tune Parameters", url: "/expert/tune" },
        { title: "Model Evaluation", url: "/expert/evaluation" },
      ],
    },
    {
      title: "Administration",
      url: "/admin",
      icon: Settings,
      items: [
        { title: "General", url: "/admin" },
        { title: "User Management", url: "/admin/users" },
        { title: "Data Management", url: "/admin/data" },
        { title: "Preprocessing", url: "/admin/preprocessing" },
      ],
    }
  ]

  const filteredNavMain = React.useMemo(() => {
    const items = []
    items.push(navMainData[0]) // Dashboard

    if (role === "expert" || role === "admin") {
      items.push(navMainData[1]) // Expert Tools
    }

    if (role === "admin") {
      items.push(navMainData[2]) // Administration
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
