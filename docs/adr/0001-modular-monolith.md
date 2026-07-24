# ADR 0001: Use a modular monolith

## Status

Accepted.

## Decision

Ship one Next.js application with feature-level boundaries. Introduce separate
packages or services only after a measured deployment, ownership, scaling, or
reuse requirement appears.

## Consequences

The system has one deployment and transaction boundary while retaining clear
module ownership. CI import rules and public module APIs must prevent accidental
cross-feature coupling.
