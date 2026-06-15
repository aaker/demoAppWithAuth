import { useEffect, useMemo, useRef, useState } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';
import CodeBlock from '../components/CodeBlock';

type AnyComp = React.ComponentType<any>;

type EventRecord = {
  id: string;
  time: string;
  channel: string;
  summary: string;
  raw: unknown;
};

const CALL_EVENT_CHANNELS = ['call-event'];

const SUBSCRIBER_EVENT_CHANNELS = [
  // Subscriber streams bridged from the host's Socket.IO connection. Presence
  // changes arrive on `subscriber:user` (look at `user-presence-status`).
  'subscriber-event',
  'subscriber:user',
  'subscriber:device',
  'subscriber:registration',
  'subscriber:call',
  // App-level notification channels.
  'notification:received',
  'notification:read',
  'notification:all-read',
  'notification:cleared',
  'platform:notification',
];

function summarize(channel: string, data: unknown): string {
  if (data == null) return '(no payload)';
  if (typeof data !== 'object') return String(data);
  const obj = data as Record<string, unknown>;

  if (channel === 'call-event') {
    const event = (obj.event ?? obj) as Record<string, unknown>;
    const type = event?.type;
    const callId = event?.callId;
    const from = event?.from ?? event?.caller ?? event?.remoteIdentity;
    const to = event?.to ?? event?.callee;
    const parts = [type && `type=${type}`, callId && `callId=${callId}`, from && `from=${from}`, to && `to=${to}`].filter(Boolean);
    return parts.length ? parts.join(' · ') : JSON.stringify(event).slice(0, 120);
  }

  if (channel.startsWith('notification:')) {
    const title = obj.title ?? (obj.notification as any)?.title;
    const message = obj.message ?? (obj.notification as any)?.message;
    if (title || message) return [title, message].filter(Boolean).join(' — ');
  }

  if (channel === 'subscriber:user' || (channel === 'subscriber-event' && (obj as any).type === 'user')) {
    const inner = (obj as any).data ?? obj;
    const u = inner?.user ?? inner?.['user'];
    const dom = inner?.domain;
    const presence = inner?.['user-presence-status'];
    const parts = [
      u && `user=${u}`,
      dom && `domain=${dom}`,
      presence && `presence=${presence}`,
    ].filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }

  if (channel.startsWith('subscriber:') || channel === 'subscriber-event') {
    const inner = (obj as any).data ?? obj;
    const id = inner?.id ?? inner?.user ?? inner?.aor ?? inner?.device;
    const type = (obj as any).type;
    return [type && `type=${type}`, id && `id=${id}`].filter(Boolean).join(' · ') ||
      JSON.stringify(inner).slice(0, 120);
  }

  try {
    return JSON.stringify(obj).slice(0, 140);
  } catch {
    return String(obj);
  }
}

export default function EventsPage(horizonContext: HorizonContext) {
  const { PageTemplate, DatagridTemplate } = horizonContext.ui.templates as Record<string, AnyComp>;
  const ui = horizonContext.ui as Record<string, any>;
  const Stack: AnyComp = ui.Stack;
  const Paper: AnyComp = ui.Paper;
  const Typography: AnyComp = ui.Typography;
  const Chip: AnyComp = ui.Chip;
  const Button: AnyComp = ui.Button;
  const Alert: AnyComp = ui.Alert;
  const Icon: AnyComp = ui.Icon;

  const [events, setEvents] = useState<EventRecord[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const bus = horizonContext.eventBus;
    if (!bus) return;

    const allChannels = [...CALL_EVENT_CHANNELS, ...SUBSCRIBER_EVENT_CHANNELS];
    const handlers: Array<{ channel: string; handler: (data: unknown) => void }> = [];

    for (const channel of allChannels) {
      const handler = (data: unknown) => {
        counter.current += 1;
        const record: EventRecord = {
          id: `evt-${counter.current}`,
          time: new Date().toLocaleTimeString(),
          channel,
          summary: summarize(channel, data),
          raw: data,
        };
        setEvents((prev) => [record, ...prev].slice(0, 200));
      };
      bus.on(channel, handler);
      handlers.push({ channel, handler });
    }

    return () => {
      for (const { channel, handler } of handlers) bus.off(channel, handler);
    };
  }, [horizonContext.eventBus]);

  const callCount = useMemo(
    () => events.filter((e) => CALL_EVENT_CHANNELS.includes(e.channel)).length,
    [events],
  );
  const subCount = useMemo(
    () => events.filter((e) => SUBSCRIBER_EVENT_CHANNELS.includes(e.channel)).length,
    [events],
  );

  const columns = [
    { field: 'time', headerName: 'Time', flex: 0.6, minWidth: 120 },
    {
      field: 'channel',
      headerName: 'Channel',
      flex: 0.8,
      minWidth: 180,
      renderCell: ({ row }: { row: EventRecord }) => (
        <Chip
          size="small"
          color={CALL_EVENT_CHANNELS.includes(row.channel) ? 'primary' : 'default'}
          label={row.channel}
        />
      ),
    },
    { field: 'summary', headerName: 'Summary', flex: 1.5, minWidth: 260 },
    {
      field: 'raw',
      headerName: 'Raw payload',
      flex: 2,
      minWidth: 300,
      renderCell: ({ row }: { row: EventRecord }) => (
        <Typography
          variant="body2"
          component="pre"
          sx={{
            m: 0,
            fontFamily: 'monospace',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {(() => {
            try {
              return JSON.stringify(row.raw, null, 2);
            } catch {
              return String(row.raw);
            }
          })()}
        </Typography>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Events"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Demo App', url: '/apps/demo-app-with-auth' },
        { label: 'Events' },
      ]}
    >
      <Stack direction="column" spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Live subscription to <code>horizonContext.eventBus</code>. This page listens for call
          lifecycle events (<code>call-event</code>) and subscriber/notification events
          (<code>notification:*</code>, <code>platform:notification</code>) and renders each one
          as it arrives.
        </Typography>

        {Alert && (
          <Alert
            type="info"
            title="How to generate events"
            message={
              "Call events: place or receive a test call in the host softphone (call-started → call-answered → call-ended). " +
              "Subscriber events: change presence/status, register/unregister a device, or update a user record — those flow in on subscriber:user, subscriber:device, subscriber:registration, subscriber:call. " +
              "Notification events fire whenever any host or remote app emits one."
            }
          />
        )}

        <CodeBlock
          ui={ui}
          code={`const bus = horizonContext.eventBus;\nconst handler = (data) => console.log('call-event', data);\nbus.on('call-event', handler);\n// remember to clean up on unmount:\n// bus.off('call-event', handler);`}
        />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            color="primary"
            label={`call-event: ${callCount}`}
          />
          <Chip size="small" label={`subscriber events: ${subCount}`} />
          <Chip size="small" variant="outlined" label={`total: ${events.length}`} />
          <Button
            size="small"
            variant="outlined"
            disabled={events.length === 0}
            onClick={() => setEvents([])}
          >
            Clear
          </Button>
        </Stack>


          <DatagridTemplate
            data={events}
            columns={columns}
            getRowId={(row: EventRecord) => row.id}
            getRowHeight={() => 'auto'}
            defaultPageSize={25}
            height="auto"
            toolbar={{ enableSearch: true, toolbarPosition: 'top' }}
          />

        <CodeBlock
          ui={ui}
          code={`<DatagridTemplate\n  data={events}\n  columns={columns}\n  getRowId={(row) => row.id}\n  getRowHeight={() => 'auto'}\n  defaultPageSize={25}\n  height="auto"\n  toolbar={{ enableSearch: true, toolbarPosition: 'top' }}\n/>`}
        />


        {events.length === 0 && (
          
            <Stack direction="column" spacing={1} alignItems="center">
              {Icon && <Icon icon="mdi:radar" />}
              <Typography variant="body2" color="text.secondary">
                Waiting for events… place a test call to see <code>call-event</code> data, or
                trigger any in-app notification.
              </Typography>
            </Stack>
          
        )}
      </Stack>
    </PageTemplate>
  );
}
