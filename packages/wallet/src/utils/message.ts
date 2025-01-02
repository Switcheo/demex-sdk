import { EncodeObject } from "@cosmjs/proto-signing";

export const findMessageByTypeUrl = (messages: readonly EncodeObject[], typeUrl: string) => messages.find(msg => msg.typeUrl === typeUrl);