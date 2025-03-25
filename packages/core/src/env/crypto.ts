export const BIP44_PURPOSE = 44;
export const NEO_COIN_TYPE = 0x00000378;
export const ETH_COIN_TYPE = 0x0000003c;

export const SWTH_COIN_TYPE = 118;

export const DenomPrefix = {
  LPToken: "clpt",
  CDPToken: "cibt",
};

export const regexCdpDenom = RegExp(`^${DenomPrefix.CDPToken}/`, "i");
export const regexLPDenom = RegExp(`^${DenomPrefix.LPToken}/(\\d+)$`, "i");
export const ibcTokenRegex = /^ibc\/([a-f\d]+)$/i;