
/// Tests will auto-switch networks as needed. Remember to set .env RPC points.

module.exports = {
    "COMPOUND_ETH_COMPOUND": {
        "Comptroller": "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
        "cUSDC": "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "cDAI": "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
        "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "COMP": "0xc00e94Cb662C3520282E6f5717214004A7f26888"
    },
    "VENUS_BSC_COMPOUND": {
        "VenusLens": "0x595e9DDfEbd47B54b996c839Ef3Dd97db3ED19bA",
        "WhitepaperInterestRateModel": "0x49fADE95f94e5EC7C1f4AE13a6d6f9ca18B2F430",
        "Comptroller": "0xf6C14D4DFE45C132822Ce28c646753C54994E59C",
        "Unitroller": "0xfD36E2c2a6789Db23113685031d7F16329158384",
        "VaiUnitroller": "0x004065D34C6b18cE4370ced1CeBDE94865DbFAFE",
        "VaiController": "0x793ff22b882665CA492843962aD945cAf5440F3c",
        "vBep20Delegate": "0xf9f48874050264664bf3d383C7289a0a5BD98896",
        "SXP": "0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A",
        "VAI": "0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7",
        "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "USDT": "0x55d398326f99059fF775485246999027B3197955",
        "BUSD": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
        "XVS": "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
        "BTCB": "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
        "ETH": "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
        "LTC": "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94",
        "XRP": "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",
        "vUSDC": "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8",
        "vUSDT": "0xfD5840Cd36d94D7229439859C0112a4185BC0255",
        "vBUSD": "0x95c78222B3D6e262426483D42CfA53685A67Ab9D",
        "vSXP": "0x2fF3d0F6990a40261c66E1ff2017aCBc282EB6d0",
        "vBNB": "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
        "vXVS": "0x151B1e2635A717bcDc836ECd6FbB62B674FE3E1D",
        "vBTC": "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B",
        "vETH": "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        "vLTC": "0x57A5297F2cB2c0AaC9D554660acd6D385Ab50c6B",
        "vXRP": "0xB248a295732e0225acd3337607cc01068e3b9c10",
        "Timelock": "0x939bD8d64c0A9583A7Dcea9933f7b21697ab6396",
        "GovernorAlpha": "0x406f48f47D25E9caa29f17e7Cfbd1dc6878F078f",
        "VenusPriceOracle": "0x516c18DC440f107f12619a6d2cc320622807d0eE"
    },
    "GEIST_FANTOM_AAVE": {
        "UniswapRouter": "0xf491e7b69e4244ad4002bc14e878a34207e38c29",
        "GeistToken": "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
        "FtmToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "aaveMining": "0x49c93a95dbcc9A6A4D8f77E59c038ce5020e82f8", /// MultiFeeDistribution
        "lendingPool": "0x9FAD24f572045c7869117160A571B2e50b10d068", /// One address for all lending
        "gUSDC": { // 6 decimal
            "asset": "0x04068da6c83afcfa0e13ba15a6696662335d5b75", /// underlying of gToken, ie. USDC
            "aToken": "0xe578C856933D8e1082740bf7661e379Aa2A30b26", /// gUSDC or gDAI, gFTM etc.
            "swapToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83", // specify token to swap rewards to (FTM in all cases here)
            "swapPair1": "0x668ae94d0870230ac007a01b471d02b2c94ddcb9", /// GEIST-FTM Pool (needs two swaps)
            "swapPair2": "0x2b4c76d0dc16be1c31d4c1dc53bf9b45987fc75c", /// FTM-USDC Pool
        },
        "gDAI": { // 18 decimal
            "asset": "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
            "aToken": "0x07e6332dd090d287d3489245038daf987955dcfb",
            "swapToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
            "swapPair1": "0x668ae94d0870230ac007a01b471d02b2c94ddcb9", /// GEIST-FTM Pool
            "swapPair2": "0xe120ffbda0d14f3bb6d6053e90e63c572a66a428", /// FTM-DAI Pool 
        },
        "gUSDT": { // 6 decimal
            "asset": "0x049d68029688eabf473097a2fc38ef61633a3c7a",
            "aToken": "0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5",
            "swapToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
            "swapPair1": "0x668ae94d0870230ac007a01b471d02b2c94ddcb9", /// GEIST-FTM Pool
            "swapPair2": "0x5965e53aa80a0bcf1cd6dbdd72e6a9b2aa047410", /// FTM-fUSDT Pool
        },
        "gMIM": { // 18 decimal
            "asset": "0x82f0B8B456c1A451378467398982d4834b6829c1",
            "aToken": "0xc664fc7b8487a3e10824cda768c1d239f2403bbe",
            "swapToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
            "swapPair1": "0x668ae94d0870230ac007a01b471d02b2c94ddcb9", /// GEIST-FTM Pool
            "swapPair2": "0x6f86e65b255c9111109d2d2325ca2dfc82456efc", /// FTM-MIM Pool
        },
    }
}
