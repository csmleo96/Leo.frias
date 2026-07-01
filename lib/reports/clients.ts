// ── Per-Client Report Configuration ──────────────────────────────────────────
// Configure the identifiers for each client in their respective monitoring systems.
// glpiGroupIds: run `GET /api/glpi` and check the `groupId` on tickets for this client.
// jiraProjectKeys: the Jira project key (e.g. 'HV', 'IDB').
// zabbixHostKeywords: substrings matched against the Zabbix `host` field (case-insensitive).
// datadogTags: Datadog tag strings matched against monitor tags (e.g. 'client:connectpsp').
// contacts: email addresses to receive this client's individual report.

export interface ClientConfig {
  slug: string
  name: string
  glpiGroupIds: number[]
  glpiTitleKeywords: string[]
  jiraProjectKeys: string[]
  zabbixHostKeywords: string[]
  datadogTags: string[]
  contacts: string[]
  accentColor: string
}

export const CLIENTS: Record<string, ClientConfig> = {
  connectpsp: {
    slug: 'connectpsp',
    name: 'ConnectPSP',
    glpiGroupIds: [],                  // fill in after checking groupId in GLPI tickets
    glpiTitleKeywords: ['connectpsp', 'connect psp'],
    jiraProjectKeys: ['HV'],           // adjust to actual Jira project key for ConnectPSP
    zabbixHostKeywords: ['connectpsp'],
    datadogTags: ['client:connectpsp'],
    contacts: [],
    accentColor: '#3B82F6',
  },
  csce: {
    slug: 'csce',
    name: 'CSCE',
    glpiGroupIds: [],
    glpiTitleKeywords: ['csce'],
    jiraProjectKeys: ['IDB'],          // adjust to actual Jira project key for CSCE
    zabbixHostKeywords: ['csce'],
    datadogTags: ['client:csce'],
    contacts: [],
    accentColor: '#10B981',
  },
  hospitalabc: {
    slug: 'hospitalabc',
    name: 'Hospital ABC',
    glpiGroupIds: [],
    glpiTitleKeywords: ['hospital abc', 'hospitalabc', 'habc'],
    jiraProjectKeys: ['MSPINFRA'],     // adjust to actual Jira project key
    zabbixHostKeywords: ['hospital', 'habc'],
    datadogTags: ['client:hospitalabc'],
    contacts: [],
    accentColor: '#8B5CF6',
  },
  ticketsports: {
    slug: 'ticketsports',
    name: 'Ticket Sports',
    glpiGroupIds: [],
    glpiTitleKeywords: ['ticket sports', 'ticketsports'],
    jiraProjectKeys: ['MSPPRO'],       // adjust to actual Jira project key
    zabbixHostKeywords: ['ticketsports', 'ticket-sports'],
    datadogTags: ['client:ticketsports'],
    contacts: [],
    accentColor: '#F59E0B',
  },
  lotus: {
    slug: 'lotus',
    name: 'Lotus',
    glpiGroupIds: [],
    glpiTitleKeywords: ['lotus'],
    jiraProjectKeys: ['NMA'],          // adjust to actual Jira project key
    zabbixHostKeywords: ['lotus'],
    datadogTags: ['client:lotus'],
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
