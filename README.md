# SpendOS

A programmable treasury system for managing company crypto spending with on-chain policies and cross-chain USDC transfers.

## What does it do?

SpendOS lets you manage crypto treasuries with budget rules baked into smart contracts. Create spend accounts with monthly budgets and spending limits, let team members request funds, and have the system automatically approve small requests or route larger ones to managers. Everything is tracked on-chain while Circle Gateway handles moving USDC across different blockchains.

## How it works

1. Admin creates spend accounts with budgets (e.g., "Marketing gets 2000 USDC/month, auto-approve under 200 USDC")
2. Team members request funds through the web app
3. Small requests auto-approve, larger ones wait for manager review
4. Once approved, the backend burns USDC on Arc and mints it on the destination chain via Circle Gateway
5. Funds arrive in ~11 seconds

## Project structure

The monorepo has three parts:

### SpendOSContracts

Solidity contracts built with Foundry. The Treasury contract handles all the spending logic - budgets, limits, approvals, reservations. Deploy to Arc testnet and it tracks who can spend what, when, and where.

[See contracts README →](SpendOSContracts/README.md)

### SpendOSBackend

NestJS backend that watches blockchain events and orchestrates Circle Gateway transfers. When a spend gets approved on-chain, this picks it up, handles the cross-chain USDC transfer, and marks it complete. Also manages auto-deposits to Gateway and provides analytics.

[See backend README →](SpendOSBackend/README.md)

### spend-os-frontend

Next.js app with wallet auth (SIWE), dashboard for admins/managers/spenders, and real-time updates. Connect your wallet, check your spending account balance, submit requests, approve them if you're a manager.

[See frontend README →](spend-os-frontend/README.md)

## Quick start

Each folder has its own setup instructions, but here's the rough order:

1. **Deploy contracts** - Follow SpendOSContracts README to deploy Treasury contract to Arc testnet
2. **Start backend** - Set up Postgres/Redis, configure .env with contract address and wallet keys, run migrations
3. **Run frontend** - Point it at the backend API and deployed contract address

Check each subfolder's README for the details.

## Tech stack

- **Blockchain**: Solidity, Foundry, ethers.js on Arc testnet
- **Backend**: NestJS, TypeScript, PostgreSQL, Redis, Bull queues
- **Frontend**: Next.js 16, wagmi, RainbowKit, shadcn/ui
- **Cross-chain**: Circle Gateway

## Why Arc + Circle Gateway?

Arc testnet is the main chain where the Treasury contract lives. Circle Gateway maintains a unified USDC balance across chains, so you can request funds to Base, Ethereum, Avalanche, etc. without thinking about bridging. The system handles it.
