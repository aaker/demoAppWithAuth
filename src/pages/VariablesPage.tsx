import { useMemo, useState } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';

type Row = { key: string; value: string };

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') return `[Function ${(value as Function).name || 'anonymous'}]`;
  if (typeof value === 'object') {
    try {
      const keys = Object.keys(value as object);
      if (keys.length === 0) return Array.isArray(value) ? '[]' : '{}';
      return JSON.stringify(value, replacer, 2);
    } catch {
      return String(value);
    }
  }
  return JSON.stringify(value);
}

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'function') return `[Function ${(value as Function).name || 'anonymous'}]`;
  if (typeof value === 'object' && value !== null) {
    const ctor = (value as object).constructor?.name;
    if (ctor && ctor !== 'Object' && ctor !== 'Array') return `[${ctor}]`;
  }
  return value;
}

export default function VariablesPage(horizonContext: HorizonContext) {
  const { PageTemplate, DatagridTemplate, PageComponents } = horizonContext.ui.templates as {
    PageTemplate: React.ComponentType<unknown>;
    DatagridTemplate: React.ComponentType<unknown>;
    PageComponents: { StyledTextField: React.ComponentType<unknown> };
  };
  const { Stack, Typography, Paper, Chip, Divider, Icon } = horizonContext.ui;
  const { StyledTextField } = PageComponents;

  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filter = (rows: Row[]) =>
    q
      ? rows.filter(
          (r) => r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q),
        )
      : rows;

  const topLevel: Row[] = Object.entries(horizonContext).map(([key, value]) => ({
    key,
    value: describe(value),
  }));

  const userRows: Row[] = Object.entries(horizonContext.user ?? {}).map(([key, value]) => ({
    key: `user.${key}`,
    value: describe(value),
  }));

  const uiTopLevel: Row[] = Object.keys(horizonContext.ui ?? {}).map((key) => ({
    key: `ui.${key}`,
    value: describe(
      (horizonContext.ui as unknown as Record<string, unknown>)[key],
    ),
  }));

  const uiComponentRows: Row[] = Object.keys(horizonContext.ui ?? {})
    .filter((k) => k !== 'templates' && k !== 'styles' && k !== 'theme')
    .map((key) => ({ key: `ui.${key}`, value: '[Component]' }));

  const uiTemplateRows: Row[] = Object.keys(horizonContext.ui?.templates ?? {}).map((key) => ({
    key: `ui.templates.${key}`,
    value: '[Component]',
  }));

  const apiRows: Row[] = horizonContext.api
    ? Object.keys(horizonContext.api).map((key) => ({
        key: `api.${key}`,
        value: describe(
          (horizonContext.api as unknown as Record<string, unknown>)[key],
        ),
      }))
    : [];

  const authRows: Row[] = horizonContext.auth
    ? Object.keys(horizonContext.auth).map((key) => ({
        key: `auth.${key}`,
        value: describe(
          (horizonContext.auth as unknown as Record<string, unknown>)[key],
        ),
      }))
    : [];

  const eventBusRows: Row[] = horizonContext.eventBus
    ? Object.keys(horizonContext.eventBus).map((key) => ({
        key: `eventBus.${key}`,
        value: describe(
          (horizonContext.eventBus as unknown as Record<string, unknown>)[key],
        ),
      }))
    : [];

  const columns = [
    { field: 'key', headerName: 'Variable', flex: 1, minWidth: 220 },
    {
      field: 'value',
      headerName: 'Value',
      flex: 2,
      minWidth: 300,
      renderCell: ({ row }: { row: Row }) => (
        <Typography
          variant="body2"
          component="pre"
          sx={{
            m: 0,
            fontFamily: 'monospace',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {row.value}
        </Typography>
      ),
    },
  ];

  const Section = ({
    title,
    rows,
    idPrefix,
  }: {
    title: string;
    rows: Row[];
    idPrefix: string;
  }) => {
    const filtered = filter(rows);
    if (q && filtered.length === 0) return null;
    return (
      <Stack direction="column" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">{title}</Typography>
          <Chip size="small" label={`${filtered.length}${q ? ` / ${rows.length}` : ''}`} />
        </Stack>
        <Paper variant="outlined" sx={{ p: 0 }}>
          <DatagridTemplate
            data={filtered}
            columns={columns}
            getRowId={(row: Row) => `${idPrefix}-${row.key}`}
            getRowHeight={() => 'auto'}
            defaultPageSize={50}
            height="auto"
            toolbar={{ enableSearch: false, toolbarPosition: 'none' }}
          />
        </Paper>
      </Stack>
    );
  };

  const totalMatches = useMemo(() => {
    if (!q) return 0;
    return (
      filter(topLevel).length +
      filter(userRows).length +
      filter(authRows).length +
      filter(apiRows).length +
      filter(eventBusRows).length +
      filter(uiTopLevel).length +
      filter(uiComponentRows).length +
      filter(uiTemplateRows).length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <PageTemplate
      title="Variables"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Debug', url: '/apps/demo-app-with-auth' },
        { label: 'Variables' },
      ]}
    >
      <Stack direction="column" spacing={4}>
        <Typography variant="body2" color="text.secondary">
          Inspector for everything the Horizon host hands to this remote app via{' '}
          <code>horizonContext</code>. Useful for figuring out what's actually available at runtime.
        </Typography>

        <Stack direction="row" alignItems="center" spacing={2}>
          <StyledTextField
            value={query}
            onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            placeholder="Search variables (key or value)…"
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <Stack direction="row" sx={{ pr: 1, color: 'text.secondary' }}>
                  <Icon icon="mdi:magnify" />
                </Stack>
              ),
            }}
          />
          {q && (
            <Chip
              size="small"
              label={`${totalMatches} match${totalMatches === 1 ? '' : 'es'}`}
              onDelete={() => setQuery('')}
            />
          )}
        </Stack>

        <Section title="horizonContext (top level)" rows={topLevel} idPrefix="top" />
        <Section title="user" rows={userRows} idPrefix="user" />
        <Section title="auth" rows={authRows} idPrefix="auth" />
        <Section title="api" rows={apiRows} idPrefix="api" />
        <Section title="eventBus" rows={eventBusRows} idPrefix="bus" />

        <Divider />

        <Section title="ui (top level)" rows={uiTopLevel} idPrefix="ui-top" />
        <Section title="ui — components" rows={uiComponentRows} idPrefix="ui-comp" />
        <Section title="ui.templates" rows={uiTemplateRows} idPrefix="ui-tpl" />
      </Stack>
    </PageTemplate>
  );
}
