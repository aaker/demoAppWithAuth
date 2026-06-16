import { useEffect, useState } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';
import CodeBlock from '../components/CodeBlock';

type Row = { key: string; value: string };
type Status = 'loading' | 'ok' | 'error';
type CallState = { status: Status; error: string | null; rows: Row[] };

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

function responseToRows(res: unknown): Row[] {
  if (Array.isArray(res)) {
    if (res.length === 0) return [{ key: '(empty array)', value: '[]' }];
    return res.flatMap((item, i) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return Object.entries(item as Record<string, unknown>).map(([k, v]) => ({
          key: `[${i}].${k}`,
          value: describe(v),
        }));
      }
      return [{ key: `[${i}]`, value: describe(item) }];
    });
  }
  if (res && typeof res === 'object') {
    return Object.entries(res as Record<string, unknown>).map(([k, v]) => ({
      key: k,
      value: describe(v),
    }));
  }
  return [{ key: 'value', value: describe(res) }];
}

type AnyComp = React.ComponentType<any>;

export default function ApiCallsPage(horizonContext: HorizonContext) {
  const { PageTemplate, DatagridTemplate } = horizonContext.ui.templates as Record<string, AnyComp>;
  const ui = horizonContext.ui as Record<string, any>;
  const Stack: AnyComp = ui.Stack;
  const Typography: AnyComp = ui.Typography;
  const Paper: AnyComp = ui.Paper;
  const Chip: AnyComp = ui.Chip;

  const [me, setMe] = useState<CallState>({ status: 'loading', error: null, rows: [] });
  const [user, setUser] = useState<CallState>({ status: 'loading', error: null, rows: [] });
  const [devices, setDevices] = useState<CallState>({ status: 'loading', error: null, rows: [] });

  const deviceId = horizonContext.user.extension+'w';
  
  useEffect(() => {
    const calls: Array<{
      run: () => Promise<unknown> | undefined;
      setState: (s: CallState) => void;
      requirement: string;
    }> = [
      {
        run: () => horizonContext.api?.get?.('/oauth/me', {}),
        setState: setMe,
        requirement: 'horizonContext.api.get is not available',
      },
      {
        run: () => horizonContext.api?.get?.('/domains/~/users/~'),
        setState: setUser,
        requirement: 'horizonContext.api.get is not available',
      },
      {
        run: () => horizonContext.api?.get?.(`/domains/~/users/~/devices/${deviceId}`),
        setState: setDevices,
        requirement: 'horizonContext.api.get is not available',
      },
    ];

    let cancelled = false;
    for (const call of calls) {
      const promise = call.run();
      if (!promise) {
        call.setState({ status: 'error', error: call.requirement, rows: [] });
        continue;
      }
      call.setState({ status: 'loading', error: null, rows: [] });
      promise
        .then((res) => {
          if (cancelled) return;
          call.setState({ status: 'ok', error: null, rows: responseToRows(res) });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          call.setState({
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
            rows: [],
          });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [horizonContext.api]);

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

  const CallSection = ({
    title,
    state,
    idPrefix,
    code,
  }: {
    title: string;
    state: CallState;
    idPrefix: string;
    code?: string;
  }) => (
    <Stack direction="column" spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6">{title}</Typography>
        {state.status === 'loading' && <Chip size="small" label="loading…" />}
        {state.status === 'ok' && <Chip size="small" color="success" label={state.rows.length} />}
        {state.status === 'error' && <Chip size="small" color="error" label="error" />}
      </Stack>
      {code && <CodeBlock ui={ui} code={code} />}
      {state.status === 'error' && (
        <Paper sx={{ p: 2 }}>
          <Typography
            variant="body2"
            component="pre"
              sx={{ m: 0, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}
            >
            {state.error}
          </Typography>
        </Paper>
      )}
      {state.status === 'ok' && (
        
          <DatagridTemplate
            data={state.rows}
            columns={columns}
            getRowId={(row: Row) => `${idPrefix}-${row.key}`}
            getRowHeight={() => 'auto'}
            defaultPageSize={15}
            height="auto"
            toolbar={{ enableSearch: true , toolbarPosition: 'top' }}
          />
        
      )}
    </Stack>
  );

  
  return (
    <PageTemplate
      title="API Calls"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Demo App with Auth', url: '/apps/demo-app-with-auth' },
        { label: 'API Calls' },
      ]}
    >
      <Stack direction="column" spacing={4}>
        <Typography variant="body2" color="text.secondary">
          Sample calls made through <code>horizonContext.api</code>. Use these to verify
          authentication and the host-provided NetSapiens API client.
        </Typography>

        <CallSection
          title="api.get('/oauth/me')"
          state={me}
          idPrefix="me"
          code={`const res = await horizonContext.api.get('/oauth/me', {});`}
        />
        <CallSection
          title="api.get('/domains/~/users/~')"
          state={user}
          idPrefix="user-api"
          code={`const res = await horizonContext.api.get('/domains/~/users/~');`}
        />
        <CallSection
          title={`api.get('/domains/~/users/~/devices/${deviceId}')`}
          state={devices}
          idPrefix="devices"
          code={`const deviceId = horizonContext.user.extension + 'w';\nconst res = await horizonContext.api.get(\`/domains/~/users/~/devices/\${deviceId}\`);`}
        />
      </Stack>
    </PageTemplate>
  );
}
