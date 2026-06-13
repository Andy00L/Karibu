// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {KaribuNotary} from "../contracts/KaribuNotary.sol";

contract KaribuNotaryTest is Test {
    KaribuNotary private notary;

    bytes32 private constant HASH_A = keccak256("document-a");
    bytes32 private constant HASH_B = keccak256("document-b");

    address private constant CLIENT_ONE = address(0xA11CE);
    address private constant CLIENT_TWO = address(0xB0B);

    // Local mirror of the contract event so expectEmit can match it.
    event Anchored(
        bytes32 indexed sha256Hash,
        address indexed anchorer,
        uint256 timestamp,
        uint256 index
    );

    function setUp() public {
        notary = new KaribuNotary();
    }

    function test_AnchorStoresRecord() public {
        notary.anchor(HASH_A);
        (address anchorer, uint256 timestamp, uint256 index) = notary.getRecord(HASH_A);
        assertEq(anchorer, address(this));
        assertEq(timestamp, block.timestamp);
        assertEq(index, 1);
    }

    function test_IsAnchoredFalseBeforeAnchor() public view {
        assertFalse(notary.isAnchored(HASH_A));
    }

    function test_IsAnchoredTrueAfterAnchor() public {
        notary.anchor(HASH_A);
        assertTrue(notary.isAnchored(HASH_A));
    }

    function test_AnchorReturnsSequentialIndex() public {
        uint256 indexOne = notary.anchor(HASH_A);
        uint256 indexTwo = notary.anchor(HASH_B);
        assertEq(indexOne, 1);
        assertEq(indexTwo, 2);
    }

    function test_AnchorCountIncrements() public {
        assertEq(notary.anchorCount(), 0);
        notary.anchor(HASH_A);
        assertEq(notary.anchorCount(), 1);
        notary.anchor(HASH_B);
        assertEq(notary.anchorCount(), 2);
    }

    function test_AnchorEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit Anchored(HASH_A, address(this), block.timestamp, 1);
        notary.anchor(HASH_A);
    }

    function test_RevertOnZeroHash() public {
        vm.expectRevert(KaribuNotary.InvalidHash.selector);
        notary.anchor(bytes32(0));
    }

    function test_RevertOnDuplicateAnchor() public {
        notary.anchor(HASH_A);
        vm.expectRevert(abi.encodeWithSelector(KaribuNotary.AlreadyAnchored.selector, HASH_A));
        notary.anchor(HASH_A);
    }

    function test_DuplicateDoesNotChangeCount() public {
        notary.anchor(HASH_A);
        vm.expectRevert(abi.encodeWithSelector(KaribuNotary.AlreadyAnchored.selector, HASH_A));
        notary.anchor(HASH_A);
        assertEq(notary.anchorCount(), 1);
    }

    function test_GetRecordRevertsWhenAbsent() public {
        vm.expectRevert(abi.encodeWithSelector(KaribuNotary.NotAnchored.selector, HASH_A));
        notary.getRecord(HASH_A);
    }

    function test_AnchorerIsMsgSender() public {
        vm.prank(CLIENT_ONE);
        notary.anchor(HASH_A);
        (address anchorer,,) = notary.getRecord(HASH_A);
        assertEq(anchorer, CLIENT_ONE);
    }

    function test_TimestampIsBlockTimestamp() public {
        uint256 futureTimestamp = block.timestamp + 3600;
        vm.warp(futureTimestamp);
        notary.anchor(HASH_A);
        (, uint256 timestamp,) = notary.getRecord(HASH_A);
        assertEq(timestamp, futureTimestamp);
    }

    function test_DifferentHashesIndependent() public {
        vm.prank(CLIENT_ONE);
        notary.anchor(HASH_A);
        vm.prank(CLIENT_TWO);
        notary.anchor(HASH_B);
        (address anchorerA,, uint256 indexA) = notary.getRecord(HASH_A);
        (address anchorerB,, uint256 indexB) = notary.getRecord(HASH_B);
        assertEq(anchorerA, CLIENT_ONE);
        assertEq(anchorerB, CLIENT_TWO);
        assertEq(indexA, 1);
        assertEq(indexB, 2);
    }

    function test_SequentialIndexAcrossAnchorers() public {
        vm.prank(CLIENT_ONE);
        notary.anchor(HASH_A);
        vm.prank(CLIENT_TWO);
        uint256 secondIndex = notary.anchor(HASH_B);
        assertEq(secondIndex, 2);
    }

    function testFuzz_AnchorArbitraryNonZeroHash(bytes32 candidateHash) public {
        vm.assume(candidateHash != bytes32(0));
        notary.anchor(candidateHash);
        assertTrue(notary.isAnchored(candidateHash));
        (address anchorer,, uint256 index) = notary.getRecord(candidateHash);
        assertEq(anchorer, address(this));
        assertEq(index, 1);
    }

    function testFuzz_DuplicateAlwaysReverts(bytes32 candidateHash) public {
        vm.assume(candidateHash != bytes32(0));
        notary.anchor(candidateHash);
        vm.expectRevert(abi.encodeWithSelector(KaribuNotary.AlreadyAnchored.selector, candidateHash));
        notary.anchor(candidateHash);
    }

    function testFuzz_ZeroHashAlwaysReverts(uint256 callerSeed) public {
        vm.prank(address(uint160(bound(callerSeed, 1, type(uint160).max))));
        vm.expectRevert(KaribuNotary.InvalidHash.selector);
        notary.anchor(bytes32(0));
    }
}
