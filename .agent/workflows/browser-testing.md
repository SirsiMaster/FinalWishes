---
description: How to use the browser subagent for testing and verification
---

# Browser Testing Workflow

## Chrome Profile Requirement (MANDATORY)

**ALL browser subagent work MUST use the `ccollymo@alumni.chicagobooth.edu` Chrome profile.**

When launching the browser subagent, ALWAYS include this instruction in the task prompt:

```
IMPORTANT: You must use the Chrome browser profile "ccollymo@alumni.chicagobooth.edu". 
When opening the browser, ensure you are operating in this specific Chrome profile.
Use the set_browser_options tool to set the Chrome profile directory if available,
or navigate to chrome://settings/people to verify the correct profile is active.
```

## Standard Verification Steps

1. Open the target URL in the `ccollymo@alumni.chicagobooth.edu` Chrome profile
2. Take a screenshot of the rendered page
3. Check the DevTools console for errors (zero errors required per Rule 3)
4. Verify all interactive elements are functional
5. Report findings with screenshots

## Common Targets

- **Landing Page**: `https://legacy-estate-os.web.app` or `http://localhost:3000/`
- **Login**: `https://legacy-estate-os.web.app/login`
- **Dashboard**: `https://legacy-estate-os.web.app/estates/lockhart/dashboard`
