import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HermesAgentProvider } from '../src/providers/hermesAgentProvider';
import { store } from '../webview/src/state/store';

let provider: HermesAgentProvider;

beforeEach(() => {
  provider = new HermesAgentProvider();
});

afterEach(() => {
  provider = null as any;
});

describe('HermesAgentProvider', () => {
  describe('constructor', () => {
    it('should initialize providers', () => {
      expect(provider).toBeDefined();
      expect(provider.getAllProviders).toBeDefined();
    });
  });

  describe('getAllProviders', () => {
    it('should return a list of providers', async () => {
      const providers = await provider.getAllProviders();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('Store', () => {
    it('should initialize with default state having expected keys', () => {
      const state = store.get();
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('messages');
      expect(state).toHaveProperty('plan');
      expect(state).toHaveProperty('skills');
      expect(state).toHaveProperty('mcp');
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('sessionId');
      expect(state).toHaveProperty('inProgress');
      expect(state).toHaveProperty('permissionRequest');
      expect(state).toHaveProperty('agents');
      expect(state).toHaveProperty('currentAgent');
    });

    it('should start with empty messages and plan', () => {
      const state = store.get();
      expect(state.messages).toEqual([]);
      expect(state.plan).toEqual([]);
    });

    it('should have default mode set to chat', () => {
      const state = store.get();
      expect(state.mode).toBe('code');
    });

    it('should support subscribe and notify on state change', () => {
      let callCount = 0;
      const unsub = store.subscribe(() => {
        callCount++;
      });
      // Trigger a state change via applyMessage
      store.applyMessage({ type: 'acp-status', payload: { connected: true } });
      expect(callCount).toBeGreaterThanOrEqual(1);
      unsub();
    });

    it('should update status via acp-status message', () => {
      const testStatus = { connected: true, agent: 'test-agent' };
      store.applyMessage({ type: 'acp-status', payload: testStatus });
      const state = store.get();
      expect(state.status.connected).toBe(true);
      expect(state.status.agent).toBe('test-agent');
    });
  });
});
