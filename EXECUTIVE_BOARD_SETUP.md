# Executive Board Reporting System

## Overview

Sistema automático de relatórios executivos diários que coleta dados de **Jira**, **GLPI** e **Supabase**, calcula KPIs operacionais e envia resumos para email e Microsoft Teams.

**Execução**: Todos os dias às **08:00 UTC** (automático em Vercel) ou manualmente via `/api/notifications/daily`

---

## 🚀 Quick Start

### 1. **Apply Supabase Migration**

```bash
node scripts/add-notification-logs.mjs
```

Cria a tabela `notification_logs` para rastrear histórico de envios.

### 2. **Configurar Credenciais SMTP** (`.env.local`)

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=leo.frias@xtentgroup.com
SMTP_PASS=Leo1996@
NOTIFICATION_EMAIL_TO=board@xtentgroup.com
SMTP_SECURE=false
```

#### Opções de SMTP:
- **Office 365**: `smtp.office365.com:587`
- **Gmail**: `smtp.gmail.com:587` + [App Password](https://support.google.com/accounts/answer/185833)
- **SendGrid**: `smtp.sendgrid.net:587`

### 3. **Configurar Teams Webhook** (opcional)

```bash
# Em Vercel Environment Variables:
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

[Criar Incoming Webhook no Teams](https://learn.microsoft.com/en-us/micrososft-365/dev-center/tutorials/msgraph-teams-configure-app-tutorial)

### 4. **Testar Manualmente**

```bash
curl -X POST http://localhost:3000/api/notifications/daily
```

Resposta esperada:
```json
{
  "ok": true,
  "status": "estável|atenção|crítico",
  "kpis": {...},
  "email": {"ok": true, "to": "board@xtentgroup.com"},
  "teams": {"ok": true},
  "deliveryTime": 1234
}
```

---

## 📊 KPIs Calculados

| KPI | Descrição | Fonte |
|-----|-----------|--------|
| `ticketsAbertos` | Total de tickets em aberto | GLPI + Jira |
| `ticketsResolvidos` | Total resolvidos/fechados | GLPI + Jira |
| `slaCumprido` | % de tickets dentro do SLA | Cálculo automático |
| `backlogCritico` | Tickets críticos não resolvidos | GLPI + Jira |
| `incidentesSeveridadeAlta` | Issues alta prioridade Jira | Jira API |
| `tempoMedioAtendimento` | Tempo médio resposta (horas) | GLPI |

### Status Geral (Automático)

```
🟢 ESTÁVEL    → SLA ≥ 95%, backlog crítico < 10
🟡 ATENÇÃO    → SLA 90-94% ou backlog crítico 10-20
🔴 CRÍTICO    → SLA < 90% ou backlog crítico > 20
```

---

## 📧 Template de Email

O email é enviado com:

1. **Header Premium**
   - Logo corporativo
   - Data/hora do relatório
   - Badge de status (🟢/🟡/🔴)

2. **KPI Cards**
   - 6 indicadores principais
   - Visualização em grade 2×3
   - Valores coloridos por criticidade

3. **Executive Summary**
   - Destaques (pontos positivos)
   - Alertas (pontos críticos)
   - Próximas ações recomendadas

4. **Rodapé**
   - Branding Xtentgroup
   - Timestamp exato
   - Link para dashboard

### Exemplo de Conteúdo

```
Status Geral: 🟡 ATENÇÃO

Principais Indicadores
• Tickets Abertos: 432
• Tickets Resolvidos: 397
• SLA Cumprido: 92%
• Backlog Crítico: 14
• Incidentes Severidade Alta: 2

Destaques
✓ SLA permaneceu acima de 90%
✓ Redução de 12% no backlog

Atenção
⚠ 2 incidentes críticos em investigação

Próximas Ações
• Concluir tratativa dos incidentes
• Revisar capacidade Equipe Infra
```

---

## 🔄 Fluxo Automático (Vercel)

### Arquivo: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/notifications/daily",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Execução Automática:**
- ✅ Às 08:00 UTC diariamente
- ✅ Coletando dados de GLPI, Jira, Supabase
- ✅ Gerando KPIs
- ✅ Enviando Email + Teams
- ✅ Registrando logs em `notification_logs`

---

## 🎛️ Painel Administrativo

**URL**: `/notifications`

### Funcionalidades

1. **Statistics Dashboard**
   - Total de envios
   - Taxa de sucesso/falha/parcial
   - Tempo médio de entrega

2. **Last Execution Card**
   - Data/hora último envio
   - Status (✓ Sucesso / ✗ Falha)
   - KPIs snapshot
   - Canais entregues (Email/Teams)

3. **Enviar Agora**
   - Botão para trigger manual
   - Útil para testes e envios extraordinários

4. **Log History**
   - Tabela com todos os envios
   - Filtros: Todos, Sucesso, Falha
   - Informações por envio:
     - Data/hora execução
     - Status final
     - Tempo de entrega
     - Destinatários
     - KPIs snapshot
     - Erros (se houver)
   - Ação: Reenviar (retry)

5. **Design Dark Mode Premium**
   - Pattern Datadog/Grafana
   - Responsivo (desktop/mobile)
   - Alta densidade de informação

---

## 📡 Endpoints da API

### `POST /api/notifications/daily`

**Descrição**: Executa o fluxo completo de relatório

**Resposta**:
```json
{
  "ok": true,
  "status": "estável|atenção|crítico",
  "kpis": {
    "ticketsAbertos": 432,
    "ticketsResolvidos": 397,
    "slaCumprido": 92,
    "backlogCritico": 14,
    "incidentesSeveridadeAlta": 2,
    "tempoMedioAtendimento": 4,
    "trendBacklog": "down|up|stable",
    "trendSLA": "stable|down|up"
  },
  "email": {"ok": true, "to": "board@xtentgroup.com"},
  "teams": {"ok": true},
  "deliveryTime": 7681
}
```

### `GET /api/notifications/admin`

**Descrição**: Lista logs de notificações com estatísticas

**Query Parameters**:
- `limit` (default: 50) - Número de registros

**Resposta**:
```json
{
  "ok": true,
  "stats": {
    "total": 42,
    "success": 39,
    "failed": 2,
    "partial": 1,
    "avgDeliveryTime": 3456
  },
  "lastExecution": {...},
  "logs": [...]
}
```

### `POST /api/notifications/admin`

**Descrição**: Ações administrativas (reenvio)

**Body**:
```json
{
  "action": "resend",
  "logId": 123
}
```

---

## 📊 Database Schema

### `notification_logs` Table

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGSERIAL | Primary key |
| `executed_at` | TIMESTAMP | Data/hora execução |
| `status` | VARCHAR(20) | success \| failed \| partial |
| `channel` | VARCHAR(50) | email \| teams \| both |
| `delivery_time` | INTEGER | Tempo em ms |
| `recipients` | TEXT[] | Array de destinatários |
| `error_message` | TEXT | Mensagem de erro (se houver) |
| `kpis` | JSONB | Snapshot dos KPIs enviados |
| `metadata` | JSONB | Dados adicionais |
| `created_at` | TIMESTAMP | Timestamp criação |

**Índices**:
- `executed_at DESC` - Buscar últimos envios
- `status` - Filtrar por status
- `channel` - Filtrar por canal

---

## 🔐 Segurança

1. **Credenciais SMTP**
   - Armazenadas em `.env.local` (local) ou Vercel (produção)
   - Nunca commitar senhas no git
   - Use variáveis de ambiente

2. **Teams Webhook**
   - URL privada, nunca expor em logs
   - Validar origem do webhook em produção

3. **Database Access**
   - RLS (Row Level Security) habilitado
   - Allow-all policy para MVP
   - Implementar permissões por usuário em v2

4. **Rate Limiting**
   - Implementar throttling em produção
   - Máximo 1 envio por hora manual

---

## 🧪 Teste End-to-End

```bash
# 1. Iniciar servidor
npm run dev

# 2. Aplicar migration
node scripts/add-notification-logs.mjs

# 3. Testar endpoint
curl -X POST http://localhost:3000/api/notifications/daily

# 4. Verificar admin panel
# Abrir http://localhost:3000/notifications

# 5. Verificar logs no Supabase
# Dashboard > notification_logs

# 6. Testar reenvio
curl -X POST http://localhost:3000/api/notifications/admin \
  -H "Content-Type: application/json" \
  -d '{"action":"resend","logId":1}'
```

---

## 📝 Troubleshooting

### Email não está sendo entregue

**Problema**: `Error: Invalid login`

**Solução**:
1. Verificar senha SMTP_PASS
2. Se usar Office365, garantir TLS habilitado
3. Se usar Gmail, usar [App Password](https://support.google.com/accounts/answer/185833)
4. Testar credenciais com: `telnet smtp.office365.com 587`

### Teams não recebe mensagem

**Problema**: `Teams webhook not configured`

**Solução**:
1. Gerar novo webhook em Teams
2. Atualizar `TEAMS_WEBHOOK_URL`
3. Testar com curl:
```bash
curl -X POST $TEAMS_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"@type":"MessageCard","summary":"Test","sections":[{"activityTitle":"Test"}]}'
```

### Logs não aparecem no admin

**Problema**: `notification_logs` vazia

**Solução**:
1. Verificar se migration foi aplicada
2. Confirmar que Supabase está conectado
3. Testar com: `SELECT * FROM notification_logs;` no Supabase SQL Editor

---

## 🚀 Deploy em Produção (Vercel)

1. **Push para repositório**
   ```bash
   git add -A
   git commit -m "Add Executive Board Reporting System"
   git push
   ```

2. **Deploy no Vercel**
   ```bash
   vercel deploy --prod
   ```

3. **Configurar Environment Variables**
   - Vercel Dashboard > Settings > Environment Variables
   - Adicionar: `SMTP_PASS`, `NOTIFICATION_EMAIL_TO`, `TEAMS_WEBHOOK_URL`

4. **Verificar Cron Job**
   - Vercel Dashboard > Functions > Crons
   - Deve mostrar: `0 8 * * * /api/notifications/daily`

5. **Testar Agendamento**
   - Aguardar próxima execução às 08:00 UTC
   - Ou forçar manualmente via API

---

## 📖 Links Úteis

- [Vercel Cron Jobs](https://vercel.com/docs/crons)
- [Office 365 SMTP](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-or-smtp-connection-using-office-365)
- [Teams Webhooks](https://learn.microsoft.com/en-us/micrososft-365/dev-center/tutorials/msgraph-teams-configure-app-tutorial)
- [Nodemailer SMTP](https://nodemailer.com/smtp/)

---

**Versão**: 1.0  
**Última Atualização**: 2026-06-08  
**Mantido por**: CS Cockpit Team
