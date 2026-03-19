---
description: Iniciar o servidor local e testar o jogo de forma automatizada
---

// turbo-all

# Fluxo de Trabalho: Teste Contínuo do Jogo

Este fluxo automatiza a abertura do servidor e valida o comportamento do jogo sem travar o processo para aprovação de cliques manuais.

### 1. Iniciar o Servidor Estático
Executa o script do PowerShell para servir os arquivos do jogo na porta 8080.
```powershell
powershell -ExecutionPolicy Bypass -File c:\tmp\serve.ps1 -port 8080 -dir .
```

### 2. Validação com o Browser Subagent
O Agente usará o Subagente de Navegador para:
1.  Acessar `http://localhost:8080`
2.  Inspecionar se a tag `<canvas>` (ou elementos cruciais) foi processada.
3.  Verificar se existem erros vermelhos no Console de Log (`console.error`).
4.  Retornar os bugs encontrados de volta para correção.
