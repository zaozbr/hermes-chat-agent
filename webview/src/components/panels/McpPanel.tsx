import { useState, useEffect } from 'react';
import { useStore } from '../../state/store';
import type { McpInfo, McpServerDetail } from '../../state/store';

export function McpPanel({ s }: { s: ReturnType<typeof useStore> }) {
  useEffect(() => {
    s.loadMcp();
    s.loadMcpRegistries();
  }, []);

  const servers = s.mcp || [];
  const registries = s.mcpRegistries || [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [customName, setCustomName] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [showRegistry, setShowRegistry] = useState(true);

  useEffect(() => {
    if (registries.length > 0) {
      registries.forEach((r) => {
        if (r.enabled && !s.mcpRegistryServers[r.id]) {
          s.fetchRegistryServers(r.id);
        }
      });
    }
  }, [registries.length]);

  function toggle(name: string, enabled: boolean) {
    s.toggleMcp(name, enabled);
  }

  function toggleDetail(name: string) {
    const next = { ...expanded, [name]: !expanded[name] };
    setExpanded(next);
    if (!s.mcpDetail[name] && next[name]) {
      s.loadMcpTools(name);
    }
  }

  function handleAddCustom() {
    if (!customName.trim()) return;
    const args = customArgs.trim() ? customArgs.trim().split(/\s+/) : [];
    s.addMcpServer({ name: customName.trim(), command: customCommand.trim(), args });
    setCustomName('');
    setCustomCommand('');
    setCustomArgs('');
  }

  function handleInstallFromRegistry(server: any) {
    s.installMcpFromRegistry(server);
  }

  const searchQuery = s.mcpRegistrySearch?.toLowerCase() ?? '';
  function filterServers(servers: any[]): any[] {
    if (!searchQuery) return servers;
    return servers.filter(
      (sv) =>
        sv.name.toLowerCase().includes(searchQuery) ||
        sv.description?.toLowerCase().includes(searchQuery),
    );
  }

  return (
    <main className="panel-view">
      <div className="panel-header">
        <h3>🔌 Servidores MCP</h3>
        <p className="muted">
          Model Context Protocol — servidores de ferramentas externos.
          {s.mcpError && (
            <span
              className="mcp-error-badge"
              onClick={() => s.clearMcpError()}
              title="Clique para limpar"
            >
              ⚠ {s.mcpError}
            </span>
          )}
        </p>
      </div>
      <div className="panel-body">
        <div className="mcp-section-label">
          <span>📦 Servidores Instalados</span>
          <span className="muted count">{servers.length}</span>
        </div>
        {servers.length === 0 ? (
          <p className="muted">
            Nenhum servidor MCP encontrado. Use o registry abaixo para adicionar.
          </p>
        ) : (
          servers.map((srv: McpInfo) => {
            const detail: McpServerDetail | undefined = s.mcpDetail[srv.name];
            const isExpanded = !!expanded[srv.name];
            return (
              <div key={srv.name} className="mcp-card">
                <div className="mcp-item">
                  <div className="mcp-info">
                    <span className={`dot ${srv.enabled ? 'on' : 'off'}`} />
                    <strong>{srv.name}</strong>
                    <span className="muted">· {srv.transport}</span>
                    {detail && (
                      <span className={`mcp-status-badge ${detail.status}`}>
                        {detail.status === 'connected'
                          ? '✓'
                          : detail.status === 'error'
                            ? '✗'
                            : '?'}
                      </span>
                    )}
                  </div>
                  <div className="mcp-actions">
                    <button
                      className="icon-btn"
                      onClick={() => toggleDetail(srv.name)}
                      title={isExpanded ? 'Fechar detalhes' : 'Detalhes'}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => s.testMcpConnection(srv.name)}
                      title="Testar conexão"
                    >
                      🔍
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => {
                        if (confirm(`Remover servidor ${srv.name}?`)) s.removeMcp(srv.name);
                      }}
                      title="Remover servidor"
                    >
                      🗑
                    </button>
                    <button
                      className={`toggle-btn ${srv.enabled ? 'on' : ''}`}
                      onClick={() => toggle(srv.name, !srv.enabled)}
                      title={srv.enabled ? 'Desativar' : 'Ativar'}
                    >
                      {srv.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mcp-detail">
                    {detail ? (
                      <>
                        <div className="mcp-detail-row">
                          <span className="muted">Status:</span>
                          <span className={`mcp-status-badge ${detail.status}`}>
                            {detail.status}
                          </span>
                        </div>
                        {detail.error && (
                          <div className="mcp-detail-row">
                            <span className="muted">Erro:</span>
                            <span className="mcp-error-text">{detail.error}</span>
                          </div>
                        )}
                        <div className="mcp-detail-row">
                          <span className="muted">Ferramentas ({detail.tools.length}):</span>
                        </div>
                        {detail.tools.length > 0 ? (
                          <div className="mcp-tools-list">
                            {detail.tools.map((tool) => (
                              <div key={tool.name} className="mcp-tool-item">
                                <span className="mcp-tool-name">{tool.name}</span>
                                <span className="muted">{tool.description}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">
                            Nenhuma ferramenta encontrada ou servidor não respondeu.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="muted">
                        Carregando detalhes...{' '}
                        <button className="icon-btn" onClick={() => s.loadMcpTools(srv.name)}>
                          🔄
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div className="mcp-actions-bar">
          <button onClick={() => s.loadMcp()} className="action-btn">
            🔄 Recarregar
          </button>
          <button onClick={() => s.openMcpInstallForm('custom')} className="action-btn primary">
            ➕ Adicionar Servidor
          </button>
          <button onClick={() => setShowRegistry(!showRegistry)} className="action-btn">
            {showRegistry ? '▲ Ocultar Registry' : '▼ Mostrar Registry'}
          </button>
        </div>

        {s.installForm.open && s.installForm.type === 'custom' && (
          <div className="mcp-install-form">
            <h4>Adicionar Servidor MCP Customizado</h4>
            <div className="mcp-form-row">
              <label>Nome</label>
              <input
                type="text"
                className="mcp-input"
                placeholder="ex: my-server"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="mcp-form-row">
              <label>Comando</label>
              <input
                type="text"
                className="mcp-input"
                placeholder="ex: npx, node, python"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
              />
            </div>
            <div className="mcp-form-row">
              <label>Argumentos</label>
              <input
                type="text"
                className="mcp-input"
                placeholder="ex: -m my-server"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
              />
            </div>
            <div className="mcp-form-actions">
              <button onClick={() => s.closeMcpInstallForm()} className="action-btn">
                Cancelar
              </button>
              <button
                onClick={handleAddCustom}
                className="action-btn primary"
                disabled={!customName.trim() || !customCommand.trim()}
              >
                ✓ Adicionar
              </button>
            </div>
          </div>
        )}

        {showRegistry && (
          <div className="mcp-registry-section">
            <div className="mcp-section-label">
              <span>🔍 Registry Browser</span>
              <span className="muted">Descubra servidores MCP de múltiplos registries</span>
            </div>
            <div className="mcp-registry-search">
              <input
                type="text"
                className="mcp-input"
                placeholder="Buscar servidores por nome ou descrição..."
                value={s.mcpRegistrySearch}
                onChange={(e) => s.setMcpRegistrySearch(e.target.value)}
              />
            </div>
            {registries.length > 0 && (
              <div className="mcp-registry-tabs">
                {registries.map((reg) => {
                  const loading = s.mcpRegistryLoading[reg.id];
                  const error = s.mcpRegistryError[reg.id];
                  const servers_list = s.mcpRegistryServers[reg.id] ?? [];
                  const isActive =
                    s.mcpActiveRegistry === reg.id ||
                    (!s.mcpActiveRegistry && registries[0]?.id === reg.id);
                  return (
                    <div
                      key={reg.id}
                      className={`mcp-registry-tab ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        s.setMcpActiveRegistry(reg.id);
                        if (!s.mcpRegistryServers[reg.id]) s.fetchRegistryServers(reg.id);
                      }}
                    >
                      <span className="reg-label">{reg.label}</span>
                      {loading ? (
                        <span className="reg-status loading">⟳</span>
                      ) : error ? (
                        <span className="reg-status error" title={error}>
                          ⚠
                        </span>
                      ) : (
                        <span className="reg-status count">{servers_list.length}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {(() => {
              const activeReg = s.mcpActiveRegistry
                ? registries.find((r) => r.id === s.mcpActiveRegistry)
                : registries[0];
              if (!activeReg) return null;
              const loading = s.mcpRegistryLoading[activeReg.id];
              const error = s.mcpRegistryError[activeReg.id];
              let servers_list = s.mcpRegistryServers[activeReg.id] ?? [];
              servers_list = filterServers(servers_list);
              return (
                <div className="mcp-registry-content">
                  {loading && servers_list.length === 0 && (
                    <div className="mcp-registry-loading">
                      <span className="loading-spinner">⟳</span>
                      <span>Carregando servidores de {activeReg.label}...</span>
                    </div>
                  )}
                  {error && servers_list.length === 0 && (
                    <div className="mcp-registry-empty">
                      <p className="muted">⚠ Erro ao carregar: {error}</p>
                      <button
                        className="action-btn"
                        onClick={() => s.fetchRegistryServers(activeReg.id)}
                      >
                        🔄 Tentar novamente
                      </button>
                    </div>
                  )}
                  {!loading && !error && servers_list.length === 0 && (
                    <div className="mcp-registry-empty">
                      <p className="muted">
                        Nenhum servidor encontrado em {activeReg.label}.
                        {searchQuery && ' Tente um termo de busca diferente.'}
                      </p>
                    </div>
                  )}
                  {servers_list.length > 0 && (
                    <div className="mcp-registry-grid">
                      {servers_list.map((sv: any) => (
                        <div key={sv.id} className="mcp-registry-card">
                          <div className="reg-card-header">
                            <strong className="reg-card-name">{sv.name}</strong>
                            <span className={`mcp-transport-badge ${sv.transport}`}>
                              {sv.transport}
                            </span>
                          </div>
                          <p className="reg-card-desc">{sv.description || 'Sem descrição'}</p>
                          <div className="reg-card-meta">
                            {sv.toolCount != null && (
                              <span className="muted">{sv.toolCount} ferramentas</span>
                            )}
                            {sv.tags && sv.tags.length > 0 && (
                              <span className="reg-card-tags">
                                {sv.tags.slice(0, 3).map((t: string) => (
                                  <span key={t} className="reg-tag">
                                    {t}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                          <div className="reg-card-actions">
                            <button
                              className="action-btn primary reg-install-btn"
                              onClick={() => handleInstallFromRegistry(sv)}
                              title={
                                sv.command ? `Instalar via ${sv.command}` : 'Instalar servidor'
                              }
                            >
                              📥 Instalar
                            </button>
                            {sv.homepage && (
                              <a
                                href={sv.homepage}
                                title="Abrir página do servidor"
                                className="action-btn"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                🌐
                              </a>
                            )}
                          </div>
                          {sv.command && (
                            <div className="reg-card-command">
                              <code>
                                {sv.command}
                                {sv.args ? ' ' + sv.args.join(' ') : ''}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!loading && servers_list.length > 0 && (
                    <div className="center-action">
                      <button
                        className="action-btn"
                        onClick={() => s.fetchRegistryServers(activeReg.id)}
                      >
                        🔄 Recarregar
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="mcp-footer-info">
          <p className="muted">
            💡 Dica: Use <code>hermes mcp list</code> no terminal para gerenciar servidores.
            Configure servidores MCP adicionais em <code>hermes-agent.mcpServers</code> nas
            configurações do VS Code.
          </p>
        </div>
      </div>
    </main>
  );
}
