/**
 * Save to Dashboard Dialog
 * Allows users to save query results as a widget on a dashboard
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Plus, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'
import type { Dashboard, WidgetType } from '@/types/dashboard'
import type { SaveToWidgetConfig } from '../types'

interface SaveToDashboardDialogProps {
  queryConfig: SaveToWidgetConfig
  chartType: WidgetType
}

export function SaveToDashboardDialog({ 
  queryConfig, 
  chartType
}: SaveToDashboardDialogProps) {
  const [open, setOpen] = useState(false)
  const [widgetName, setWidgetName] = useState('')
  const [selectedDashboard, setSelectedDashboard] = useState<string>('')
  const [createNew, setCreateNew] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [selectedChartType, setSelectedChartType] = useState<WidgetType>(chartType)
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch existing dashboards
  const { data: dashboards, isLoading: loadingDashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const response = await api.get<Dashboard[]>('/dashboards')
      return response.data
    },
    enabled: open,
  })

  // Create new dashboard mutation
  const createDashboardMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post<Dashboard>('/dashboards', { 
        name,
        description: 'Created from query interface',
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })

  // Add widget mutation
  const addWidgetMutation = useMutation({
    mutationFn: async (data: { dashboardId: string; widget: any }) => {
      const response = await api.post(
        `/dashboards/${data.dashboardId}/widgets`,
        data.widget
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      toast({
        title: 'Widget saved',
        description: 'Your query has been saved to the dashboard.',
      })
      setOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save widget',
        description: error?.message || 'An error occurred while saving.',
        variant: 'destructive',
      })
    },
  })

  const resetForm = () => {
    setWidgetName('')
    setSelectedDashboard('')
    setCreateNew(false)
    setNewDashboardName('')
    setSelectedChartType(chartType)
  }

  const handleSave = async () => {
    let dashboardId = selectedDashboard

    // Create new dashboard if needed
    if (createNew && newDashboardName) {
      try {
        const newDashboard = await createDashboardMutation.mutateAsync(newDashboardName)
        dashboardId = newDashboard.id
      } catch {
        return
      }
    }

    if (!dashboardId) {
      toast({
        title: 'Select a dashboard',
        description: 'Please select or create a dashboard first.',
        variant: 'destructive',
      })
      return
    }

    // Create widget
    const widget = {
      name: widgetName || 'Query Result',
      type: selectedChartType,
      query_config: {
        dimensions: queryConfig.dimensions,
        measures: queryConfig.measures,
        filters: queryConfig.filters,
      },
      viz_config: {
        xAxis: queryConfig.dimensions[0],
        yAxis: queryConfig.measures,
        showLegend: true,
        showGrid: true,
      },
      grid_position: {
        x: 0,
        y: Infinity, // Will be placed at the bottom
        w: 6,
        h: 4,
      },
    }

    addWidgetMutation.mutate({ dashboardId, widget })
  }

  const chartTypes: { value: WidgetType; label: string }[] = [
    { value: 'bar_chart', label: 'Bar Chart' },
    { value: 'line_chart', label: 'Line Chart' },
    { value: 'pie_chart', label: 'Pie Chart' },
    { value: 'area_chart', label: 'Area Chart' },
    { value: 'table', label: 'Table' },
    { value: 'metric_card', label: 'Metric Card' },
  ]

  const isLoading = createDashboardMutation.isPending || addWidgetMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save to Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save to Dashboard</DialogTitle>
          <DialogDescription>
            Add this query result as a widget on a dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Widget Name */}
          <div className="grid gap-2">
            <Label htmlFor="widget-name">Widget Name</Label>
            <Input
              id="widget-name"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="e.g., Monthly Sales by Region"
            />
          </div>

          {/* Chart Type */}
          <div className="grid gap-2">
            <Label>Chart Type</Label>
            <Select 
              value={selectedChartType} 
              onValueChange={(v) => setSelectedChartType(v as WidgetType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dashboard Selection */}
          <div className="grid gap-2">
            <Label>Dashboard</Label>
            <RadioGroup
              value={createNew ? 'new' : 'existing'}
              onValueChange={(v: string) => setCreateNew(v === 'new')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal">
                  Add to existing dashboard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="font-normal">
                  Create new dashboard
                </Label>
              </div>
            </RadioGroup>
          </div>

          {createNew ? (
            <div className="grid gap-2">
              <Label htmlFor="new-dashboard">New Dashboard Name</Label>
              <Input
                id="new-dashboard"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="e.g., Sales Analytics"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Select Dashboard</Label>
              <Select
                value={selectedDashboard}
                onValueChange={setSelectedDashboard}
                disabled={loadingDashboards}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a dashboard" />
                </SelectTrigger>
                <SelectContent>
                  {dashboards?.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {dashboard.name}
                      </div>
                    </SelectItem>
                  ))}
                  {dashboards?.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No dashboards found. Create a new one.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              'Saving...'
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
