// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title KaribuNotary
/// @notice Anchors a sha256 content hash on Celo as a tamper-evident receipt.
///         Each distinct hash is anchored once; the first anchor records the
///         anchorer, the block timestamp, and a global sequence index. The
///         notary service (SVC-4) gates payment through x402 before it calls
///         anchor(); the contract itself is permissionless, so any caller can
///         create a receipt and any reader can verify one. No function makes an
///         external call or transfers value, so there is no reentrancy vector
///         and no owner or admin to compromise.
///         sourceRef: KARIBU_BUILD_PLAN.md sections 2.1 (SVC-4) and 6.
contract KaribuNotary {
    /// @notice One notarization receipt.
    /// @dev A non-zero timestamp is the presence sentinel. block.timestamp is
    ///      never zero on a live chain, so absence and presence never collide.
    struct Record {
        address anchorer;
        uint256 timestamp;
        uint256 index;
    }

    /// @dev Maps a content hash to its first and only record.
    mapping(bytes32 => Record) private records;

    /// @notice Total number of distinct hashes anchored so far.
    uint256 public anchorCount;

    /// @notice Emitted once per successful anchor. Drives the dashboard feed.
    /// @param sha256Hash the anchored content hash
    /// @param anchorer the caller that anchored it
    /// @param timestamp the block timestamp recorded, in seconds
    /// @param index the 1-based global sequence number of this anchor
    event Anchored(
        bytes32 indexed sha256Hash,
        address indexed anchorer,
        uint256 timestamp,
        uint256 index
    );

    /// @notice Thrown when the supplied hash is the zero value (no content).
    error InvalidHash();
    /// @notice Thrown when the hash was already anchored.
    error AlreadyAnchored(bytes32 sha256Hash);
    /// @notice Thrown when reading a hash that was never anchored.
    error NotAnchored(bytes32 sha256Hash);

    /// @notice Anchor a sha256 hash. Reverts on the zero hash or a duplicate.
    /// @param sha256Hash the 32-byte sha256 of the content to notarize
    /// @return index the 1-based global sequence number assigned to this anchor
    function anchor(bytes32 sha256Hash) external returns (uint256 index) {
        if (sha256Hash == bytes32(0)) {
            revert InvalidHash();
        }
        if (records[sha256Hash].timestamp != 0) {
            revert AlreadyAnchored(sha256Hash);
        }

        uint256 nextCount = anchorCount + 1;
        anchorCount = nextCount;
        records[sha256Hash] =
            Record({anchorer: msg.sender, timestamp: block.timestamp, index: nextCount});

        emit Anchored(sha256Hash, msg.sender, block.timestamp, nextCount);
        return nextCount;
    }

    /// @notice Whether a hash has been anchored.
    function isAnchored(bytes32 sha256Hash) external view returns (bool) {
        return records[sha256Hash].timestamp != 0;
    }

    /// @notice Read a hash's receipt. Reverts with NotAnchored if the hash was
    ///         never anchored, so callers get a distinct, actionable error
    ///         rather than ambiguous zero values.
    function getRecord(bytes32 sha256Hash)
        external
        view
        returns (address anchorer, uint256 timestamp, uint256 index)
    {
        Record memory record = records[sha256Hash];
        if (record.timestamp == 0) {
            revert NotAnchored(sha256Hash);
        }
        return (record.anchorer, record.timestamp, record.index);
    }
}
