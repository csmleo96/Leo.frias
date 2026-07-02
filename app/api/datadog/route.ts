import { NextRequest, NextResponse } from 'next/server'

// ── Datadog API Proxy ─────────────────────────────────────────────────────────
// Vars: DD_API_KEY, DD_APP_KEY, DD_SITE (default: datadoghq.com)

const DD_BASE = () => `https://api.${process.env.DD_SITE ?? 'datadoghq.com'}`

function ddHeaders() {
  return {
    'DD-API-KEY':         process.env.DD_API_KEY ?? '',
    'DD-APPLICATION-KEY': process.env.DD_APP_KEY ?? '',
    'Content-Type':       'application/json',
  }
}

async function ddFetch(path: string) {
  const res = await fetch(`${DD_BASE()}${path}`, { headers: ddHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Datadog ${path}: HTTP ${res.status}`)
  return res.json()
}

export async function GET(_req: NextRequest) {
  const apiKey = process.env.DD_API_KEY
  const appKey = process.env.DD_APP_KEY

  if (!apiKey || !appKey) {
    return NextResponse.json({
      configured: false,
      message:    'DD_API_KEY e DD_APP_KEY não configuradas em .env.local',
    }, { status: 200 })
  }

  try {
    const [monitorsRaw, hostsRaw, eventsRaw] = await Promise.all([
      ddFetch('/api/v1/monitor?with_downtimes=false&page=0&page_size=100'),
      ddFetch('/api/v1/hosts?count=1000&start=0&include_muted_hosts_data=true'),
      ddFetch(`/api/v1/events?start=${Math.floor(Date.now() / 1000) - 86400}&end=${Math.floor(Date.now() / 1000)}&priority=all&page=0&count=50`),
    ])

    // ── Normalize monitors ──────────────────────────────────────────────────
    const monitors = (monitorsRaw as any[]).map((m: any) => ({
      id:       m.id,
      name:     m.name,
      type:     m.type,
      status:   m.overall_state,
      tags:     m.tags ?? [],
      message:  m.message ?? '',
      creator:  m.creator?.email ?? '—',
      created:  m.created,
      modified: m.modified,
    }))

    // ── Normalize hosts ─────────────────────────────────────────────────────
    const hosts = ((hostsRaw as any).host_list ?? []).map((h: any) => ({
      id:      h.id,
      name:    h.name,
      aliases: h.aliases ?? [],
      apps:    h.apps ?? [],
      status:  h.up ? 'UP' : 'DOWN',
      muted:   h.is_muted,
      tags:    h.tags_by_source ?? {},
      lastReported: h.last_reported_time,
    }))

    // ── Normalize events ────────────────────────────────────────────────────
    const events = ((eventsRaw as any).events ?? []).slice(0, 30).map((e: any) => ({
      id:       e.id,
      title:    e.title,
      text:     e.text,
      priority: e.priority,
      alertType: e.alert_type,
      tags:     e.tags ?? [],
      time:     e.date_happened,
    }))

    // ── Monitor summary ─────────────────────────────────────────────────────
    const summary = {
      total:    monitors.length,
      ok:       monitors.filter(m => m.status === 'OK').length,
      warn:     monitors.filter(m => m.status === 'Warn').length,
      alert:    monitors.filter(m => m.status === 'Alert').length,
      noData:   monitors.filter(m => m.status === 'No Data').length,
      muted:    monitors.filter(m => m.status === 'Muted').length,
    }

    return NextResponse.json({
      configured: true,
      summary,
      monitors,
      hosts: {
        total: (hostsRaw as any).total_matching ?? hosts.length,
        up:    hosts.filter((h: any) => h.status === 'UP').length,
        down:  hosts.filter((h: any) => h.status === 'DOWN').length,
        list:  hosts.slice(0, 50),
      },
      events,
      site: process.env.DD_SITE ?? 'datadoghq.com',
    })
  } catch (err) {
    return NextResponse.json({
      configured: true,
      error:      String(err),
    }, { status: 502 })
  }
}
