import * as XLSX from 'xlsx'

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()

  // Auto column widths
  const colWidths = Object.keys(data[0] ?? {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] ?? '').length)) + 2
  }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportTarefas(tasks: { title: string; description: string | null; status: string; priority: string; created_at: string }[]) {
  exportToExcel(
    tasks.map(t => ({
      'Título': t.title,
      'Descrição': t.description ?? '',
      'Status': t.status,
      'Prioridade': t.priority,
      'Criado em': new Date(t.created_at).toLocaleDateString('pt-BR'),
    })),
    `tarefas-${new Date().toISOString().split('T')[0]}`,
    'Tarefas'
  )
}

export function exportFinanceiro(transactions: { description: string; amount: number; type: string; category: string; date: string }[]) {
  exportToExcel(
    transactions.map(t => ({
      'Descrição': t.description,
      'Valor (R$)': Number(t.amount).toFixed(2),
      'Tipo': t.type === 'receita' ? 'Receita' : 'Despesa',
      'Categoria': t.category,
      'Data': new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR'),
    })),
    `financeiro-${new Date().toISOString().split('T')[0]}`,
    'Financeiro'
  )
}

export function exportClientes(clients: { name: string; email: string; phone: string | null; company: string | null; status: string; created_at: string }[]) {
  exportToExcel(
    clients.map(c => ({
      'Nome': c.name,
      'Email': c.email,
      'Telefone': c.phone ?? '',
      'Empresa': c.company ?? '',
      'Status': c.status === 'ativo' ? 'Ativo' : 'Inativo',
      'Cadastrado em': new Date(c.created_at).toLocaleDateString('pt-BR'),
    })),
    `clientes-${new Date().toISOString().split('T')[0]}`,
    'Clientes'
  )
}

export function exportJira(issues: { key: string; summary: string; project: { key: string; name: string }; type: string; status: string; priority: string; assignee: string | null; updated: string; url: string }[]) {
  exportToExcel(
    issues.map(i => ({
      'Chave': i.key,
      'Resumo': i.summary,
      'Projeto': i.project.name,
      'Tipo': i.type,
      'Status': i.status,
      'Prioridade': i.priority,
      'Responsável': i.assignee ?? '—',
      'Atualizado': new Date(i.updated).toLocaleDateString('pt-BR'),
      'Link': i.url,
    })),
    `jira-${new Date().toISOString().split('T')[0]}`,
    'Jira Issues'
  )
}
