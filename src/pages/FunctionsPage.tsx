import { useState } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';
import CodeBlock from '../components/CodeBlock';

type AnyComp = React.ComponentType<any>;

export default function FunctionsPage(horizonContext: HorizonContext) {
  const { PageTemplate } = horizonContext.ui.templates as Record<string, AnyComp>;
  const ui = horizonContext.ui as Record<string, any>;
  const Stack: AnyComp = ui.Stack;
  const Paper: AnyComp = ui.Paper;
  const Typography: AnyComp = ui.Typography;
  const Button: AnyComp = ui.Button;
  const Chip: AnyComp = ui.Chip;
  const TextField: AnyComp = ui.TextField;
  const Divider: AnyComp = ui.Divider;

  const [authResult, setAuthResult] = useState<string>('(not checked yet)');
  const [translateKey, setTranslateKey] = useState('PHONE_NUMBERS');
  const [translateResult, setTranslateResult] = useState<string>('');
  const [navPath, setNavPath] = useState('/apps/demo-app-with-auth/variables');
  const [navLog, setNavLog] = useState<string[]>([]);

  const checkAuth = () => {
    try {
      const result = horizonContext.auth?.isAuthenticated?.();
      setAuthResult(String(result));
    } catch (err) {
      setAuthResult(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const runTranslate = () => {
    try {
      const fn = horizonContext.t;
      if (!fn) {
        setTranslateResult('horizonContext.t is not available');
        return;
      }
      setTranslateResult(String(fn(translateKey)));
    } catch (err) {
      setTranslateResult(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const runNavigate = () => {
    try {
      horizonContext.navigate(navPath);
      setNavLog((prev) => [
        `${new Date().toLocaleTimeString()} → navigate('${navPath}')`,
        ...prev,
      ]);
    } catch (err) {
      setNavLog((prev) => [
        `error: ${err instanceof Error ? err.message : String(err)}`,
        ...prev,
      ]);
    }
  };

  const Section = ({
    title,
    signature,
    code,
    children,
  }: {
    title: string;
    signature: string;
    code?: string;
    children: React.ReactNode;
  }) => (
    <Stack direction="column" spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6">{title}</Typography>
        <Chip size="small" label={signature} />
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {children}
      </Paper>
      {code && <CodeBlock ui={ui} code={code} />}
    </Stack>
  );

  return (
    <PageTemplate
      title="Functions"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Demo App with Auth', url: '/apps/demo-app-with-auth' },
        { label: 'Functions' },
      ]}
    >
      <Stack direction="column" spacing={4}>
        <Typography variant="body2" color="text.secondary">
          Live demos of the function members on <code>horizonContext</code>. Click a button to
          invoke and see the result.
        </Typography>

        <Section
          title="auth.isAuthenticated"
          signature="() => boolean"
          code={`const result = horizonContext.auth?.isAuthenticated?.();\n// => true | false`}
        >
          <Stack direction="column" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Returns whether the host considers the current user authenticated. Reads from the
              host's auth store at call time — not memoized.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="contained" onClick={checkAuth}>
                Run isAuthenticated()
              </Button>
              <Chip
                size="small"
                color={
                  authResult === 'true'
                    ? 'success'
                    : authResult === 'false'
                      ? 'error'
                      : 'default'
                }
                label={`result: ${authResult}`}
              />
            </Stack>
          </Stack>
        </Section>

        <Section
          title="t"
          signature="(key, options?) => string"
          code={`const t = horizonContext.t;\nconst label = t('PHONE_NUMBERS');\n// pass options for interpolation: t('key', { count: 3 })`}
        >
          <Stack direction="column" spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Host's i18next translation function. Type a translation key and run it. Common
              namespaces: <code>common.*</code>, <code>telecom.*</code>, <code>admin.*</code>,{' '}
              <code>validation.*</code>.
            </Typography>
            <TextField
              label="Translation key"
              size="small"
              value={translateKey}
              onChange={(e: any) => setTranslateKey(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="contained" onClick={runTranslate}>
                Run t()
              </Button>
              <Typography variant="body2" component="code">
                {translateResult || '(no result yet)'}
              </Typography>
            </Stack>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              Current locale: <code>{horizonContext.locale}</code>
            </Typography>
          </Stack>
        </Section>

        <Section
          title="navigate"
          signature="(path) => void"
          code={`horizonContext.navigate('/apps/demo-app-with-auth/variables');\n// uses the host's TanStack router — not window.location`}
        >
          <Stack direction="column" spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Routes the host browser to a path. Use this instead of <code>window.location</code>{' '}
              so the host's TanStack router handles the transition.
            </Typography>
            <TextField
              label="Path"
              size="small"
              value={navPath}
              onChange={(e: any) => setNavPath(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" onClick={runNavigate}>
                Run navigate()
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setNavPath('/apps/demo-app-with-auth/variables')}
              >
                Variables
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setNavPath('/apps/demo-app-with-auth/api-calls')}
              >
                API Calls
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setNavPath('/apps/demo-app-with-auth/ui-elements')}
              >
                UI Elements
              </Button>
              <Button variant="outlined" size="small" onClick={() => setNavPath('/apps')}>
                /apps
              </Button>
            </Stack>
            {navLog.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="column" spacing={0.5}>
                  {navLog.map((entry, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{ fontFamily: 'monospace', fontSize: 12 }}
                    >
                      {entry}
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Section>
      </Stack>
    </PageTemplate>
  );
}
