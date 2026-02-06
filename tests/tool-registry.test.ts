import { describe, it, expect, beforeAll } from 'vitest';
import { toolRegistry, toolExists, getToolDefinitions, getPromptDefinitions, executeTool } from '../src/tools/registry.js';
import { ToolArguments } from '../src/constants.js';
import { setServerConfig } from '../src/config.js';
import '../src/tools/index.js';

describe('Tool Registry', () => {
  beforeAll(() => {
    setServerConfig({ primaryModel: 'google/gemini-2.5-pro' });
  });

  it('should register tools', () => {
    expect(toolRegistry.length).toBeGreaterThan(0);
  });

  it('should have ask-opencode tool', () => {
    expect(toolExists('ask-opencode')).toBe(true);
  });

  it('should get tool definitions', () => {
    const definitions = getToolDefinitions();
    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions[0].name).toBeDefined();
    expect(definitions[0].description).toBeDefined();
    expect(definitions[0].inputSchema).toBeDefined();
  });

  it('should get prompt definitions', () => {
    const prompts = getPromptDefinitions();
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('should handle invalid tool name', async () => {
    await expect(
      executeTool('non-existent-tool', { prompt: 'test' })
    ).rejects.toThrow('Unknown tool: non-existent-tool');
  });

  it('should handle invalid arguments', async () => {
    await expect(
      executeTool('ask-opencode', {})
    ).rejects.toThrow('Invalid arguments for ask-opencode');
  });
});

describe('Tool Categories', () => {
  it('should categorize tools', () => {
    toolRegistry.forEach(tool => {
      expect(['simple', 'opencode', 'utility']).toContain(tool.category);
    });
  });
});

describe('Tool Schema Validation', () => {
  it('should reject missing required arguments', async () => {
    const invalidArgs: ToolArguments = {
      prompt: ''
    };

    await expect(
      executeTool('ask-opencode', invalidArgs)
    ).rejects.toThrow();
  });
});
