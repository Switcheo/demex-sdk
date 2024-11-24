import Transport from "@ledgerhq/hw-transport";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

async function getDevicePaths(ledgerLibrary: typeof TransportWebHID): Promise<ReadonlyArray<HIDDevice>> {
  const supported = await ledgerLibrary.isSupported();
  if (!supported) {
    throw new Error("Your computer does not support the ledger!");
  }
  return await ledgerLibrary.list();
}

async function getWebHIDTransport(): Promise<Transport> {
  try {
    return await TransportWebHID.create();
  } catch (error) {
    if ((error as Error).message !== "The device is already open.") throw error;

    const devices = await getDevicePaths(TransportWebHID);
    const transport = new TransportWebHID(devices[0]);
    return transport as Transport;
  }
}

export async function getLedgerTransport(): Promise<Transport> {
  return getWebHIDTransport();
}