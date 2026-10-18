// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title Verity Root Registry
/// @notice Minimal append-only registry for ZK/RWA commitment roots.
contract RootRegistry {
    struct Anchor {
        address attester;
        uint256 timestamp;
        string schemaId;
    }

    mapping(bytes32 => Anchor) public anchors;

    event RootAnchored(
        bytes32 indexed root,
        address indexed attester,
        string schemaId,
        uint256 timestamp
    );

    function anchorRoot(bytes32 root, string calldata schemaId) external {
        require(root != bytes32(0), "Root required");
        require(bytes(schemaId).length > 0, "Schema required");
        require(anchors[root].timestamp == 0, "Root already anchored");

        anchors[root] = Anchor({
            attester: msg.sender,
            timestamp: block.timestamp,
            schemaId: schemaId
        });

        emit RootAnchored(root, msg.sender, schemaId, block.timestamp);
    }

    function isAnchored(bytes32 root) external view returns (bool) {
        return anchors[root].timestamp != 0;
    }
}
