const hre = require("hardhat");

async function main() {
    let adapterParams = hre.ethers.utils.solidityPack(
        ['uint16', 'uint256'], [1, 5000000]
    )
    console.log(adapterParams) // 0x000100000000000000000000000000000000000000000000000000000000004c4b40
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});