/**
 * PySpark App Builder Page
 * 
 * Multi-step wizard for creating and editing PySpark applications.
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, Loader2, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { PageHeader } from '@/components/common'
import {
  SourceSelector,
  ColumnSelector,
  KeyConfiguration,
  SCDConfiguration,
  TargetConfiguration,
  PySparkPreview,
} from '@/features/pyspark/components'
import { 
  useCreatePySparkApp, 
  useUpdatePySparkApp,
  useGeneratePySparkCode,
  usePySparkApp 
} from '@/features/pyspark/hooks'
import {
  PySparkWizardState,
  INITIAL_WIZARD_STATE,
  WIZARD_STEPS,
  PySparkApp,
} from '@/types/pyspark'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Convert a PySparkApp to wizard state for editing
 */
function appToWizardState(app: PySparkApp): PySparkWizardState {
  return {
    currentStep: 'source',
    connectionId: app.connection_id,
    sourceType: app.source_type,
    sourceSchema: app.source_schema || '',
    sourceTable: app.source_table || '',
    sourceQuery: app.source_query || '',
    availableColumns: app.columns_config || [],
    selectedColumns: app.columns_config || [],
    primaryKeyColumns: app.primary_key_columns || [],
    cdcType: app.cdc_type || 'none',
    cdcColumn: app.cdc_column || '',
    partitionColumns: app.partition_columns || [],
    scdType: app.scd_type || 'none',
    writeMode: app.write_mode || 'append',
    targetDatabase: app.target_database || '',
    targetTable: app.target_table || '',
    targetEngine: app.target_engine || 'MergeTree',
    name: app.name,
    description: app.description || '',
    options: app.options || {},
  }
}

export function PySparkAppBuilderPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { id: appId } = useParams<{ id: string }>()
  
  // Determine if we're in edit mode
  const isEditMode = !!appId
  
  // Fetch existing app data when in edit mode
  const { data: existingApp, isLoading: isLoadingApp } = usePySparkApp(appId || '', false)
  
  // Derive the tenant database name from user's tenant
  // Convention: tenant_{slug} where slug is lowercase with underscores
  const tenantDatabase = useMemo(() => {
    if (user?.tenant_name) {
      const slug = user.tenant_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      return `tenant_${slug}`
    }
    return ''
  }, [user?.tenant_name])
  
  const [state, setState] = useState<PySparkWizardState>(INITIAL_WIZARD_STATE)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize state from existing app when in edit mode
  useEffect(() => {
    if (isEditMode && existingApp && !isInitialized) {
      console.log('[PySparkAppBuilderPage] Initializing edit mode with existing app:', existingApp)
      setState(appToWizardState(existingApp))
      setIsInitialized(true)
    }
  }, [isEditMode, existingApp, isInitialized])
  
  // Set default target database to tenant database when user info is available (only for new apps)
  useEffect(() => {
    if (!isEditMode && tenantDatabase && !state.targetDatabase) {
      setState(prev => ({ ...prev, targetDatabase: tenantDatabase }))
    }
  }, [isEditMode, tenantDatabase, state.targetDatabase])
  
  // Set default app name to source table name when table is selected (only for new apps)
  useEffect(() => {
    if (!isEditMode && state.sourceTable && !state.name) {
      const appName = `extract_${state.sourceTable.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      setState(prev => ({ ...prev, name: appName }))
    }
  }, [isEditMode, state.sourceTable, state.name])
  
  const createApp = useCreatePySparkApp()
  const updateApp = useUpdatePySparkApp()
  const generateCode = useGeneratePySparkCode()
  
  const currentStep = WIZARD_STEPS[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1
  const canProceed = currentStep.isValid(state)
  
  // Update state with partial updates
  const handleStateChange = (updates: Partial<PySparkWizardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }
  
  // Navigate to previous step
  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }
  
  // Navigate to next step
  const handleNext = () => {
    if (canProceed && !isLastStep) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }
  
  // Save the PySpark app (create or update)
  const handleSave = async () => {
    try {
      const appData = {
        name: state.name,
        connection_id: state.connectionId,
        description: state.description || undefined,
        source_type: state.sourceType,
        source_schema: state.sourceSchema || undefined,
        source_table: state.sourceTable || undefined,
        source_query: state.sourceQuery || undefined,
        columns_config: state.selectedColumns.filter(c => c.include),
        primary_key_columns: state.primaryKeyColumns,
        cdc_type: state.cdcType,
        cdc_column: state.cdcColumn || undefined,
        partition_columns: state.partitionColumns,
        scd_type: state.scdType,
        write_mode: state.writeMode,
        target_database: state.targetDatabase || undefined,
        target_table: state.targetTable || undefined,
        target_engine: state.targetEngine,
        options: state.options,
      }
      
      let savedAppId: string
      
      if (isEditMode && appId) {
        // Update existing app
        await updateApp.mutateAsync({ appId, data: appData })
        savedAppId = appId
        
        // Regenerate code after update
        await generateCode.mutateAsync(savedAppId)
        
        toast({
          title: 'PySpark App Updated',
          description: `Successfully updated "${state.name}" and regenerated code.`,
        })
      } else {
        // Create new app
        const app = await createApp.mutateAsync(appData)
        savedAppId = app.id
        
        // Generate code after creating
        await generateCode.mutateAsync(savedAppId)
        
        toast({
          title: 'PySpark App Created',
          description: `Successfully created "${app.name}" and generated code.`,
        })
      }
      
      navigate(`/app/pyspark/${savedAppId}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'create'} PySpark app. Please try again.`,
        variant: 'destructive',
      })
    }
  }
  
  // Render current step content
  const renderStepContent = () => {
    console.log('[PySparkAppBuilderPage] Current step:', currentStep.id, 'index:', currentStepIndex)
    switch (currentStep.id) {
      case 'source':
        return <SourceSelector state={state} onStateChange={handleStateChange} />
      case 'columns':
        return <ColumnSelector state={state} onStateChange={handleStateChange} />
      case 'keys':
        return <KeyConfiguration state={state} onStateChange={handleStateChange} />
      case 'scd':
        return <SCDConfiguration state={state} onStateChange={handleStateChange} />
      case 'target':
        return <TargetConfiguration state={state} onStateChange={handleStateChange} />
      case 'preview':
        return <PySparkPreview state={state} />
      default:
        console.error('[PySparkAppBuilderPage] Unknown step:', currentStep.id)
        return null
    }
  }
  
  // Show loading state when fetching existing app in edit mode
  if (isEditMode && isLoadingApp) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading PySpark App...</span>
        </div>
      </div>
    )
  }
  
  // Mutation states
  const isSaving = createApp.isPending || updateApp.isPending || generateCode.isPending
  
  return (
    <div className="container max-w-5xl py-8">
      <PageHeader
        icon={<FileCode className="h-5 w-5" />}
        title={`${isEditMode ? 'Edit' : 'Create'} PySpark App`}
        description={
          isEditMode
            ? `Modify the configuration for "${state.name}"`
            : 'Configure a PySpark extraction job step by step'
        }
        eyebrow={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
        }
      />
      
      {/* Progress Steps - In edit mode, allow clicking on any step */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center",
                index < WIZARD_STEPS.length - 1 && "flex-1"
              )}
            >
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center",
                  // In edit mode, all steps are clickable; in create mode, only completed steps
                  isEditMode || index <= currentStepIndex ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onClick={() => {
                  // In edit mode, allow navigating to any step
                  // In create mode, only allow navigating to previous steps
                  if (isEditMode || index < currentStepIndex) {
                    setCurrentStepIndex(index)
                  }
                }}
                disabled={!isEditMode && index > currentStepIndex}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    index < currentStepIndex && "bg-primary text-primary-foreground",
                    index === currentStepIndex && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                    // In edit mode, show future steps as accessible
                    index > currentStepIndex && isEditMode && "bg-muted text-muted-foreground hover:bg-muted/80",
                    index > currentStepIndex && !isEditMode && "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <span className={cn(
                  "mt-2 text-xs font-medium hidden md:block",
                  index === currentStepIndex && "text-primary",
                  index !== currentStepIndex && "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </button>
              
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    index < currentStepIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
          </span>
          
          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canProceed || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditMode ? 'Update' : 'Save'} PySpark App
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PySparkAppBuilderPage
