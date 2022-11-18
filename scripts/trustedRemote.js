const hre = require("hardhat");

function main() {
    // remote address, local address
    let trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], ["0x22f5b5B3dDc2De9fc039A96049bd221dfdDA487B", "0x6d74F2108c7f2074F307040923238F046537990B"])
    console.log(trustedRemote)
}

main()