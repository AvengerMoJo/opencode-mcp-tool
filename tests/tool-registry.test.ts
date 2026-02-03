import { describe, it, expect } from 'vitest';
import { toolRegistry, toolExists, getToolDefinitions, getPromptDefinitions, executeTool } from '../src/tools/registry.js';
import { askOpenCodeTool } from '../src/tools/ask-opencode.tool.js';
import { ToolArguments } from '../src/constants.js';

describe('Tool Registry', () => {
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

  it('should execute ask-opencode tool', async () => {
    const args: ToolArguments = {
      prompt: 'test prompt',
      agent: 'plan'
    };
    
    const result = await executeTool('ask-opencode', args);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
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
  it('should validate correct arguments', async () => {
    const validArgs: ToolArguments = {
      prompt: 'test prompt',
      agent: 'plan'
    };
    
    const result = await executeTool('ask-opencode', validArgs);
    expect(result).toBeDefined();
  });

  it('should reject missing required arguments', async () => {
    const invalidArgs: ToolArguments = {
      prompt: ''
    };
    
    await expect(
      executeTool('ask-opencode', invalidArgs)
    ).rejects.toThrow();
  });
});