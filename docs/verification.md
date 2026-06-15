# Self Agent ID verification: attempt log

The hackathon's Verification judging criterion asks for the agent to be verified
with Self Agent ID, and explicitly allows a screenshot fallback when Self cannot
complete: "If Self is unavailable in your region, attach a screenshot of the Self
app message indicating your country is unsupported."

Karibu ran the Self Agent ID flow on Celo mainnet (production endpoint, scope
self-agent-id) repeatedly. Every attempt failed on the Self side with the same
technical error. This is not a region block and not a user error: the Self app
reports the agent ID as Connected, and the failure happens in Self's proof step.

## Error returned by the Self app (verbatim)

> Proof Failed. Unable to prove your identity to Self Agent ID due to a technical
> issue. Please try again.

## Attempts, from the Self app history (every one FAIL)

- 02:47 (today)
- 14:37
- 14:29
- 14:42
- 14:41
- 14:40
- 14:40

Seven attempts, identical "technical issue" failure across two days.

## Evidence (screenshots)

- docs/verification/self-proof-failed.png: the "Proof Failed" screen with the
  verbatim error.
- docs/verification/self-attempts-history.png: the Self app history showing the
  repeated FAIL entries.

## Independent verification that did succeed

Karibu's agent identity is verified on 8004scan via ERC-8004 endpoint
verification (is_endpoint_verified = true): the served
/.well-known/agent-registration.json matches the on-chain registration for
agentId 9373 at the Celo Identity Registry (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432).
That is domain and identity verification, distinct from Self's human-personhood
proof, but it is real, independent evidence that the agent is who it claims to be,
checkable at https://8004scan.io/agents/celo/9373.
