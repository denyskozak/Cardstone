# Metacards Sui contracts

This package contains Sui Move modules that back the blockchain-facing parts of Metacards:

- `metacards_coin.move` creates a project-branded coin with mint and burn entry points.
- `investment_capsule.move` defines a time-locked escrow that can hold any coin type until a specified release time.
- `card_factory.move` stores card metadata on-chain using the same fields as the in-game definitions.

## Modules

### metacards_coin
- `init` creates the `MetacardsCoin` currency, publishing the metadata and treasury cap to the initializer.
- `mint` mints additional supply to the caller using the stored `TreasuryCap`.
- `burn` reduces supply by destroying coins with the treasury capability.

### investment_capsule
- `create` builds a new capsule that owns a deposited coin balance and tracks a release timestamp in milliseconds.
- `deposit` lets the owner add more funds to the capsule before it unlocks.
- `withdraw` releases the full balance to the beneficiary after the deadline using the on-chain `Clock` for time checks.

### card_factory
- `mint` creates an on-chain `Card` object with fields aligned to the shared card definitions used by the app (IDs, name, type, cost, rarity, tribe, text, and optional stats such as attack/health/durability).
