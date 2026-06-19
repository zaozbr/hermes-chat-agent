import { useState, useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { vscode } from '../utils/vscode';

interface ModelPickerPopoverProps {
  onClose: () => void;
}

export function ModelPickerPopover({ onClose }: ModelPickerPopoverProps) {
  const s = useStore();
  const [filter, setFilter] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [validating, setValidating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    s.status.provider || (s.catalog.length > 0 ? s.catalog[0].id : ''),
  );
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Sync selected provider when catalog changes
  useEffect(() => {
    if (s.catalog.length > 0 && !s.catalog.find((p) => p.id === selectedProvider)) {
      setSelectedProvider(s.catalog[0].id);
    }
  }, [s.catalog, selectedProvider]);

  // Fetch models when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    if (s.providerModels[selectedProvider]?.length > 0) return;
    setLoading(true);
    vscode.postMessage({ type: 'fetch-provider-models', provider: selectedProvider });
  }, [selectedProvider, s.providerModels]);

  useEffect(() => {
    if (s.providerModels[selectedProvider]?.length > 0 || s.providerModelsError[selectedProvider]) {
      setLoading(false);
    }
  }, [s.providerModels, s.providerModelsError, selectedProvider]);

  const fetchedModels = s.providerModels[selectedProvider] ?? [];
  const catalogEntry = s.catalog.find((p) => p.id === selectedProvider);
  const catalogModels = catalogEntry?.models ?? [];
  const allModels = fetchedModels.length > 0 ? fetchedModels : catalogModels;

  const filteredModels = allModels
    .filter(
      (m) =>
        !filter ||
        m.label.toLowerCase().includes(filter.toLowerCase()) ||
        m.id.toLowerCase().includes(filter.toLowerCase()),
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  const fetchError = s.providerModelsError[selectedProvider];

  function handleSelect(provider: string, model: string) {
    setValidating(true);
    s.setModel(provider, model);
    setTimeout(() => {
      setValidating(false);
      onClose();
    }, 800);
  }

  return (
    <div className="model-picker-popover" ref={popoverRef}>
      {validating && (
        <div className="model-validating">
          <span className="spinner" /> Validando modelo…
        </div>
      )}
      <div className="model-picker-header">
        <select
          className="provider-select"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          title="Selecionar provedor de modelo"
        >
          {s.catalog.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="text"
          className="model-picker-search"
          placeholder="Filtrar modelos…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="model-picker-list">
        {loading && (
          <div className="picker-loading">
            <span className="spinner" /> Buscando modelos…
          </div>
        )}

        {fetchError && (
          <div className="picker-error">
            ⚠{' '}
            {fetchError === 'nvidia-permission'
              ? 'Sem permissão para listar modelos NVIDIA. Usando catálogo estático.'
              : `Erro: ${fetchError}`}
          </div>
        )}

        {!loading && !fetchError && catalogEntry && (
          <div className="model-provider-section">
            {filteredModels.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`model-option ${s.status.provider === catalogEntry.id && s.status.model === m.id ? 'current' : ''}`}
                onClick={() => handleSelect(catalogEntry.id, m.id)}
                title={(m as any).notes ?? m.label}
              >
                <span className="model-label">{m.label}</span>
                {s.status.provider === catalogEntry.id && s.status.model === m.id && (
                  <span className="model-current">●</span>
                )}
                {(m as any).ctx && <span className="model-ctx">{(m as any).ctx}</span>}
                {(m as any).free && <span className="model-free">grátis</span>}
              </button>
            ))}
          </div>
        )}

        {!loading && filteredModels.length === 0 && (
          <div className="picker-empty muted">Nenhum modelo encontrado</div>
        )}
      </div>

      <div className="model-picker-footer">
        <input
          type="text"
          className="model-custom-input"
          placeholder="ou digite o ID do modelo…"
          value={customModel}
          onChange={(e) => setCustomModel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customModel.trim()) {
              handleSelect(selectedProvider, customModel.trim());
            }
          }}
        />
        {customModel.trim() && (
          <button
            type="button"
            className="model-custom-btn"
            onClick={() => handleSelect(selectedProvider, customModel.trim())}
          >
            Usar
          </button>
        )}
      </div>
    </div>
  );
}
