# Leonardo CS Cockpit

**Plataforma executiva de Customer Success e Serviços Gerenciados desenvolvida pela XTENTGROUP.**

O Leonardo CS Cockpit é um painel de inteligência operacional que consolida dados de monitoramento de infraestrutura, projetos, suporte, CRM e observabilidade em uma única interface executiva — gerando relatórios automáticos, alertas proativos e análises estratégicas da carteira de clientes.

---

## Funcionalidades

- **Dashboard Executivo** — visão consolidada de saúde operacional em tempo real
- **Relatórios Automáticos** — portfolio consolidado + individuais por cliente às 09:00 BRT via Vercel Cron
- **Health Score** — pontuação 0–100 com 7 componentes ponderados (SLA, Disponibilidade, Backup, DR, Storage, Chamados, Segurança)
- **Farol Executivo** — classificação verde/amarelo/vermelho por cliente
- **Integrações** — Zabbix, Datadog, GLPI, Jira, HubSpot, Microsoft 365, WhatsApp Business
- **Vault** — gerenciamento seguro de credenciais e auditoria de acesso
- **IA Operacional** — análise contextual baseada em regras de negócio CSM
- **Oportunidades Comerciais** — detecção automática de expansão por cliente
- **N8N** — automação de workflows e notificações

---

## Arquitetura

```
leonardo-cs-cockpit/
├── app/
│   ├── api/                    # API Routes (Next.js App Router)
│   │   ├── reports/            # Relatórios executivos
│   │   │   ├── executive-daily/        # Relatório diário base
│   │   │   ├── executive-full/         # Relatório completo consolidado
│   │   │   ├── executive-portfolio/    # Portfólio dos 5 clientes
│   │   │   └── client/[slug]/          # Relatório individual por cliente
│   │   ├── zabbix/             # Monitoramento de infraestrutura
│   │   ├── datadog/            # Observabilidade APM
│   │   ├── glpi/               # Help desk / chamados
│   │   ├── jira/               # Gestão de projetos
│   │   ├── hubspot/            # CRM
│   │   ├── microsoft/          # Email + Teams
│   │   ├── whatsapp/           # WhatsApp Business API
│   │   ├── vault/              # Gestão de segredos
│   │   ├── ia/                 # Análise de IA
│   │   └── automation/         # Relatórios agendados
│   └── (pages)/                # Interface web
├── components/ui/              # Design system (shadcn/ui)
├── lib/
│   ├── reports/clients.ts      # Configuração por cliente
│   ├── vault/                  # Módulo de segurança
│   ├── hubspot/                # HubSpot client
│   └── supabase/               # Database client
├── scripts/                    # Utilitários (backup vault)
├── types/                      # TypeScript types
├── .github/workflows/ci.yml    # CI/CD pipeline
└── vercel.json                 # Cron jobs de relatórios
```

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| Banco de Dados | Supabase (PostgreSQL) |
| UI | Tailwind CSS 4 + shadcn/ui |
| Gráficos | Recharts |
| Email | Nodemailer (SMTP Office 365) / Resend |
| Monitoramento | Zabbix + Datadog |
| Help Desk | GLPI |
| Projetos | Jira (Atlassian) |
| CRM | HubSpot |
| Comunicação | Microsoft Teams + WhatsApp Business |
| Automação | N8N |
| Deploy | Vercel |
| CI/CD | GitHub Actions |

---

## Instalação

### Pré-requisitos

- Node.js 20+
- npm 10+
- Conta Supabase
- Acesso às integrações configuradas

### Setup

```bash
# 1. Clonar o repositório
git clone https://github.com/xtentgroup/leonardo-cs-cockpit.git
cd leonardo-cs-cockpit

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com as credenciais reais

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em `http://localhost:3000`

---

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e configure:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL base da aplicação |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública Supabase |
| `ZABBIX_API_URL` | Endpoint JSON-RPC do Zabbix |
| `GLPI_URL` | URL da API REST do GLPI |
| `JIRA_BASE_URL` | URL do Jira (Atlassian Cloud) |
| `HUBSPOT_API_KEY` | Token de acesso HubSpot |
| `DD_API_KEY` | API Key do Datadog |
| `DD_APP_KEY` | Application Key do Datadog |
| `MICROSOFT_CLIENT_ID` | Client ID do Azure App |
| `SMTP_USER` | Usuário SMTP Office 365 |
| `SMTP_PASS` | Senha SMTP Office 365 |
| `NOTIFICATION_EMAIL_TO` | Email destino dos relatórios |

Ver `.env.example` para a lista completa.

---

## Configuração de Clientes

Edite `lib/reports/clients.ts` para mapear cada cliente aos seus sistemas:

```typescript
connectpsp: {
  glpiGroupIds: [42],              // IDs de grupo GLPI do cliente
  glpiTitleKeywords: ['connectpsp'],
  jiraProjectKeys: ['HV'],         // Chave do projeto Jira
  zabbixHostKeywords: ['connectpsp'], // Keywords nos hostnames Zabbix
  datadogTags: ['client:connectpsp'],
  contacts: ['gestor@connectpsp.com.br'],
}
```

---

## Relatórios Automáticos (Cron)

| Horário (BRT) | Relatório | Endpoint |
|---|---|---|
| 08:45 | Portfólio consolidado (5 clientes) | `/api/reports/executive-portfolio/send` |
| 09:00 | Relatório full executivo | `/api/reports/executive-full/send` |
| 09:00 | ConnectPSP individual | `/api/reports/client/connectpsp/send` |
| 09:00 | CSCE individual | `/api/reports/client/csce/send` |
| 09:00 | Hospital ABC individual | `/api/reports/client/hospitalabc/send` |
| 09:00 | Ticket Sports individual | `/api/reports/client/ticketsports/send` |
| 09:00 | Lotus individual | `/api/reports/client/lotus/send` |

### Envio sob demanda

```bash
# Portfólio completo
curl http://localhost:3000/api/reports/executive-portfolio/send

# Preview no browser (sem enviar email)
curl http://localhost:3000/api/reports/executive-portfolio/send?preview=true

# Cliente individual
curl http://localhost:3000/api/reports/client/connectpsp/send
```

---

## Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel --prod
```

Configure as variáveis de ambiente no painel Vercel: **Settings → Environment Variables**.

Os Cron Jobs são configurados automaticamente via `vercel.json`.

### CI/CD via GitHub Actions

Configure os seguintes secrets no repositório GitHub:

| Secret | Descrição |
|---|---|
| `VERCEL_TOKEN` | Token de acesso Vercel |
| `VERCEL_ORG_ID` | ID da organização Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel |

---

## Roadmap

### Próximos 30 dias
- [ ] Integração Veeam Backup API
- [ ] Monitoramento Kubernetes/RKE
- [ ] Datadog Application Key válida (APM completo)

### Próximos 60 dias
- [ ] Integração SQL Server / YugabyteDB direto
- [ ] Dashboard de capacidade de storage
- [ ] QBR automatizado por cliente

### Próximos 90 dias
- [ ] NOC 24x7 com resposta automática
- [ ] Automação de triagem de chamados com IA
- [ ] Observabilidade full-stack (APM + logs + traces)

---

## Segurança

- Credenciais armazenadas exclusivamente em variáveis de ambiente
- `.env.local` listado no `.gitignore` — nunca commitado
- Vault interno com criptografia de segredos sensíveis
- Auditoria de acesso a dados confidenciais
- TruffleHog no CI/CD para scan automático de secrets

---

## Licença

Proprietário — XTENTGROUP. Todos os direitos reservados.

---

*Desenvolvido com ❤️ pela equipe XTENTGROUP — Serviços Gerenciados de TI*
