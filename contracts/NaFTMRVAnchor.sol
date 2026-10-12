// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NaFTMRVAnchor
/// @notice Minimal provenance witness for versioned NaFT MRV packages.
/// @dev This contract does not certify climate impact, issue carbon credits, or interpret methodologies.
contract NaFTMRVAnchor {
    struct Anchor {
        bytes32 claimIdHash;
        bytes32 packageHash;
        bytes32 methodologyHash;
        bytes32 previousPackageHash;
        address submitter;
        uint64 anchoredAt;
    }

    address public anchorWriter;

    mapping(bytes32 => Anchor) public anchorsByPackage;
    mapping(bytes32 => bytes32) public headByClaim;

    error ZeroHash();
    error UnauthorizedWriter(address caller);
    error PackageAlreadyAnchored(bytes32 packageHash);
    error PreviousPackageMissing(bytes32 previousPackageHash);
    error PreviousClaimMismatch(bytes32 expectedClaim, bytes32 previousClaim);
    error LineageHeadMismatch(bytes32 expectedHead, bytes32 providedPrevious);

    event MRVPackageAnchored(
        bytes32 indexed claimIdHash,
        bytes32 indexed packageHash,
        bytes32 indexed previousPackageHash,
        bytes32 methodologyHash,
        address submitter,
        uint64 anchoredAt
    );

    constructor() {
        anchorWriter = msg.sender;
    }

    function anchorPackage(
        bytes32 claimIdHash,
        bytes32 packageHash,
        bytes32 methodologyHash,
        bytes32 previousPackageHash
    ) external {
        if (msg.sender != anchorWriter) {
            revert UnauthorizedWriter(msg.sender);
        }
        if (claimIdHash == bytes32(0) || packageHash == bytes32(0) || methodologyHash == bytes32(0)) {
            revert ZeroHash();
        }
        if (anchorsByPackage[packageHash].packageHash != bytes32(0)) {
            revert PackageAlreadyAnchored(packageHash);
        }

        bytes32 currentHead = headByClaim[claimIdHash];

        if (previousPackageHash == bytes32(0)) {
            if (currentHead != bytes32(0)) {
                revert LineageHeadMismatch(currentHead, previousPackageHash);
            }
        } else {
            Anchor memory previous = anchorsByPackage[previousPackageHash];
            if (previous.packageHash == bytes32(0)) {
                revert PreviousPackageMissing(previousPackageHash);
            }
            if (previous.claimIdHash != claimIdHash) {
                revert PreviousClaimMismatch(claimIdHash, previous.claimIdHash);
            }
            if (currentHead != previousPackageHash) {
                revert LineageHeadMismatch(currentHead, previousPackageHash);
            }
        }

        uint64 anchoredAt = uint64(block.timestamp);
        anchorsByPackage[packageHash] = Anchor({
            claimIdHash: claimIdHash,
            packageHash: packageHash,
            methodologyHash: methodologyHash,
            previousPackageHash: previousPackageHash,
            submitter: msg.sender,
            anchoredAt: anchoredAt
        });
        headByClaim[claimIdHash] = packageHash;

        emit MRVPackageAnchored(
            claimIdHash,
            packageHash,
            previousPackageHash,
            methodologyHash,
            msg.sender,
            anchoredAt
        );
    }

    function verifyCurrentHead(bytes32 claimIdHash, bytes32 packageHash) external view returns (bool) {
        return packageHash != bytes32(0) && headByClaim[claimIdHash] == packageHash;
    }
}
