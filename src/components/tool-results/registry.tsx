import type { ComponentType } from 'react';

export interface ToolResultProps {
  result: any;
  args: any;
  status: 'pending' | 'complete' | 'error';
}

const registry: Record<string, ComponentType<ToolResultProps>> = {};

/**
 * Register a custom renderer for a tool's result output.
 * Call at module scope in each tool-result component file.
 */
export function registerToolRenderer(toolName: string, component: ComponentType<ToolResultProps>) {
  registry[toolName] = component;
}

export function getToolRenderer(toolName: string): ComponentType<ToolResultProps> | undefined {
  return registry[toolName];
}
