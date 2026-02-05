import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, Pin, PinOff, Settings } from 'lucide-react'
import { useFavicon } from '../hooks/useFavicon'
import { useSidebar } from '../hooks/useSidebar'
import { useTranslation } from '../i18n'
import { cn } from '../lib/utils'
import { useAppearanceConfig } from '../store/appStore'
import { ProviderIcons } from './icons'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

// Provider icon component with favicon support
const ProviderIconWithFavicon = ({
  providerId,
  providerIcon,
  providerName,
  color,
  isActive,
  onClick,
  showLabel,
}: {
  providerId: string
  providerIcon: string
  providerName: string
  color: string
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  showLabel?: boolean
}) => {
  // Try to load favicon from backend
  const { favicon } = useFavicon(providerId, 64)
  const IconComponent = ProviderIcons[providerIcon as keyof typeof ProviderIcons]

  // Render icon: favicon > SVG icon > initials fallback
  const renderIcon = () => {
    if (favicon) {
      return (
        <img
          src={favicon}
          alt={providerName}
          className={cn(
            'h-7 w-7 rounded-md object-contain transition-transform duration-300',
            isActive ? 'scale-110' : 'group-hover:opacity-80'
          )}
          onError={(e) => {
            // Hide broken image
            e.currentTarget.style.display = 'none'
          }}
        />
      )
    }

    if (IconComponent) {
      return (
        <IconComponent
          className={cn(
            'h-7 w-7 transition-transform duration-300',
            isActive ? 'scale-110' : 'group-hover:opacity-80'
          )}
          color={isActive ? color : 'currentColor'}
        />
      )
    }

    return (
      <span className="text-sm font-bold uppercase text-foreground">
        {providerName.slice(0, 2)}
      </span>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'relative h-12 w-12 rounded-xl transition-all duration-300 group text-foreground hover:bg-foreground/10',
        showLabel && 'w-full justify-start gap-3 px-3',
        isActive && 'bg-foreground/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300',
          isActive ? 'opacity-100' : 'group-hover:opacity-50'
        )}
        style={{ backgroundColor: isActive ? `${color}20` : 'transparent' }}
      />

      {renderIcon()}

      {showLabel && (
        <span className="text-xs font-medium text-foreground truncate">{providerName}</span>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-foreground rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]',
            showLabel ? 'h-6' : 'h-8'
          )}
        />
      )}
    </Button>
  )
}

// Sortable Item Wrapper
function SortableProviderItem({
  provider,
  children,
  className,
}: {
  provider: { id: string }
  children: React.ReactNode
  className?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('relative group/item w-full flex touch-none', className)}
    >
      {children}
    </div>
  )
}

function Sidebar() {
  const { t } = useTranslation()
  const appearance = useAppearanceConfig()
  const showProviderNames = appearance?.showProviderNames ?? false
  const {
    currentProviderId,
    enabledProviders,
    isLoading,
    isPinned,
    handleProviderClick,
    handleDetach,
    handleTogglePin,
    openSettings,
    handleReorder,
  } = useSidebar()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = enabledProviders.findIndex((p) => p.id === active.id)
      const newIndex = enabledProviders.findIndex((p) => p.id === over.id)

      const newOrder = arrayMove(enabledProviders, oldIndex, newIndex)
      // We update the order. useSidebar handles sending this to backend/store.
      if (handleReorder) {
        handleReorder(newOrder)
      }
    }
  }

  return (
    <aside
      className={cn(
        'shrink-0 flex h-full flex-col bg-background/95 backdrop-blur-xl border-r border-border py-4 z-50 select-none transition-[width] duration-200',
        showProviderNames ? 'w-[140px] items-stretch px-2' : 'w-[72px] items-center'
      )}
    >
      {/* App Logo / Pin */}
      <div className="mb-4 flex w-full justify-center">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTogglePin}
              className={cn(
                'h-10 w-10 rounded-full transition-colors hover:bg-foreground/10',
                isPinned ? 'text-primary bg-primary/10' : 'text-muted-foreground'
              )}
            >
              {isPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="bg-popover border-border text-popover-foreground"
          >
            <p>{isPinned ? t('sidebar.unpinWindow') : t('sidebar.pinWindow')}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator className={cn('bg-border mb-4', showProviderNames ? 'w-full' : 'w-10')} />

      {/* Providers List */}
      <ScrollArea className={cn('flex-1 w-full', showProviderNames ? 'px-1' : 'px-2')}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={enabledProviders.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={cn(
                'flex flex-col gap-3 py-2 pb-4',
                showProviderNames ? 'items-stretch' : 'items-center'
              )}
            >
              {isLoading ? (
                <div className="text-muted-foreground text-xs">Loading...</div>
              ) : enabledProviders.length === 0 ? (
                <div className="text-muted-foreground text-xs text-center px-2">No providers</div>
              ) : (
                enabledProviders.map((provider) => (
                  <SortableProviderItem
                    key={provider.id}
                    provider={provider}
                    className={showProviderNames ? 'justify-start' : 'justify-center'}
                  >
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className={cn(showProviderNames ? 'w-full' : '')}>
                          <ProviderIconWithFavicon
                            providerId={provider.id}
                            providerIcon={provider.icon}
                            providerName={provider.name}
                            color={provider.color || '#ffffff'}
                            isActive={currentProviderId === provider.id}
                            onClick={(e) => handleProviderClick(provider, e)}
                            showLabel={showProviderNames}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={10}
                        className="flex items-center gap-2 bg-popover border-border text-popover-foreground z-[60]"
                      >
                        <span className="font-medium">{provider.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-foreground/20 ml-2"
                          onClick={(e) => handleDetach(provider.url, e)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipContent>
                    </Tooltip>
                  </SortableProviderItem>
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      <Separator className={cn('bg-border my-4', showProviderNames ? 'w-full' : 'w-10')} />

      {/* Settings */}
      <div className="mt-auto">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openSettings()}
              className="h-12 w-12 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="bg-popover border-border text-popover-foreground"
          >
            <p>{t('sidebar.settings')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}

export default Sidebar
