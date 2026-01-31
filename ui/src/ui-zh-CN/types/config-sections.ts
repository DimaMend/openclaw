/**
 * Config section type definitions
 */

export type ConfigSection = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

/**
 * Config section IDs
 * workspace - Workspace file management (SOUL.md, IDENTITY.md etc.)
 * skills - Skill configuration management
 */
export type ConfigSectionId = "providers" | "agent" | "gateway" | "channels" | "permissions" | "workspace" | "skills" | "cron";
