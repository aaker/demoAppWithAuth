import { useState } from 'react';

type AnyComp = React.ComponentType<any>;

// Self-contained "show source" toggle used across the debug pages. Pass the
// host `ui` object so it renders with the same primitives as the rest of the app.
export default function CodeBlock({
  ui,
  code,
}: {
  ui: Record<string, any>;
  code: string;
}) {
  const Stack: AnyComp = ui.Stack;
  const Button: AnyComp = ui.Button;
  const Paper: AnyComp = ui.Paper;
  const Icon: AnyComp = ui.Icon;

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <Stack direction="column" spacing={1} sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          variant="text"
          onClick={() => setIsOpen((v) => !v)}
          startIcon={
            Icon ? <Icon icon={isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'} /> : undefined
          }
        >
          {isOpen ? 'Hide code' : 'Show code'}
        </Button>
        {isOpen && (
          <Button size="small" variant="text" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </Stack>
      {isOpen && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre' }}>{code}</pre>
        </Paper>
      )}
    </Stack>
  );
}
