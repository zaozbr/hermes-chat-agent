# 🔒 GitHub Branch Protection Rules

> Documentação das regras de proteção de branch para o repositório Hermes Agent.
> Configure manualmente em: **Settings → Branches → Add branch protection rule**

---

## Regra: `main`

### Status Checks (Obrigatórios)

| Check               | Nome no GitHub               | Descrição                                 |
| ------------------- | ---------------------------- | ----------------------------------------- |
| 🧹 Lint & Format    | `🧹 Lint & Format`           | ESLint + Prettier                         |
| 🔷 Type Check       | `🔷 Type Check`              | TypeScript type checking (host + webview) |
| 🧪 Tests & Coverage | `🧪 Tests & Coverage (≥80%)` | Unit tests com cobertura mínima           |
| 🔒 Security Audit   | `🔒 Security Audit`          | npm audit + secrets scan                  |
| 📦 Build & Package  | `📦 Build & Package`         | Build + bundle budget + VSIX              |

> **Total: 5 status checks obrigatórios.** O 6º (Summary) é informativo.

### Configuração

1. Acesse: `https://github.com/zaozbr/hermes-chat-agent/settings/branches`
2. Clique **"Add branch protection rule"**
3. Branch name pattern: `main`
4. Marque:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: `1`
     - ✅ Dismiss stale reviews
   - ✅ **Require status checks before merging**
     - ✅ Require branches to be up to date
     - Selecione os 5 checks acima
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
5. Clique **"Create"**

### Regras para `develop` (Opcional)

Para o branch `develop`, recomenda-se:

- ❌ Sem proteção de PR (permite commits diretos para integração)
- ✅ Status checks obrigatórios (mesmos 5)
- ✅ Linear history (sem merge commits, apenas squash ou rebase)

### Como verificar os checks existentes

```bash
# Listar todas as branch protection rules via GitHub CLI (se instalado)
gh api repos/:owner/:repo/branches/main/protection

# Verificar status checks disponíveis
gh api repos/:owner/:repo/commits/main/check-runs
```

> ⚠️ **Nota:** As regras de proteção de branch DEVEM ser configuradas manualmente
> no GitHub Settings. Este arquivo serve como documentação do que configurar.
