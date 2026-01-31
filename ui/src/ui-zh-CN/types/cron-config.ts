/**
 * Cron scheduled task configuration types
 */
import type { CronJob, CronStatus, CronRunLogEntry, ChannelUiMetaEntry, GatewayAgentRow } from "../../ui/types";
import type { CronFormState } from "../../ui/ui-types";

/**
 * Cron content component Props
 */
export type CronContentProps = {
  // Loading states
  loading: boolean;
  busy: boolean;
  error: string | null;

  // Data
  status: CronStatus | null;
  jobs: CronJob[];
  form: CronFormState;

  // Agent list
  agents: GatewayAgentRow[];
  defaultAgentId: string;

  // Channel association
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];

  // Run history
  runsJobId: string | null;
  runs: CronRunLogEntry[];

  // Expansion state
  expandedJobId: string | null;

  // Delete confirmation
  deleteConfirmJobId: string | null;

  // Create modal state
  showCreateModal: boolean;

  // Edit job ID
  editJobId: string | null;

  // Callbacks
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onUpdate: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
  onExpandJob: (jobId: string | null) => void;
  onDeleteConfirm: (jobId: string | null) => void;
  onShowCreateModal: (show: boolean) => void;
  onEdit: (job: CronJob) => void;
};
