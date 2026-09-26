# SSTI Analysis Results: Recallly

## Executive Summary

- Dynamic server-side template evaluation sites: 0
- Vulnerabilities: 0
- Severity: None

## Evidence

The dependency manifests, lockfiles, server code, scripts, and browser source contain no EJS, Nunjucks, Handlebars, Mustache, Pug, Lodash template, or other server-side template engine. No call compiles, parses, or evaluates a variable as template source.

The HTML strings in `server/background/email-provider.ts`, `server/sources/x-live.ts`, and `server.ts` are JavaScript template literals. They are not passed to a template interpreter and therefore cannot evaluate attacker-supplied template syntax. Their output-encoding properties were separately assessed in `sast/xss-results.md`.

React JSX is compiled application code; data inserted into JSX is rendered as text and is not interpreted as a server-side template.

## Result

No vulnerabilities found.
