// ── Per-Client Report Configuration ──────────────────────────────────────────
// Configure the identifiers for each client in their respective monitoring systems.
// glpiGroupIds: run `GET /api/glpi` and check the `groupId` on tickets for this client.
// jiraProjectKeys: the Jira project key (e.g. 'HV', 'IDB').
// zabbixHostKeywords: substrings matched against the Zabbix `host` field (case-insensitive).
// datadogTags: exact Datadog tag strings to match (check `GET /api/datadog` for what each
//   monitor is actually tagged with — there's no "client:*" convention, tags vary per monitor).
// datadogNameKeywords: substrings matched against the Datadog monitor `name` (case-insensitive),
//   for monitors identified by a bracket prefix (e.g. "[CONNECT]") instead of a tag.
// contacts: email addresses to receive this client's individual report.

export interface ClientConfig {
  slug: string
  name: string
  glpiGroupIds: number[]
  glpiTitleKeywords: string[]
  jiraProjectKeys: string[]
  // Bracket tag(s) this client uses inside Jira issue summaries, e.g. "[Banco XCMG]".
  // Required when jiraProjectKeys is empty (client has no dedicated project) — the
  // matching issue is picked out of the whole backlog by tag instead of project.
  // Also used to EXCLUDE another client's tagged issues that live inside a project
  // this client owns (several clients share MSPPRO/MSPINFRA in practice).
  jiraTitleKeywords: string[]
  // Catch-all keyword(s) too generic to be exclusive on their own (e.g. bare "connect",
  // which can also appear inside an unrelated issue like "Direct Connect/Megaport" from
  // another client). Only claims an issue when no OTHER client's jiraTitleKeywords also
  // matches — a specific tag always outranks a broad one. Leave empty when not needed.
  jiraBroadKeywords: string[]
  zabbixHostKeywords: string[]
  // Datadog is only registered for clients whose monitors are actually tagged. Leave both
  // arrays empty for a client with no Datadog coverage — the report omits the section
  // entirely instead of showing "não configurado" noise.
  datadogTags: string[]
  datadogNameKeywords: string[]
  contacts: string[]
  accentColor: string
}

export const CLIENTS: Record<string, ClientConfig> = {
  xcmg: {
    slug: 'xcmg',
    name: 'Banco XCMG',
    glpiGroupIds: [],                   // configurar após mapear groupId nos tickets GLPI
    glpiTitleKeywords: ['xcmg'],
    jiraProjectKeys: [],                // XCMG não tem projeto Jira próprio — issues ficam
                                         // marcadas com tag [Banco XCMG]/[XCMG]/[XCMG-MIG]
                                         // dentro de MSPPRO e MSPINFRA (projetos de outros clientes)
    jiraTitleKeywords: ['xcmg'],
    jiraBroadKeywords: [],
    zabbixHostKeywords: ['xcmg'],       // cobre: veeam-xcmg, DR-XCMG e demais hosts xcmg-*
    datadogTags: [],                    // Datadog não cadastrado para este cliente
    datadogNameKeywords: [],
    contacts: [],
    accentColor: '#F59E0B',
  },
  connectpsp: {
    slug: 'connectpsp',
    name: 'ConnectPSP',
    glpiGroupIds: [],                  // fill in after checking groupId in GLPI tickets
    // GLPI tickets are often tagged just "[Connect]", not "[ConnectPSP]" — audited all
    // 30 GLPI tickets containing "connect" and every one is genuinely this client's work.
    glpiTitleKeywords: ['connectpsp', 'connect psp', 'connect'],
    jiraProjectKeys: ['HV'],           // adjust to actual Jira project key for ConnectPSP
    jiraTitleKeywords: ['connectpsp', 'connect psp'],
    // Same "[Connect]" bare-tag reality as GLPI — audited all 49 bare "connect" issues;
    // only one (an XCMG WAN issue mentioning "Direct Connect/Megaport") isn't this client's,
    // and it correctly loses to XCMG's specific "xcmg" tag via jiraBroadKeywords precedence.
    jiraBroadKeywords: ['connect'],
    zabbixHostKeywords: ['connectpsp', 'cpsp'],
    // Real tags found on the Datadog account (audited via /api/datadog — no "client:*"
    // tags exist; ConnectPSP monitors use these instead) plus the "[CONNECT]" name prefix
    // used by monitors that don't carry one of those specific tags.
    datadogTags: ['produto:connectpsp', 'cache:connectpsp', 'database:connectpspprd'],
    datadogNameKeywords: ['[connect]'],
    contacts: [],
    accentColor: '#3B82F6',
  },
  csce: {
    slug: 'csce',
    name: 'CSCE',
    glpiGroupIds: [],
    glpiTitleKeywords: ['csce'],
    jiraProjectKeys: ['IDB'],          // adjust to actual Jira project key for CSCE
    jiraTitleKeywords: ['csce'],
    jiraBroadKeywords: [],
    zabbixHostKeywords: ['csce'],
    datadogTags: [],                    // Datadog não cadastrado para este cliente
    datadogNameKeywords: [],
    contacts: [],
    accentColor: '#10B981',
  },
  hospitalabc: {
    slug: 'hospitalabc',
    name: 'Hospital ABC',
    glpiGroupIds: [],
    glpiTitleKeywords: ['hospital abc', 'hospitalabc', 'habc'],
    jiraProjectKeys: ['MSPINFRA'],     // adjust to actual Jira project key — MSPINFRA is
                                       // shared with XCMG, so XCMG-tagged issues must be excluded
    jiraTitleKeywords: ['hospital abc', 'hospitalabc', 'habc'],
    jiraBroadKeywords: [],
    zabbixHostKeywords: ['hospital', 'habc', 'abc-v', 'mv-abc'],
    datadogTags: [],                    // Datadog não cadastrado para este cliente
    datadogNameKeywords: [],
    contacts: [],
    accentColor: '#8B5CF6',
  },
  ticketsports: {
    slug: 'ticketsports',
    name: 'Ticket Sports',
    glpiGroupIds: [],
    glpiTitleKeywords: ['ticket sports', 'ticketsports'],
    jiraProjectKeys: ['MSPPRO'],       // adjust to actual Jira project key — MSPPRO is
                                       // shared with XCMG, so XCMG-tagged issues must be excluded
    jiraTitleKeywords: ['ticket sports', 'ticketsports'],
    jiraBroadKeywords: [],
    zabbixHostKeywords: ['ticketsports', 'ticket-sports'],
    datadogTags: [],                    // Datadog não cadastrado para este cliente
    datadogNameKeywords: [],
    contacts: [],
    accentColor: '#F59E0B',
  },
  lotus: {
    slug: 'lotus',
    name: 'Lotus',
    glpiGroupIds: [],
    glpiTitleKeywords: ['lotus'],
    jiraProjectKeys: ['NMA'],          // adjust to actual Jira project key
    jiraTitleKeywords: ['lotus'],
    jiraBroadKeywords: [],
    zabbixHostKeywords: ['lotus'],
    datadogTags: [],                    // Datadog não cadastrado para este cliente
    datadogNameKeywords: [],
    contacts: [],
    accentColor: '#EC4899',
  },
}

export function getClient(slug: string): ClientConfig | null {
  return CLIENTS[slug] ?? null
}

export function matchesClient(value: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false
  const v = value.toLowerCase()
  return keywords.some(k => v.includes(k.toLowerCase()))
}
