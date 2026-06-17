import { useEffect, useMemo, useRef, useState } from "react";
import {
  createRemoteAppSDK,
  type HorizonContext,
  type StreamId,
} from "@netsapiens/horizon-sdk";
import CodeBlock from "../components/CodeBlock";

type AnyComp = React.ComponentType<any>;

type EventRecord = {
  id: string;
  time: string;
  stream: string;
  type: string;
  summary: string;
  raw: unknown;
};

// Host data streams this inspector subscribes to, each gated by its
// `<streamId>:listen` capability (granted to this app on the Registered Apps
// page). The event types per stream depend on the host's stream payloads;
// extend these lists as the host emits more. Call events are handled via the
// typed `subscribeToCallEvents` helper below.
const STREAMS: { streamId: StreamId; eventTypes: string[] }[] = [
  { streamId: "subscriber", eventTypes: ["user", "update"] },
  { streamId: "device", eventTypes: ["device", "update"] },
  { streamId: "registration", eventTypes: ["registration", "update"] },
];
const CALL_EVENT_TYPES = [
  "call-started",
  "call-answered",
  "call-missed",
  "call-ended",
];

function summarize(streamId: string, event: any): string {
  if (event == null) return "(no payload)";
  const type = event.type;

  if (streamId === "call-events") {
    const from = event.from ?? event.caller ?? event.remoteIdentity;
    const to = event.to ?? event.callee;
    const parts = [
      type && `type=${type}`,
      event.callId && `callId=${event.callId}`,
      from && `from=${from}`,
      to && `to=${to}`,
    ].filter(Boolean);
    return parts.length
      ? parts.join(" · ")
      : JSON.stringify(event).slice(0, 120);
  }

  if (streamId === "subscriber") {
    const inner = event.data ?? event;
    const u = inner?.user;
    const dom = inner?.domain;
    const presence = inner?.["user-presence-status"];
    const parts = [
      u && `user=${u}`,
      dom && `domain=${dom}`,
      presence && `presence=${presence}`,
    ].filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }

  const inner = event.data ?? event;
  const id = inner?.id ?? inner?.user ?? inner?.aor ?? inner?.device;
  return (
    [type && `type=${type}`, id && `id=${id}`].filter(Boolean).join(" · ") ||
    JSON.stringify(inner).slice(0, 140)
  );
}

export default function EventsPage(horizonContext: HorizonContext) {
  const { PageTemplate, DatagridTemplate } = horizonContext.ui
    .templates as Record<string, AnyComp>;
  const ui = horizonContext.ui as Record<string, any>;
  const Stack: AnyComp = ui.Stack;
  const Typography: AnyComp = ui.Typography;
  const Chip: AnyComp = ui.Chip;
  const Button: AnyComp = ui.Button;
  const Alert: AnyComp = ui.Alert;
  const Icon: AnyComp = ui.Icon;

  const [events, setEvents] = useState<EventRecord[]>([]);
  const counter = useRef(0);

  // One SDK instance for the page. Passing the app's Module Federation name lets
  // the SDK derive the registry appId; the host gates and attributes every
  // subscription to this app, so an unauthorized stream simply never arrives.
  const sdk = useMemo(
    () => createRemoteAppSDK(horizonContext.eventBus, "demoAppWithAuth"),
    [horizonContext.eventBus],
  );

  useEffect(() => {
    const record = (stream: string, event: any) => {
      counter.current += 1;
      const next: EventRecord = {
        id: `evt-${counter.current}`,
        time: new Date().toLocaleTimeString(),
        stream,
        type: String(event?.type ?? ""),
        summary: summarize(stream, event),
        raw: event,
      };
      setEvents((prev) => [next, ...prev].slice(0, 200));
    };

    // Gated, app-scoped subscriptions — never raw `eventBus.on(...)`. Each
    // returns an unsubscribe; `sdk.cleanup()` would also tear them down.
    const unsubscribes = [
      sdk.subscribeToCallEvents(CALL_EVENT_TYPES, (event) =>
        record("call-events", event),
      ),
      ...STREAMS.map(({ streamId, eventTypes }) =>
        sdk.subscribeToStream(streamId, eventTypes, (event) =>
          record(streamId, event),
        ),
      ),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [sdk]);

  const callCount = useMemo(
    () => events.filter((e) => e.stream === "call-events").length,
    [events],
  );
  const subCount = useMemo(
    () => events.filter((e) => e.stream !== "call-events").length,
    [events],
  );

  const columns = [
    { field: "time", headerName: "Time", flex: 0.6, minWidth: 110 },
    {
      field: "stream",
      headerName: "Stream",
      flex: 0.7,
      minWidth: 150,
      renderCell: ({ row }: { row: EventRecord }) => (
        <Chip
          size="small"
          color={row.stream === "call-events" ? "primary" : "default"}
          label={row.stream}
        />
      ),
    },
    { field: "type", headerName: "Type", flex: 0.7, minWidth: 130 },
    { field: "summary", headerName: "Summary", flex: 1.5, minWidth: 240 },
    {
      field: "raw",
      headerName: "Raw payload",
      flex: 2,
      minWidth: 300,
      renderCell: ({ row }: { row: EventRecord }) => (
        <Typography
          variant="body2"
          component="pre"
          sx={{
            m: 0,
            fontFamily: "monospace",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
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
        { label: "Apps", url: "/apps" },
        { label: "Demo App with Auth", url: "/apps/demo-app-with-auth" },
        { label: "Events" },
      ]}
    >
      <Stack direction="column" spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Subscribes to host <strong>data streams</strong> through the gated SDK
          API —<code>sdk.subscribeToCallEvents()</code> for call events and{" "}
          <code>sdk.subscribeToStream()</code> for <code>subscriber</code>,{" "}
          <code>device</code>, and <code>registration</code>. Each stream is
          capability-gated and attributed to this app; host streams are never
          delivered on the raw <code>eventBus</code>.
        </Typography>

        {Alert && (
          <Alert
            type="info"
            title="How to generate events — and grant capabilities"
            message={
              "Call events: place or receive a test call in the host softphone (call-started → call-answered → call-ended). " +
              "Subscriber/device/registration: change presence/status, register/unregister a device, or update a user record. " +
              "A stream only delivers if this app has been granted its <streamId>:listen capability in Registered Apps — otherwise the subscription is silently ignored by the host."
            }
          />
        )}

        <CodeBlock
          ui={ui}
          code={`const sdk = createRemoteAppSDK(horizonContext.eventBus, 'demoAppWithAuth');\n\n// Call events (typed helper):\nconst stop = sdk.subscribeToCallEvents(\n  ['call-started', 'call-answered', 'call-ended'],\n  (event) => console.log('call event', event),\n);\n\n// Other host streams (capability-gated):\nconst stop2 = sdk.subscribeToStream('subscriber', ['user'], (event) =>\n  console.log('subscriber event', event),\n);\n\n// clean up on unmount: stop(); stop2();`}
        />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            color="primary"
            label={`call-events: ${callCount}`}
          />
          <Chip size="small" label={`stream events: ${subCount}`} />
          <Chip
            size="small"
            variant="outlined"
            label={`total: ${events.length}`}
          />
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
          getRowHeight={() => "auto"}
          defaultPageSize={25}
          height="auto"
          toolbar={{ enableSearch: true, toolbarPosition: "top" }}
        />

        {events.length === 0 && (
          <Stack direction="column" spacing={1} alignItems="center">
            {Icon && <Icon icon="mdi:radar" />}
            <Typography variant="body2" color="text.secondary">
              Waiting for events… place a test call to see{" "}
              <code>call-events</code> data, or trigger a
              presence/device/registration change for the subscriber streams.
            </Typography>
          </Stack>
        )}
      </Stack>
    </PageTemplate>
  );
}
