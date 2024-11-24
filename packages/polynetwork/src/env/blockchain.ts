export enum Blockchain {
  Neo = "neo",
  Ethereum = "eth",
  BinanceSmartChain = "bsc",
  Zilliqa = "zil",
  Arbitrum = "arbitrum",
  Polygon = "polygon",
  Okc = "okc",
  Native = "native",
  Btc = "btc",
  Carbon = "carbon",
  Switcheo = "switcheo",
  TradeHub = "tradehub",
  PolyNetwork = "polynetwork",
  Neo3 = "neo3",
  Osmosis = "osmosis",
  Ibc = "ibc",
  Terra = "terra",
  CosmosHub = "cosmoshub",
  Juno = "juno",
  Evmos = "evmos",
  Axelar = "axelar",
  Stride = "stride",
  Kujira = "kujira",
  Terra2 = "terra2",
  Quicksilver = "quicksilver",
  Comdex = "comdex",
  StafiHub = "stafi",
  Persistence = "persistence",
  Stargaze = "stargaze",
  Canto = "canto",
  OmniFlixHub = "omniflixhub",
  Agoric = "agoric",
  Sommelier = "sommelier",
  Mantle = "mantle",
  OP = 'op',
  Base = 'base',
};

export const BLOCKCHAIN_V2_TO_V1_MAPPING: SimpleMap<Blockchain> = {
  "Binance Smart Chain": Blockchain.BinanceSmartChain,
  "BSC": Blockchain.BinanceSmartChain,
  "Ethereum": Blockchain.Ethereum,
  "Arbitrum": Blockchain.Arbitrum,
  "Polygon": Blockchain.Polygon,
  "OKC": Blockchain.Okc,
  "Zilliqa": Blockchain.Zilliqa,
  "Neo": Blockchain.Neo,
  "Neo3": Blockchain.Neo3,
  "Mantle": Blockchain.Mantle,
  "OP": Blockchain.OP,
  "Base": Blockchain.Base,
};