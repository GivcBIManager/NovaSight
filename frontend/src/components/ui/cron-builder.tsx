/**
 * Cron Expression Builder Component
 * 
 * User-friendly UI for building cron expressions without writing them manually.
 */

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

interface CronBuilderProps {
  value: string
  onChange: (cron: string) => void
}

type ScheduleType = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: i.toString().padStart(2, '0') + ':00',
}))

const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: String(i),
  label: i.toString().padStart(2, '0'),
}))

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}))

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily')
  const [minute, setMinute] = useState('0')
  const [hour, setHour] = useState('0')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [customCron, setCustomCron] = useState('')

  // Parse initial value to determine schedule type
  useEffect(() => {
    if (!value) {
      setScheduleType('manual')
      return
    }

    // Try to parse common patterns
    const parts = value.split(' ')
    if (parts.length !== 5) {
      setScheduleType('custom')
      setCustomCron(value)
      return
    }

    const [min, hr, dom, , dow] = parts

    // Check for hourly pattern: "X * * * *"
    if (hr === '*' && dom === '*' && dow === '*') {
      setScheduleType('hourly')
      setMinute(min)
      return
    }

    // Check for daily pattern: "X Y * * *"
    if (dom === '*' && dow === '*') {
      setScheduleType('daily')
      setMinute(min)
      setHour(hr)
      return
    }

    // Check for weekly pattern: "X Y * * Z"
    if (dom === '*' && dow !== '*') {
      setScheduleType('weekly')
      setMinute(min)
      setHour(hr)
      setDayOfWeek(dow)
      return
    }

    // Check for monthly pattern: "X Y Z * *"
    if (dom !== '*' && dow === '*') {
      setScheduleType('monthly')
      setMinute(min)
      setHour(hr)
      setDayOfMonth(dom)
      return
    }

    // Fallback to custom
    setScheduleType('custom')
    setCustomCron(value)
  }, [])

  // Generate cron expression whenever settings change
  useEffect(() => {
    let cron = ''

    switch (scheduleType) {
      case 'manual':
        cron = ''
        break
      case 'hourly':
        cron = `${minute} * * * *`
        break
      case 'daily':
        cron = `${minute} ${hour} * * *`
        break
      case 'weekly':
        cron = `${minute} ${hour} * * ${dayOfWeek}`
        break
      case 'monthly':
        cron = `${minute} ${hour} ${dayOfMonth} * *`
        break
      case 'custom':
        cron = customCron
        break
    }

    onChange(cron)
  }, [scheduleType, minute, hour, dayOfWeek, dayOfMonth, customCron, onChange])

  const getCronDescription = (): string => {
    switch (scheduleType) {
      case 'manual':
        return 'No automatic schedule - trigger manually'
      case 'hourly':
        return `Every hour at minute ${minute}`
      case 'daily':
        return `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      case 'weekly':
        const dayName = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label
        return `Every ${dayName} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      case 'monthly':
        return `Monthly on day ${dayOfMonth} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      case 'custom':
        return customCron || 'Enter a custom cron expression'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Schedule Type
        </Label>
        <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual (No Schedule)</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom Cron</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scheduleType === 'hourly' && (
        <div className="space-y-2">
          <Label>At Minute</Label>
          <Select value={minute} onValueChange={setMinute}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.filter((_, i) => i % 5 === 0).map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  :{m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'monthly') && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Hour</Label>
            <Select value={hour} onValueChange={setHour}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Minute</Label>
            <Select value={minute} onValueChange={setMinute}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.filter((_, i) => i % 5 === 0).map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    :{m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {scheduleType === 'weekly' && (
        <div className="space-y-2">
          <Label>Day of Week</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {scheduleType === 'monthly' && (
        <div className="space-y-2">
          <Label>Day of Month</Label>
          <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_MONTH.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {scheduleType === 'custom' && (
        <div className="space-y-2">
          <Label>Cron Expression</Label>
          <Input
            placeholder="0 0 * * *"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      {/* Schedule Description */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">{getCronDescription()}</p>
        {scheduleType !== 'manual' && scheduleType !== 'custom' && (
          <Badge variant="outline" className="mt-2 font-mono text-xs">
            {value || 'No cron expression'}
          </Badge>
        )}
      </div>
    </div>
  )
}

export default CronBuilder
