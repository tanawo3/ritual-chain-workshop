import { describe, it } from "node:test";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, encodePacked, stringToBytes, toHex } from "viem";

describe("AIJudge Commit-Reveal", function () {
  it("Should allow commit and reveal", async function () {
    const publicClient = await hre.viem.getPublicClient();
    const [owner, user1] = await hre.viem.getWalletClients();

    const aiJudge = await hre.viem.deployContract("AIJudge", []);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const reward = 100n;

    // Must send some value for the reward
    await aiJudge.write.createBounty(["Test Bounty", "Test Rubric", deadline], {
      value: reward,
    });

    const bountyId = 1n;

    const answer = "My secret answer";
    // Create a 32-byte salt
    const salt = toHex(stringToBytes("salt123"), { size: 32 });

    const expectedHash = keccak256(
      encodePacked(
        ["string", "bytes32", "address", "uint256"],
        [answer, salt, user1.account.address, bountyId]
      )
    );

    const aiJudgeAsUser1 = await hre.viem.getContractAt(
      "AIJudge",
      aiJudge.address,
      { client: { wallet: user1 } }
    );

    await aiJudgeAsUser1.write.submitCommitment([bountyId, expectedHash]);

    // Fast forward time to pass deadline
    await hre.network.provider.send("evm_increaseTime", [3601]);
    await hre.network.provider.send("evm_mine");

    await aiJudgeAsUser1.write.revealAnswer([bountyId, answer, salt]);

    const submission = await aiJudge.read.getSubmission([bountyId, 0n]);
    expect(submission[0].toLowerCase()).to.equal(user1.account.address.toLowerCase());
    expect(submission[1]).to.equal(answer);
  });
});
