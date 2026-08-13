// Bridge to the internal design system (cloned from ~/Projects/app/src/core).
// Import from component files directly — index.ts pulls in heavy legacy
// modules (styled-components Button/Switch, DataTable) this prototype
// doesn't need.
export {
  MetaChip,
  RiskSeverityBadge,
  CountBubble,
  RiskDot,
} from '../design-system/core/Badge'
export { ActionButton, IconActionButton } from '../design-system/core/Action'
export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuLabel,
  MenuSeparator,
} from '../design-system/core/Menu'
export { Avatar } from '../design-system/core/Avatar'
export {
  SegmentedControl,
  SegmentedControlItem,
} from '../design-system/core/SegmentedControl'
export { Surface } from '../design-system/core/Surface'
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsCount,
} from '../design-system/core/TabsPrimitive'
export {
  PageHeader,
  PageHeaderBar,
  PageHeaderTitles,
  PageHeaderActions,
  PageHeading,
  PageBreadcrumb,
  PageBreadcrumbItem,
} from '../design-system/core/PageChrome'
export {
  ChatLog,
  ChatMessage,
  ChatComposer,
  ChatSuggestions,
} from '../design-system/core/Chat'
