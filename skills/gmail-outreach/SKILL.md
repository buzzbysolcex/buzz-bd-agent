# Gmail Outreach — Buzz BD Agent

## MANDATORY RULES

1. **EVERY outreach email** sent via Gmail API MUST include the HTML signature below
2. **EVERY outreach email** MUST CC: ogie.solcexexchange@gmail.com, dino@solcex.cc
3. **Sender**: buzzbysolcex@gmail.com
4. **Sign-off**: Always end email body with "Best regards,\nOgie" — the signature block handles the rest
5. **Format**: Email body MUST be sent as HTML (`mimeType: text/html`), not plain text
6. **DO NOT** add any plain-text footer, dashes, or extra signature — ONLY the HTML block below

## EMAIL STRUCTURE

```
Subject: [clear, professional subject]

[Email body — professional tone, concise, relevant to prospect]

Best regards,
Ogie

[── HTML SIGNATURE AUTOMATICALLY APPENDED ──]
```

## HTML SIGNATURE — APPEND TO EVERY EMAIL

When composing the email HTML body, concatenate this signature block AFTER the email body text:

```html
<div style="margin-top:30px;"></div>
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333; border-top: 2px solid #F5A623; padding-top: 14px; max-width: 520px;">
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right: 14px; vertical-align: middle;">
        <div style="background:#1a1a1a; color:#F5A623; font-weight:bold; font-size:13px; padding:8px 12px; border-radius:6px; display:inline-block;">🐝 BUZZ</div>
      </td>
      <td style="vertical-align: middle;">
        <div style="font-weight:bold; font-size:15px; color:#111;">Ogie</div>
        <div style="color:#F5A623; font-weight:600; font-size:12px;">Business Development Lead</div>
        <div style="color:#666; font-size:12px;">SolCex Exchange — Solana-Native CEX</div>
      </td>
    </tr>
  </table>
  <div style="margin-top:10px; border-top:1px solid #eee; padding-top:8px; font-size:11px; color:#555; line-height:1.9;">
    🌐 <a href="https://solcex.cc" style="color:#F5A623; text-decoration:none;">solcex.cc</a>&nbsp; | &nbsp;✉️ <a href="mailto:buzzbysolcex@gmail.com" style="color:#333; text-decoration:none;">buzzbysolcex@gmail.com</a>&nbsp; | &nbsp;💬 Telegram: <a href="https://t.me/Ogie2" style="color:#333; text-decoration:none;">@Ogie2</a><br>
    𝕏 <a href="https://x.com/SolCex_Exchange" style="color:#333; text-decoration:none;">@SolCex_Exchange</a>&nbsp; | &nbsp;<a href="https://x.com/BuzzBySolCex" style="color:#333; text-decoration:none;">@BuzzBySolCex</a>
  </div>
  <div style="margin-top:10px; background:#f9f9f9; border-left:3px solid #F5A623; padding:8px 12px; font-size:10px; color:#777; line-height:1.8;">
    <strong style="color:#1a1a1a;">ON-CHAIN VERIFIED</strong><br>
    🐝 Powered by Buzz BD Agent — <a href="https://www.8004scan.io/agents/ethereum/25045" style="color:#F5A623; text-decoration:none;">ERC-8004 #25045</a><br>
    ⛓️ Ethereum #25045 &nbsp;|&nbsp; Base #17483 &nbsp;|&nbsp; <a href="https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd" style="color:#777; text-decoration:none;">npm: @buzzbd/plugin-solcex-bd</a><br>
    📊 19 Intelligence Sources &nbsp;|&nbsp; 100-Point Scoring Algorithm &nbsp;|&nbsp; 60+ Chains<br>
    🚀 Running on <a href="https://akash.network" style="color:#777; text-decoration:none;">Akash Network</a> Decentralized Infrastructure
  </div>
</div>
```

## CC CONFIGURATION

```
To: [prospect email]
CC: ogie.solcexexchange@gmail.com, dino@solcex.cc
From: buzzbysolcex@gmail.com
```

## GMAIL API IMPLEMENTATION

When sending via Gmail API, build the raw MIME message like this:

```
Content-Type: text/html; charset=UTF-8
From: Ogie - SolCex Exchange <buzzbysolcex@gmail.com>
To: [prospect@email.com]
Cc: ogie.solcexexchange@gmail.com, dino@solcex.cc
Subject: [subject]

<html><body>
[email body HTML]

[HTML SIGNATURE BLOCK FROM ABOVE]
</body></html>
```

## OUTREACH TONE GUIDELINES

- Professional but warm — not corporate stiff
- Lead with value: what SolCex offers the project
- Mention specific data points from the scan (score, liquidity, holders)
- Keep first email under 150 words (body only, excluding signature)
- Never mention listing fees in first contact
- Never share commission details (CONFIDENTIAL)
