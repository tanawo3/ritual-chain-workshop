# Privacy-Preserving AI Bounty Judge

This repository contains the implementation of a privacy-preserving Bounty Judge system using a **Commit-Reveal** scheme. This prevents participants from copying each other's submissions before the deadline.

## Architecture Note
In this implementation:
- **On-Chain**: Only the commitment hash (a keccak256 hash of the answer, salt, user address, and bounty ID) is stored on-chain during the submission phase.
- **Off-Chain / Hidden**: The plaintext answers remain completely hidden (off-chain) during the submission phase. Participants hold onto their plaintext answer and salt locally.
- **Reveal**: Once the deadline passes, participants submit their plaintext answer and salt to the contract. The contract verifies the hash on-chain, and if valid, records the submission in plaintext.
- **AI Judging**: Finally, the LLM receives the batch of all revealed (plaintext) submissions in one go to evaluate and determine the winner using Ritual's TEE-backed execution.

## Commit-Reveal Lifecycle
1. **Commit Phase**: A participant hashes their answer using a secret salt: `keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))` and submits this hash via `submitCommitment`. This phase must happen *before* the bounty deadline.
2. **Reveal Phase**: After the deadline passes, participants call `revealAnswer` providing their plaintext answer and salt. The contract verifies the hash and logs the submission.
3. **Judging Phase**: The bounty creator calls `judgeAll` to pass all revealed submissions to the AI for evaluation.
4. **Finalization Phase**: The bounty creator finalizes the winner based on the AI's review, releasing the reward to the winner.

## Test Plan
To test the Commit-Reveal implementation:
1. **Valid Reveal**: Submit a commitment before the deadline. Fast-forward the blockchain time past the deadline. Reveal the answer with the correct salt and ensure the submission is accepted.
2. **Invalid Reveal (Wrong Salt/Answer)**: Submit a commitment, fast-forward time, and attempt to reveal with an altered answer or wrong salt. Ensure the transaction reverts with "invalid reveal".
3. **Invalid Timing**: Attempt to submit a commitment *after* the deadline (should revert). Attempt to reveal *before* the deadline (should revert).

## Reflection Question
> "What should be public, what should stay hidden, and what should be decided by AI versus by a human in a bounty system?"

**Answer:**
In a fair bounty system, the existence of the bounty, its requirements, the reward amount, and the deadline should be **public** to attract participants. The submissions themselves should remain **hidden** during the active phase to prevent idea theft and encourage original work. The evaluation rubric and the final decision rationale should be public for transparency. AI is best suited to **decide** the objective baseline of submissions (e.g., scoring against a strict technical rubric or filtering spam) efficiently at scale. However, a human should ideally retain the final say or oversight on subjective nuances, creative value, or resolving disputes that an AI might misinterpret.
